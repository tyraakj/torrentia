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
	"syscall"
	"time"

	"torrentia/signaling/internal/tracker"
	"torrentia/signaling/internal/ws"
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

	// Check if PORT environment variable is provided (Render, Heroku, Cloud Run)
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

	tr := tracker.NewTracker()
	hub := ws.NewHub(tr)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Start background eviction routine
	evictionInterval := *heartbeatTimeout / 3
	if evictionInterval < time.Second {
		evictionInterval = time.Second
	}
	tr.StartEvictionLoop(ctx, *heartbeatTimeout, evictionInterval)

	mux := http.NewServeMux()

	// WebSocket signaling & tracker endpoint
	mux.HandleFunc("/ws", hub.ServeWS)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		// Allow CORS for browser health checks
		// TODO: restrict CORS in production
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "*")
		w.Header().Set("Content-Type", "application/json")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		uniquePeers, totalSeeders := tr.Stats()
		connectedPeers := hub.PeerCount()

		// If connected peers are higher than tracker active peers, report max
		reportedPeers := connectedPeers
		if uniquePeers > reportedPeers {
			reportedPeers = uniquePeers
		}

		resp := HealthResponse{
			Status:    "ok",
			Peers:     reportedPeers,
			Seeders:   totalSeeders,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)
	})

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", *port),
		Handler: mux,
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
}
