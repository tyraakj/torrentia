package broker

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// Server encapsulates the HTTP router and services for the Upload Broker.
type Server struct {
	cfg             *Config
	pinner          IPFSClient
	nonces          NonceStore
	domainSeparator []byte
	startTime       time.Time
	logger          *slog.Logger
}

// UploadManifestRequest is the wire format for POST /v1/uploads/manifest.
type UploadManifestRequest struct {
	Intent    UploadIntent    `json:"intent"`
	Signature string          `json:"signature"`
	Manifest  json.RawMessage `json:"manifest"`
}

// UploadManifestResponse is the wire format returned on successful manifest pinning.
type UploadManifestResponse struct {
	CID        string `json:"cid"`
	URI        string `json:"uri"`
	ModelID    string `json:"modelId"`
	TotalSize  uint64 `json:"totalSize"`
	ChunkCount uint32 `json:"chunkCount"`
}

// ErrorResponse represents a standardized JSON error response.
type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}

// NewServer creates a new Server instance.
func NewServer(cfg *Config, pinner IPFSClient, nonces NonceStore, logger *slog.Logger) *Server {
	if logger == nil {
		logger = slog.Default()
	}
	domainSep := ComputeDomainSeparator("Torrentia Upload Broker", "1", cfg.ChainID)

	return &Server{
		cfg:             cfg,
		pinner:          pinner,
		nonces:          nonces,
		domainSeparator: domainSep,
		startTime:       time.Now(),
		logger:          logger,
	}
}

// Routes initializes and returns the http.Handler for the broker service.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/v1/uploads/manifest", s.handleUploadManifest)

	return s.corsMiddleware(mux)
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := false

		for _, o := range s.cfg.AllowedOrigins {
			if o == "*" || strings.EqualFold(o, origin) {
				allowed = true
				break
			}
		}

		if allowed {
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			w.Header().Set("Access-Control-Max-Age", "86400")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		s.logger.Error("failed to encode response", "error", err)
	}
}

func (s *Server) writeError(w http.ResponseWriter, status int, errMsg string, details string) {
	s.writeJSON(w, status, ErrorResponse{
		Error:   errMsg,
		Details: details,
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.writeError(w, http.StatusMethodNotAllowed, "method not allowed", "")
		return
	}

	uptimeSeconds := int64(time.Since(s.startTime).Seconds())
	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":          "ok",
		"service":         "torrentia-upload-broker",
		"uptime_seconds":  uptimeSeconds,
		"ipfs_configured": s.cfg.PinataJWT != "",
		"chain_id":        s.cfg.ChainID,
	})
}

func (s *Server) handleUploadManifest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.writeError(w, http.StatusMethodNotAllowed, "method not allowed", "")
		return
	}

	// 1. Enforce payload size limit (max manifest MB + 1 MB metadata buffer)
	maxBytes := (s.cfg.MaxManifestMB + 1) * 1024 * 1024
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "failed to read request body", err.Error())
		return
	}

	var req UploadManifestRequest
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request json", err.Error())
		return
	}

	// 2. Signature presence check (returns 401 if missing)
	cleanSig := strings.TrimSpace(req.Signature)
	if cleanSig == "" {
		s.writeError(w, http.StatusUnauthorized, "missing signature", "EIP-712 signature is required")
		return
	}

	// 3. EIP-712 Signature verification
	recoveredAddr, err := VerifyUploadIntent(req.Intent, cleanSig, s.domainSeparator)
	if err != nil {
		// Specific error mapping per spec: expired deadline -> 400, signature error -> 401
		if strings.Contains(err.Error(), "expired") {
			s.writeError(w, http.StatusBadRequest, "upload intent expired", err.Error())
			return
		}
		s.writeError(w, http.StatusUnauthorized, "cryptographic verification failed", err.Error())
		return
	}

	// 4. Replay protection: nonce consumption (returns 409 Conflict if replayed)
	nonceStr := "0"
	if req.Intent.Nonce != nil {
		nonceStr = req.Intent.Nonce.String()
	}
	if err := s.nonces.ConsumeNonce(recoveredAddr.Hex(), nonceStr, s.cfg.NonceTTL); err != nil {
		if errors.Is(err, ErrNonceReused) {
			s.writeError(w, http.StatusConflict, "nonce already consumed", "This intent nonce was previously used. Generate a fresh nonce.")
			return
		}
		s.writeError(w, http.StatusInternalServerError, "failed to process nonce", err.Error())
		return
	}

	// 5. Parse and validate ChunkManifest JSON against Intent
	if len(req.Manifest) == 0 {
		s.writeError(w, http.StatusBadRequest, "missing manifest", "manifest object is required")
		return
	}

	var manifest ChunkManifest
	if err := json.Unmarshal(req.Manifest, &manifest); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid manifest json structure", err.Error())
		return
	}

	if err := ValidateManifest(req.Manifest, manifest, req.Intent, s.cfg.MaxManifestMB*1024*1024); err != nil {
		s.writeError(w, http.StatusBadRequest, "manifest validation failed", err.Error())
		return
	}

	// 6. Pin manifest to IPFS via configured pinner
	manifestName := fmt.Sprintf("%s-manifest.json", manifest.ModelID)
	if manifest.ModelName != "" {
		manifestName = fmt.Sprintf("%s-manifest.json", manifest.ModelName)
	}

	cid, err := s.pinner.PinJSON(r.Context(), manifestName, req.Manifest)
	if err != nil {
		s.logger.Error("IPFS pinning failed", "error", err, "modelId", req.Intent.ModelID)
		s.writeError(w, http.StatusBadGateway, "ipfs pinning failed", err.Error())
		return
	}

	s.logger.Info("manifest pinned successfully",
		"cid", cid,
		"modelId", req.Intent.ModelID,
		"creator", recoveredAddr.Hex(),
		"chunks", req.Intent.ChunkCount,
		"totalSize", req.Intent.TotalSize,
	)

	// 7. Return canonical IPFS response
	s.writeJSON(w, http.StatusOK, UploadManifestResponse{
		CID:        cid,
		URI:        fmt.Sprintf("ipfs://%s", cid),
		ModelID:    req.Intent.ModelID,
		TotalSize:  req.Intent.TotalSize,
		ChunkCount: req.Intent.ChunkCount,
	})
}
