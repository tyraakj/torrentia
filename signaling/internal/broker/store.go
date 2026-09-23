package broker

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	// ErrNonceReused is returned when an upload intent nonce has already been consumed.
	ErrNonceReused = errors.New("upload intent nonce has already been consumed")
)

// NonceStore tracks consumed nonces per creator to prevent replay attacks.
type NonceStore interface {
	ConsumeNonce(creator string, nonce string, ttl time.Duration) error
}

// RedisNonceStore provides replay protection shared by every broker instance.
// Redis SET NX is atomic, so two broker replicas cannot consume the same nonce.
type RedisNonceStore struct {
	client *redis.Client
	prefix string
}

func NewRedisNonceStore(client *redis.Client) *RedisNonceStore {
	return &RedisNonceStore{client: client, prefix: "torrentia:broker:nonce:"}
}

func (s *RedisNonceStore) ConsumeNonce(creator string, nonce string, ttl time.Duration) error {
	cleanCreator := strings.ToLower(strings.TrimSpace(creator))
	cleanNonce := strings.TrimSpace(nonce)
	if cleanCreator == "" || cleanNonce == "" {
		return errors.New("creator and nonce must not be empty")
	}

	key := fmt.Sprintf("%s%s:%s", s.prefix, cleanCreator, cleanNonce)
	ok, err := s.client.SetNX(context.Background(), key, "1", ttl).Result()
	if err != nil {
		return fmt.Errorf("consume nonce in redis: %w", err)
	}
	if !ok {
		return ErrNonceReused
	}
	return nil
}

type nonceEntry struct {
	consumedAt time.Time
	expiresAt  time.Time
}

// MemoryNonceStore is a thread-safe in-memory implementation of NonceStore.
type MemoryNonceStore struct {
	mu      sync.RWMutex
	entries map[string]nonceEntry // key: "creator:nonce"
	stopCh  chan struct{}
}

// NewMemoryNonceStore creates a new MemoryNonceStore and starts a background cleaner.
func NewMemoryNonceStore(cleanupInterval time.Duration) *MemoryNonceStore {
	s := &MemoryNonceStore{
		entries: make(map[string]nonceEntry),
		stopCh:  make(chan struct{}),
	}

	go s.cleanupLoop(cleanupInterval)
	return s
}

// ConsumeNonce marks a nonce as used for the given creator.
// If the nonce was already used and has not expired, ErrNonceReused is returned.
func (s *MemoryNonceStore) ConsumeNonce(creator string, nonce string, ttl time.Duration) error {
	cleanCreator := strings.ToLower(strings.TrimSpace(creator))
	cleanNonce := strings.TrimSpace(nonce)
	if cleanCreator == "" || cleanNonce == "" {
		return errors.New("creator and nonce must not be empty")
	}

	key := fmt.Sprintf("%s:%s", cleanCreator, cleanNonce)
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	if entry, exists := s.entries[key]; exists {
		if now.Before(entry.expiresAt) {
			return ErrNonceReused
		}
	}

	s.entries[key] = nonceEntry{
		consumedAt: now,
		expiresAt:  now.Add(ttl),
	}

	return nil
}

func (s *MemoryNonceStore) cleanupLoop(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.cleanExpired()
		case <-s.stopCh:
			return
		}
	}
}

func (s *MemoryNonceStore) cleanExpired() {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for key, entry := range s.entries {
		if now.After(entry.expiresAt) {
			delete(s.entries, key)
		}
	}
}

// Close stops the background cleanup routine.
func (s *MemoryNonceStore) Close() {
	close(s.stopCh)
}
