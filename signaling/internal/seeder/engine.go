package seeder

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// CatalogModel records metadata and held chunks for a seeded model.
type CatalogModel struct {
	ModelID     string    `json:"modelId"`
	ManifestCID string    `json:"manifestCid"`
	ChunksHeld  []uint32  `json:"chunksHeld"`
	TotalChunks uint32    `json:"totalChunks"`
	TotalSize   uint64    `json:"totalSize"`
	ModelCard   string    `json:"modelCard,omitempty"`
	AddedAt     time.Time `json:"addedAt"`
}

// Engine coordinates the local chunk store, IPFS manifest validator, Monad verifier,
// signaling client, and HTTP chunk server.
type Engine struct {
	cfg             *Config
	store           *Store
	verifier        *PaymentVerifier
	signalingClient *SignalingClient
	httpServer      *HTTPServer
	catalog         map[string]*CatalogModel
	catalogPath     string
	mu              sync.RWMutex
	ctx             context.Context
	cancel          context.CancelFunc
}

// NewEngine constructs a new Seeder Engine.
func NewEngine(cfg *Config) (*Engine, error) {
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid seeder config: %w", err)
	}

	store := NewStore(cfg.DataDir, cfg.Limits.MaxStorageBytes)
	var replayStore PaymentReplayStore
	if cfg.RedisURL != "" {
		opts, err := redis.ParseURL(cfg.RedisURL)
		if err != nil {
			return nil, fmt.Errorf("parse RedisURL: %w", err)
		}
		redisClient := redis.NewClient(opts)
		pingCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := redisClient.Ping(pingCtx).Err(); err != nil {
			cancel()
			_ = redisClient.Close()
			return nil, fmt.Errorf("connect to Redis: %w", err)
		}
		cancel()
		replayStore = NewRedisPaymentReplayStore(redisClient)
	} else {
		replayStore = &memoryPaymentReplayStore{entries: make(map[string]time.Time)}
	}
	verifier := NewPaymentVerifierWithReplayStore(cfg.MonadRPCURL, cfg.SplitPaymentContract, cfg.SeederAddress, cfg.ChainID, replayStore)

	peerID := fmt.Sprintf("torrentia-cli-%s-%d", cfg.SeederAddress[:8], os.Getpid())
	sigClient := NewSignalingClient(cfg.SignalingURL, peerID, cfg.SeederAddress)

	httpServer := NewHTTPServer(
		cfg.HTTPEndpoint.Port,
		store,
		verifier,
		nil,
		cfg.SeederAddress,
		cfg.SplitPaymentContract,
		cfg.ChainID,
	)

	catalogPath := filepath.Join(cfg.DataDir, "state", "catalog.json")

	e := &Engine{
		cfg:             cfg,
		store:           store,
		verifier:        verifier,
		signalingClient: sigClient,
		httpServer:      httpServer,
		catalog:         make(map[string]*CatalogModel),
		catalogPath:     catalogPath,
	}

	_ = e.loadCatalog()
	return e, nil
}

func (e *Engine) loadCatalog() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	data, err := os.ReadFile(e.catalogPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var list []*CatalogModel
	if err := json.Unmarshal(data, &list); err != nil {
		return err
	}

	for _, m := range list {
		e.catalog[m.ModelID] = m
	}
	return nil
}

func (e *Engine) saveCatalogLocked() error {
	if err := os.MkdirAll(filepath.Dir(e.catalogPath), 0755); err != nil {
		return err
	}

	var list []*CatalogModel
	for _, m := range e.catalog {
		list = append(list, m)
	}

	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}

	tmpFile := fmt.Sprintf("%s.tmp.%d", e.catalogPath, time.Now().UnixNano())
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return err
	}

	return os.Rename(tmpFile, e.catalogPath)
}

// Start boots the signaling client connection and starts the HTTP chunk server.
func (e *Engine) Start(ctx context.Context) error {
	e.ctx, e.cancel = context.WithCancel(ctx)

	// 1. Connect to signaling server
	slog.Info("connecting to Torrentia signaling server", "url", e.cfg.SignalingURL)
	if err := e.signalingClient.Connect(e.ctx); err != nil {
		slog.Warn("could not connect to signaling server immediately (will retry)", "err", err)
	}

	// 2. Announce all cataloged models
	if err := e.AnnounceAll(); err != nil {
		slog.Warn("initial announcement warning", "err", err)
	}

	// 3. Start HTTP server in background
	if e.cfg.HTTPEndpoint.Enabled {
		go func() {
			slog.Info("starting HTTP chunk server", "port", e.cfg.HTTPEndpoint.Port)
			if err := e.httpServer.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				slog.Error("HTTP chunk server error", "err", err)
			}
		}()
	}

	<-e.ctx.Done()
	return e.Stop()
}

// Stop cleanly shuts down the engine and its network transports.
func (e *Engine) Stop() error {
	slog.Info("stopping Torrentia seeder engine...")
	if e.cancel != nil {
		e.cancel()
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_ = e.httpServer.Shutdown(shutdownCtx)
	_ = e.signalingClient.Close()
	return nil
}

// AddModel fetches an IPFS manifest, creates a catalog entry, and optionally seeds missing chunks.
func (e *Engine) AddModel(ctx context.Context, modelID, manifestCID string, download bool) (*ChunkManifest, error) {
	manifest, err := FetchManifest(ctx, manifestCID, e.cfg.IPFSGateways)
	if err != nil {
		return nil, fmt.Errorf("fetch manifest: %w", err)
	}

	if manifest.ModelID != "" && manifest.ModelID != modelID {
		slog.Warn("manifest modelId differs from requested, using requested", "manifest", manifest.ModelID, "requested", modelID)
	}

	heldChunks, err := e.store.GetHeldChunks(modelID)
	if err != nil {
		heldChunks = []uint32{}
	}

	e.mu.Lock()
	model := &CatalogModel{
		ModelID:     modelID,
		ManifestCID: manifestCID,
		ChunksHeld:  heldChunks,
		TotalChunks: uint32(len(manifest.Chunks)),
		TotalSize:   manifest.TotalSize,
		ModelCard:   manifest.ModelCard,
		AddedAt:     time.Now(),
	}
	e.catalog[modelID] = model
	_ = e.saveCatalogLocked()
	e.mu.Unlock()

	// Announce to tracker if connected
	_ = e.signalingClient.Announce(modelID, heldChunks)

	return manifest, nil
}

// ListModels returns all catalog models.
func (e *Engine) ListModels() []*CatalogModel {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var list []*CatalogModel
	for _, m := range e.catalog {
		// refresh held chunks from disk
		held, _ := e.store.GetHeldChunks(m.ModelID)
		m.ChunksHeld = held
		list = append(list, m)
	}
	return list
}

// RemoveModel removes a model from catalog and optionally deletes chunk files.
func (e *Engine) RemoveModel(modelID string, purge bool) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	delete(e.catalog, modelID)
	_ = e.saveCatalogLocked()

	if purge {
		return e.store.DeleteModel(modelID)
	}
	return nil
}

// AnnounceAll advertises all verified chunks for all catalog models to the signaling tracker.
func (e *Engine) AnnounceAll() error {
	e.mu.RLock()
	defer e.mu.RUnlock()

	for modelID, m := range e.catalog {
		held, err := e.store.GetHeldChunks(modelID)
		if err == nil {
			m.ChunksHeld = held
			_ = e.signalingClient.Announce(modelID, held)
		}
	}
	return nil
}

// AnnounceModel broadcasts availability for a specific model's held chunks.
func (e *Engine) AnnounceModel(modelID string) error {
	held, err := e.store.GetHeldChunks(modelID)
	if err != nil {
		return err
	}
	return e.signalingClient.Announce(modelID, held)
}

// GetStore returns the underlying chunk store.
func (e *Engine) GetStore() *Store {
	return e.store
}
