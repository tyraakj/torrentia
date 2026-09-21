package seeder

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// HTTPServer exposes the authenticated HTTP chunk delivery endpoint with 402 challenge flow.
type HTTPServer struct {
	port            int
	store           *Store
	verifier        *PaymentVerifier
	defaultPrice    *big.Int
	seederAddress   string
	contractAddress string
	chainID         int64
	server          *http.Server
	startTime       time.Time
}

// NewHTTPServer constructs an HTTPServer instance.
func NewHTTPServer(port int, store *Store, verifier *PaymentVerifier, defaultPrice *big.Int, seederAddress, contractAddress string, chainID int64) *HTTPServer {
	if defaultPrice == nil {
		defaultPrice = big.NewInt(1000000) // fallback 0.000001 MON
	}
	return &HTTPServer{
		port:            port,
		store:           store,
		verifier:        verifier,
		defaultPrice:    defaultPrice,
		seederAddress:   seederAddress,
		contractAddress: contractAddress,
		chainID:         chainID,
		startTime:       time.Now(),
	}
}

// Handler returns the HTTP handler with all chunk routes configured.
func (s *HTTPServer) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/chunks/", s.handleChunk)

	return s.withCORS(mux)
}

func (s *HTTPServer) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Torrentia-Payment-Tx")
		w.Header().Set("Access-Control-Expose-Headers", "X-Torrentia-Chunk-Price, X-Torrentia-Seeder-Address, X-Torrentia-Payment-Contract, X-Torrentia-Chain-Id, Content-Length")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *HTTPServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	usedBytes, _ := s.store.GetTotalUsedBytes()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":        "ok",
		"seederAddress": s.seederAddress,
		"usedBytes":     usedBytes,
		"uptimeSeconds": time.Since(s.startTime).Seconds(),
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *HTTPServer) handleChunk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	// Route path format: /chunks/{modelId}/{chunkIndex}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 3 || parts[0] != "chunks" {
		http.Error(w, "Invalid chunk path. Expected /chunks/{modelId}/{chunkIndex}", http.StatusBadRequest)
		return
	}

	modelID := parts[1]
	chunkIndex64, err := strconv.ParseUint(parts[2], 10, 32)
	if err != nil {
		http.Error(w, "Invalid chunk index", http.StatusBadRequest)
		return
	}
	chunkIndex := uint32(chunkIndex64)

	// Verify chunk exists locally
	if !s.store.HasChunk(modelID, chunkIndex) {
		http.Error(w, fmt.Sprintf("Chunk %d for model %s not held by this node", chunkIndex, modelID), http.StatusNotFound)
		return
	}

	txHash := strings.TrimSpace(r.Header.Get("X-Torrentia-Payment-Tx"))

	// 1. Missing payment proof -> Return 402 Challenge
	if txHash == "" {
		w.Header().Set("X-Torrentia-Chunk-Price", s.defaultPrice.String())
		w.Header().Set("X-Torrentia-Seeder-Address", s.seederAddress)
		w.Header().Set("X-Torrentia-Payment-Contract", s.contractAddress)
		w.Header().Set("X-Torrentia-Chain-Id", strconv.FormatInt(s.chainID, 10))
		w.WriteHeader(http.StatusPaymentRequired)
		_, _ = w.Write([]byte("402 Payment Required: Submit transaction hash via X-Torrentia-Payment-Tx header\n"))
		return
	}

	// 2. Verify payment on Monad
	ok, err := s.verifier.VerifyChunkPayment(r.Context(), modelID, chunkIndex, txHash, s.defaultPrice)
	if err != nil || !ok {
		slog.Warn("chunk payment verification failed", "modelId", modelID, "chunkIndex", chunkIndex, "txHash", txHash, "err", err)
		http.Error(w, fmt.Sprintf("Payment verification failed: %v", err), http.StatusForbidden)
		return
	}

	// 3. Open chunk file and stream
	file, info, err := s.store.OpenChunkFile(modelID, chunkIndex)
	if err != nil {
		http.Error(w, "Failed to read chunk file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))

	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, file)
}

// Start launches the HTTP server on the configured port.
func (s *HTTPServer) Start() error {
	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: s.Handler(),
	}
	return s.server.ListenAndServe()
}

// Shutdown stops the HTTP server gracefully.
func (s *HTTPServer) Shutdown(ctx context.Context) error {
	if s.server != nil {
		return s.server.Shutdown(ctx)
	}
	return nil
}
