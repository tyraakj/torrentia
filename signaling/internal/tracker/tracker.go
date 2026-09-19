package tracker

import (
	"context"
	"sync"
	"time"
)

// SeederInfo stores the internal metadata of an active seeder for a given model.
type SeederInfo struct {
	Address       string    `json:"address"`
	ChunksHeld    []uint32  `json:"chunksHeld"`
	LastHeartbeat time.Time `json:"lastHeartbeat"`
}

// SeederDTO represents the response payload for model seeder queries.
type SeederDTO struct {
	PeerID     string   `json:"peerId"`
	Address    string   `json:"address"`
	ChunksHeld []uint32 `json:"chunksHeld"`
}

// Tracker maintains an in-memory, thread-safe mapping of models to seeders.
type Tracker struct {
	mu sync.RWMutex
	// models maps: modelId -> peerId -> *SeederInfo
	models map[string]map[string]*SeederInfo
}

// NewTracker creates an initialized Tracker instance.
func NewTracker() *Tracker {
	return &Tracker{
		models: make(map[string]map[string]*SeederInfo),
	}
}

// Announce registers or updates a seeder's available chunks for a given model.
func (t *Tracker) Announce(modelId, peerId, address string, chunksHeld []uint32) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.models[modelId] == nil {
		t.models[modelId] = make(map[string]*SeederInfo)
	}

	// Make a defensive copy of chunksHeld
	chunksCopy := make([]uint32, len(chunksHeld))
	copy(chunksCopy, chunksHeld)

	t.models[modelId][peerId] = &SeederInfo{
		Address:       address,
		ChunksHeld:    chunksCopy,
		LastHeartbeat: time.Now(),
	}
}

// Query returns all active seeders and their held chunks for a specific model.
func (t *Tracker) Query(modelId string) []SeederDTO {
	t.mu.RLock()
	defer t.mu.RUnlock()

	seedersMap, ok := t.models[modelId]
	if !ok || len(seedersMap) == 0 {
		return []SeederDTO{}
	}

	result := make([]SeederDTO, 0, len(seedersMap))
	for peerId, info := range seedersMap {
		chunksCopy := make([]uint32, len(info.ChunksHeld))
		copy(chunksCopy, info.ChunksHeld)

		result = append(result, SeederDTO{
			PeerID:     peerId,
			Address:    info.Address,
			ChunksHeld: chunksCopy,
		})
	}
	return result
}

// Heartbeat refreshes the LastHeartbeat timestamp for all models announced by peerId.
func (t *Tracker) Heartbeat(peerId string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := time.Now()
	for _, peerMap := range t.models {
		if info, ok := peerMap[peerId]; ok {
			info.LastHeartbeat = now
		}
	}
}

// RemovePeer purges all announcements associated with peerId across all models.
func (t *Tracker) RemovePeer(peerId string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	for modelId, peerMap := range t.models {
		delete(peerMap, peerId)
		if len(peerMap) == 0 {
			delete(t.models, modelId)
		}
	}
}

// EvictStale removes seeders whose LastHeartbeat is older than the provided timeout.
// Returns the number of evicted seeder records.
func (t *Tracker) EvictStale(timeout time.Duration) int {
	t.mu.Lock()
	defer t.mu.Unlock()

	threshold := time.Now().Add(-timeout)
	evictedCount := 0

	for modelId, peerMap := range t.models {
		for peerId, info := range peerMap {
			if info.LastHeartbeat.Before(threshold) {
				delete(peerMap, peerId)
				evictedCount++
			}
		}
		if len(peerMap) == 0 {
			delete(t.models, modelId)
		}
	}

	return evictedCount
}

// StartEvictionLoop runs a background eviction routine until the context is cancelled.
func (t *Tracker) StartEvictionLoop(ctx context.Context, timeout time.Duration, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				t.EvictStale(timeout)
			}
		}
	}()
}

// Stats returns the count of unique peers and total seeder registrations across all models.
func (t *Tracker) Stats() (uniquePeers int, seederAnnouncements int) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	seenPeers := make(map[string]struct{})
	total := 0

	for _, peerMap := range t.models {
		for peerId := range peerMap {
			seenPeers[peerId] = struct{}{}
			total++
		}
	}

	return len(seenPeers), total
}
