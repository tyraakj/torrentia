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

	"torrentia/signaling/internal/broker"
)

func shutdownWithCode(code int) {
	os.Exit (code)
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

	// Initialize Nonce Store
	nonceStore := broker.NewMemoryNonceStore(10 * time.Minute)
	defer nonceStore.Close()

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
