package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"torrentia/signaling/internal/broker"
)

func shutdownWithCode(code int) {
	exitFn := os.Exit
	exitFn(code)
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	logger.Info("starting Torrentia Upload Broker Service")

	cfg, err := broker.LoadConfigFromEnv()
	if err != nil {
		logger.Error("failed to load configuration", "error", err)
		shutdownWithCode(1)
	}

	// Initialize IPFS Pinner
	var pinner broker.IPFSClient
	if cfg.PinataJWT != "" {
		pinner = broker.NewPinataClient(cfg.PinataJWT)
		logger.Info("IPFS Pinata client initialized with server-side credentials")
	} else {
		logger.Warn("PINATA_JWT is not set; running with Mock IPFS Client (offline/local development mode)")
		pinner = broker.NewMockIPFSClient()
	}

	// Nonce replay protection is a network dependency in deployed environments.
	// The memory store remains available only when REDIS_URL is intentionally omitted
	// for local development.
	var nonceStore broker.NonceStore
	var redisClient *redis.Client
	if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		opts, err := redis.ParseURL(redisURL)
		if err != nil {
			logger.Error("failed to parse REDIS_URL", "error", err)
			shutdownWithCode(1)
		}
		redisClient = redis.NewClient(opts)
		pingCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := redisClient.Ping(pingCtx).Err(); err != nil {
			cancel()
			logger.Error("failed to connect to Redis for nonce store", "error", err)
			shutdownWithCode(1)
		}
		cancel()
		nonceStore = broker.NewRedisNonceStore(redisClient)
		logger.Info("using Redis nonce store", "addr", opts.Addr)
	} else {
		nonceStore = broker.NewMemoryNonceStore(10 * time.Minute)
		logger.Warn("REDIS_URL is not set; using in-process nonce store for local development only")
	}
	if redisClient != nil {
		defer redisClient.Close()
	}

	// Initialize HTTP Server
	srv := broker.NewServer(cfg, pinner, nonceStore, logger)
	addr := fmt.Sprintf(":%d", cfg.Port)

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           srv.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       cfg.RequestTimeout,
		WriteTimeout:      cfg.RequestTimeout,
		IdleTimeout:       120 * time.Second,
	}

	serverErrors := make(chan error, 1)

	go func() {
		logger.Info("upload broker listening", "addr", addr, "port", cfg.Port, "chainId", cfg.ChainID)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- fmt.Errorf("http server failure: %w", err)
		}
	}()

	// Graceful shutdown on OS interrupt
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		logger.Error("server startup error", "error", err)
		shutdownWithCode(1)
	case sig := <-shutdown:
		logger.Info("shutdown signal received", "signal", sig.String())

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := httpServer.Shutdown(ctx); err != nil {
			logger.Error("graceful shutdown failed; forcing exit", "error", err)
			_ = httpServer.Close()
			shutdownWithCode(1)
		}
		logger.Info("upload broker stopped cleanly")
	}
}
