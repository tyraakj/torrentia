package seeder_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"torrentia/signaling/internal/seeder"
	"torrentia/signaling/internal/tracker"
	"torrentia/signaling/internal/ws"
)

func TestSignalingClient_ConnectAnnounceHeartbeat(t *testing.T) {
	tr := tracker.NewTracker()
	hub := ws.NewHub(tr)
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", hub.ServeWS)
	server := httptest.NewServer(mux)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	client := seeder.NewSignalingClient(wsURL, "test-seeder-peer", "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatalf("failed to connect signaling client: %v", err)
	}
	defer client.Close()

	// Wait for registration
	time.Sleep(50 * time.Millisecond)

	// Announce model chunks
	modelID := "0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f"
	if err := client.Announce(modelID, []uint32{0, 1, 2}); err != nil {
		t.Fatalf("failed to announce chunks: %v", err)
	}

	time.Sleep(50 * time.Millisecond)

	// Verify tracker holds chunks
	seeders := tr.Query(modelID)
	if len(seeders) == 0 || len(seeders[0].ChunksHeld) != 3 {
		t.Fatalf("tracker did not record seeder announcement: %+v", seeders)
	}
	if seeders[0].Address != "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90" {
		t.Fatalf("unexpected seeder address: %s", seeders[0].Address)
	}
}
