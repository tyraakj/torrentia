package tracker

import (
	"context"
	"testing"
	"time"
)

func TestTracker_AnnounceAndQuery(t *testing.T) {
	tr := NewTracker()

	// Query non-existent model returns empty slice (not nil)
	seeders := tr.Query("model-1")
	if len(seeders) != 0 {
		t.Fatalf("expected 0 seeders, got %d", len(seeders))
	}

	// Announce peer-1 with chunks [0, 1, 2]
	tr.Announce("model-1", "peer-1", "0x1111", []uint32{0, 1, 2})

	seeders = tr.Query("model-1")
	if len(seeders) != 1 {
		t.Fatalf("expected 1 seeder, got %d", len(seeders))
	}
	if seeders[0].PeerID != "peer-1" || seeders[0].Address != "0x1111" {
		t.Errorf("unexpected seeder dto: %+v", seeders[0])
	}
	if len(seeders[0].ChunksHeld) != 3 || seeders[0].ChunksHeld[2] != 2 {
		t.Errorf("unexpected chunks held: %+v", seeders[0].ChunksHeld)
	}

	// Announce peer-2 with chunks [1, 3]
	tr.Announce("model-1", "peer-2", "0x2222", []uint32{1, 3})
	seeders = tr.Query("model-1")
	if len(seeders) != 2 {
		t.Fatalf("expected 2 seeders, got %d", len(seeders))
	}

	// Update peer-1 chunks
	tr.Announce("model-1", "peer-1", "0x1111", []uint32{0, 1, 2, 3, 4})
	seeders = tr.Query("model-1")
	if len(seeders) != 2 {
		t.Fatalf("expected 2 seeders, got %d", len(seeders))
	}
	for _, s := range seeders {
		if s.PeerID == "peer-1" && len(s.ChunksHeld) != 5 {
			t.Errorf("expected peer-1 to have 5 chunks, got %d", len(s.ChunksHeld))
		}
	}
}

func TestTracker_RemovePeer(t *testing.T) {
	tr := NewTracker()

	tr.Announce("model-1", "peer-1", "0x1111", []uint32{0})
	tr.Announce("model-2", "peer-1", "0x1111", []uint32{0})
	tr.Announce("model-1", "peer-2", "0x2222", []uint32{0})

	uPeers, totalAnnouncements := tr.Stats()
	if uPeers != 2 || totalAnnouncements != 3 {
		t.Fatalf("expected 2 peers and 3 announcements, got %d and %d", uPeers, totalAnnouncements)
	}

	tr.RemovePeer("peer-1")

	m1Seeders := tr.Query("model-1")
	if len(m1Seeders) != 1 || m1Seeders[0].PeerID != "peer-2" {
		t.Fatalf("expected only peer-2 on model-1, got %+v", m1Seeders)
	}

	m2Seeders := tr.Query("model-2")
	if len(m2Seeders) != 0 {
		t.Fatalf("expected 0 seeders on model-2, got %+v", m2Seeders)
	}

	uPeers, totalAnnouncements = tr.Stats()
	if uPeers != 1 || totalAnnouncements != 1 {
		t.Fatalf("expected 1 peer and 1 announcement, got %d and %d", uPeers, totalAnnouncements)
	}
}

func TestTracker_HeartbeatAndEviction(t *testing.T) {
	tr := NewTracker()

	tr.Announce("model-1", "peer-1", "0x1111", []uint32{0})
	tr.Announce("model-1", "peer-2", "0x2222", []uint32{0})

	// Artificially age peer-1's heartbeat
	tr.mu.Lock()
	tr.models["model-1"]["peer-1"].LastHeartbeat = time.Now().Add(-70 * time.Second)
	tr.mu.Unlock()

	// Evict with 60s timeout
	evicted := tr.EvictStale(60 * time.Second)
	if evicted != 1 {
		t.Fatalf("expected 1 evicted seeder, got %d", evicted)
	}

	seeders := tr.Query("model-1")
	if len(seeders) != 1 || seeders[0].PeerID != "peer-2" {
		t.Fatalf("expected only peer-2 remaining, got %+v", seeders)
	}

	// Test Heartbeat renewal
	tr.mu.Lock()
	tr.models["model-1"]["peer-2"].LastHeartbeat = time.Now().Add(-50 * time.Second)
	tr.mu.Unlock()

	tr.Heartbeat("peer-2")

	tr.mu.RLock()
	lastHB := tr.models["model-1"]["peer-2"].LastHeartbeat
	tr.mu.RUnlock()

	if time.Since(lastHB) > 5*time.Second {
		t.Errorf("heartbeat was not updated: %v", lastHB)
	}
}

func TestTracker_EvictionLoop(t *testing.T) {
	tr := NewTracker()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	tr.Announce("model-1", "peer-1", "0x1111", []uint32{0})

	// Set heartbeat to 100ms ago
	tr.mu.Lock()
	tr.models["model-1"]["peer-1"].LastHeartbeat = time.Now().Add(-100 * time.Millisecond)
	tr.mu.Unlock()

	tr.StartEvictionLoop(ctx, 50*time.Millisecond, 20*time.Millisecond)

	// Wait for loop to evict
	time.Sleep(100 * time.Millisecond)

	seeders := tr.Query("model-1")
	if len(seeders) != 0 {
		t.Fatalf("expected peer-1 to be evicted by loop, got %d seeders", len(seeders))
	}
}
