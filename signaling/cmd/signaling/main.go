package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"torrentia/signaling/internal/auth"
	"torrentia/signaling/internal/tracker"
	"torrentia/signaling/internal/ws"

	"github.com/redis/go-redis/v9"
)

type HealthResponse struct {
	Status    string `json:"status"`
	Peers     int    `json:"peers"`
	Seeders   int    `json:"seeders"`
	Timestamp string `json:"timestamp"`
}

func main() {
	port := flag.Int("port", 8081, "Port to listen on")
	heartbeatTimeout := flag.Duration("heartbeat-timeout", 60*time.Second, "Duration of inactivity before seeder is evicted")
	flag.Parse()

	if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			*port = p
		}
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("initializing Torrentia signaling server",
		"port", *port,
		"heartbeatTimeout", *heartbeatTimeout,
	)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	allowedOrigins := parseAllowedOrigins(os.Getenv("ALLOWED_ORIGINS"))

	authSecretStr := os.Getenv("AUTH_SECRET")
	var authSecret []byte
	if authSecretStr != "" {
		authSecret = []byte(authSecretStr)
	} else {
		authSecret = []byte("torrentia-development-secret-key-32bytes!")
		slog.Warn("AUTH_SECRET not set; using default development secret key")
	}

	authRequired := strings.EqualFold(os.Getenv("AUTH_REQUIRED"), "true") || os.Getenv("AUTH_REQUIRED") == "1"

	redisURL := os.Getenv("REDIS_URL")
	var rdb *redis.Client
	var seederTr tracker.SeederTracker
	var challengeStore auth.ChallengeStore

	if redisURL != "" {
		opts, err := redis.ParseURL(redisURL)
		if err != nil {
			slog.Error("failed to parse REDIS_URL", "err", err)
			return
		}
		rdb = redis.NewClient(opts)
		pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := rdb.Ping(pingCtx).Err(); err != nil {
			pingCancel()
			slog.Error("failed to connect to Redis", "err", err)
			return
		}
		pingCancel()

		slog.Info("connected to Redis for distributed presence and relay", "addr", opts.Addr)
		seederTr = tracker.NewRedisTrackerWithClient(rdb)
		challengeStore = auth.NewRedisChallengeStore(rdb)
	} else {
		slog.Info("REDIS_URL not set; running in local in-memory fallback mode")
		memTracker := tracker.NewTracker()
		seederTr = memTracker
		challengeStore = auth.NewMemoryChallengeStore()

		evictionInterval := *heartbeatTimeout / 3
		if evictionInterval < time.Second {
			evictionInterval = time.Second
		}
		memTracker.StartEvictionLoop(ctx, *heartbeatTimeout, evictionInterval)
	}

	hub := ws.NewHubWithConfig(seederTr, ws.HubConfig{
		Origins:      allowedOrigins,
		AuthRequired: authRequired,
		AuthSecret:   authSecret,
		RedisClient:  rdb,
	})

	mux := http.NewServeMux()

	// Authentication endpoints
	mux.HandleFunc("/v1/auth/challenge", func(w http.ResponseWriter, r *http.Request) {
		if !setCORSHeaders(w, r, allowedOrigins) {
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Address string `json:"address"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Address == "" {
			http.Error(w, "invalid request: address is required", http.StatusBadRequest)
			return
		}

		ch, err := challengeStore.CreateChallenge(req.Address)
		if err != nil {
			http.Error(w, fmt.Sprintf("create challenge: %v", err), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(ch)
	})

	mux.HandleFunc("/v1/auth/session", func(w http.ResponseWriter, r *http.Request) {
		if !setCORSHeaders(w, r, allowedOrigins) {
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Address   string `json:"address"`
			Signature string `json:"signature"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Address == "" || req.Signature == "" {
			http.Error(w, "invalid request: address and signature are required", http.StatusBadRequest)
			return
		}

		ch, err := challengeStore.ConsumeChallenge(req.Address)
		if err != nil {
			http.Error(w, fmt.Sprintf("challenge invalid or expired: %v", err), http.StatusUnauthorized)
			return
		}

		if err := auth.VerifySignature(ch.Message, req.Signature, req.Address); err != nil {
			http.Error(w, fmt.Sprintf("signature verification failed: %v", err), http.StatusUnauthorized)
			return
		}

		token, peerID, expiresAt, err := auth.GenerateSessionToken(req.Address, authSecret)
		if err != nil {
			http.Error(w, fmt.Sprintf("generate session: %v", err), http.StatusInternalServerError)
			return
		}

		resp := map[string]interface{}{
			"token":     token,
			"peerId":    peerID,
			"expiresAt": expiresAt,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)
	})

	// WebSocket signaling & tracker endpoint
	mux.HandleFunc("/ws", hub.ServeWS)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if !setCORSHeaders(w, r, allowedOrigins) {
			return
		}

		_, totalSeeders := seederTr.Stats()
		connectedPeers := hub.PeerCount()

		resp := HealthResponse{
			Status:    "ok",
			Peers:     connectedPeers,
			Seeders:   totalSeeders,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)
	})

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", *port),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		slog.Info("server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down signaling server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("error during server shutdown", "err", err)
	} else {
		slog.Info("server shutdown complete")
	}

	_ = hub.Close()
	_ = seederTr.Close()
	if rdb != nil {
		_ = rdb.Close()
	}
}

func setCORSHeaders(w http.ResponseWriter, r *http.Request, allowedOrigins map[string]bool) bool {
	origin := r.Header.Get("Origin")
	if origin != "" {
		if allowedOrigins == nil || allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
		} else {
			w.WriteHeader(http.StatusForbidden)
			return false
		}
	} else if allowedOrigins == nil {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	}

	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return false
	}
	return true
}

func parseAllowedOrigins(value string) map[string]bool {
	origins := make(map[string]bool)
	for origin := range strings.SplitSeq(value, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins[origin] = true
		}
	}
	if len(origins) == 0 {
		return nil
	}
	return origins
}
