package seeder_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"torrentia/signaling/internal/seeder"
)

func TestDoctor_RunDiagnostics(t *testing.T) {
	tmpDir := t.TempDir()

	// Mock server for signaling health check
	signalingServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","peers":1,"seeders":1}`))
	}))
	defer signalingServer.Close()

	// Mock server for Monad RPC
	rpcServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Handles chainId, blockNumber, eth_getCode
		w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":"0x279f"}`))
	}))
	defer rpcServer.Close()

	cfg := seeder.DefaultConfig()
	cfg.DataDir = tmpDir
	cfg.SignalingURL = signalingServer.URL + "/ws"
	cfg.MonadRPCURL = rpcServer.URL
	cfg.SeederAddress = "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"

	results := seeder.RunDoctor(context.Background(), cfg)
	if len(results) == 0 {
		t.Fatalf("expected diagnostic results, got 0")
	}

	diskCheckPassed := false
	for _, res := range results {
		if res.Name == "Storage Directory" && res.OK {
			diskCheckPassed = true
		}
	}
	if !diskCheckPassed {
		t.Fatalf("expected Storage Directory check to pass: %+v", results)
	}
}
