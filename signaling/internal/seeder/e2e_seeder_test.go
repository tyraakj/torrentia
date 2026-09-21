package seeder_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"torrentia/signaling/internal/seeder"
	"torrentia/signaling/internal/tracker"
	"torrentia/signaling/internal/ws"
)

func TestE2E_FullPersistentSeederLifecycle(t *testing.T) {
	tmpDir := t.TempDir()

	seederAddr := "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"
	contractAddr := "0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa"
	modelID := "0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f"

	// 1. Boot mock Monad JSON-RPC server
	rpcServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Returns valid receipt for tx "0xvalidtx" and reverts for anything else
		body, _ := io.ReadAll(r.Body)
		if strings.Contains(string(body), "0xvalidtx") {
			mockReceipt := `{
				"jsonrpc": "2.0",
				"id": 1,
				"result": {
					"status": "0x1",
					"logs": [{
						"address": "` + contractAddr + `",
						"topics": [
							"0x3238fbdab70e555ad163955d8f0517199c4923108133b37db082673bdf32ede8",
							"` + modelID + `",
							"0x00000000000000000000000050bd6d079efc47afdf3ffe8a5387e7156b568b90",
							"0x000000000000000000000000a11ce00000000000000000000000000000000000"
						],
						"data": "0x000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000534448356d00000000000000000000000000000000000000000000000000000076cb3aa52e0000"
					}]
				}
			}`
			w.Write([]byte(mockReceipt))
		} else {
			w.Write([]byte(`{"jsonrpc":"2.0","id":1,"result":{"status":"0x0","logs":[]}}`))
		}
	}))
	defer rpcServer.Close()

	// 2. Boot mock Torrentia signaling hub
	tr := tracker.NewTracker()
	hub := ws.NewHub(tr)
	sigMux := http.NewServeMux()
	sigMux.HandleFunc("/ws", hub.ServeWS)
	sigServer := httptest.NewServer(sigMux)
	defer sigServer.Close()

	// 3. Configure seeder node
	cfg := seeder.DefaultConfig()
	cfg.DataDir = tmpDir
	cfg.SeederAddress = seederAddr
	cfg.SplitPaymentContract = contractAddr
	cfg.SignalingURL = "ws" + strings.TrimPrefix(sigServer.URL, "http") + "/ws"
	cfg.MonadRPCURL = rpcServer.URL
	cfg.HTTPEndpoint.Port = 9091
	cfg.HTTPEndpoint.PublicURL = "http://127.0.0.1:9091"

	engine, err := seeder.NewEngine(cfg)
	if err != nil {
		t.Fatalf("failed to create seeder engine: %v", err)
	}

	// 4. Pre-seed chunk 0 and chunk 1 into store
	chunk0Data := []byte("chunk zero binary data for e2e test")
	h0 := sha256.Sum256(chunk0Data)
	err = engine.GetStore().PutChunk(modelID, 0, chunk0Data, hex.EncodeToString(h0[:]))
	if err != nil {
		t.Fatalf("failed to put chunk 0: %v", err)
	}

	chunk1Data := []byte("chunk one binary data for e2e test")
	h1 := sha256.Sum256(chunk1Data)
	err = engine.GetStore().PutChunk(modelID, 1, chunk1Data, hex.EncodeToString(h1[:]))
	if err != nil {
		t.Fatalf("failed to put chunk 1: %v", err)
	}

	// 5. Start engine in background
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	engineErrCh := make(chan error, 1)
	go func() {
		engineErrCh <- engine.Start(ctx)
	}()

	// Wait for engine startup and signaling registration
	time.Sleep(150 * time.Millisecond)

	// Explicitly announce model
	if err := engine.AnnounceModel(modelID); err != nil {
		t.Fatalf("failed to announce model: %v", err)
	}

	time.Sleep(50 * time.Millisecond)

	// 6. Test Tracker Announcement Verification
	// The tracker should register the seeder with the 2 held chunks
	seeders := tr.Query(modelID)
	if len(seeders) == 0 {
		t.Fatalf("expected seeder registered in tracker for model %s", modelID)
	}
	if len(seeders[0].ChunksHeld) != 2 {
		t.Fatalf("expected 2 chunks held in tracker, got %d", len(seeders[0].ChunksHeld))
	}

	// 7. Downloader HTTP Chunk Flow Testing
	chunkURL := "http://127.0.0.1:9091/chunks/" + modelID + "/0"

	// Step A: Unpaid request -> 402 challenge
	reqUnpaid, _ := http.NewRequest("GET", chunkURL, nil)
	respUnpaid, err := http.DefaultClient.Do(reqUnpaid)
	if err != nil {
		t.Fatalf("unpaid chunk request failed: %v", err)
	}
	defer respUnpaid.Body.Close()

	if respUnpaid.StatusCode != http.StatusPaymentRequired {
		t.Fatalf("expected 402 Payment Required, got %d", respUnpaid.StatusCode)
	}
	if respUnpaid.Header.Get("X-Torrentia-Seeder-Address") != seederAddr {
		t.Fatalf("unexpected seeder header: %s", respUnpaid.Header.Get("X-Torrentia-Seeder-Address"))
	}

	// Step B: Request with invalid tx -> 403 Forbidden
	reqInvalid, _ := http.NewRequest("GET", chunkURL, nil)
	reqInvalid.Header.Set("X-Torrentia-Payment-Tx", "0xrevertedtx")
	respInvalid, err := http.DefaultClient.Do(reqInvalid)
	if err != nil {
		t.Fatalf("invalid payment request failed: %v", err)
	}
	defer respInvalid.Body.Close()

	if respInvalid.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for reverted tx, got %d", respInvalid.StatusCode)
	}

	// Step C: Request with valid tx -> 200 OK and chunk data stream
	reqValid, _ := http.NewRequest("GET", chunkURL, nil)
	reqValid.Header.Set("X-Torrentia-Payment-Tx", "0xvalidtx")
	respValid, err := http.DefaultClient.Do(reqValid)
	if err != nil {
		t.Fatalf("valid payment request failed: %v", err)
	}
	defer respValid.Body.Close()

	if respValid.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respValid.Body)
		t.Fatalf("expected 200 OK, got %d: %s", respValid.StatusCode, string(body))
	}

	streamedData, err := io.ReadAll(respValid.Body)
	if err != nil {
		t.Fatalf("failed to read streamed chunk data: %v", err)
	}
	if string(streamedData) != string(chunk0Data) {
		t.Fatalf("streamed data mismatch: got %s, want %s", string(streamedData), string(chunk0Data))
	}

	// Step D: Replay attack protection -> requesting chunk 1 with the SAME txHash must be rejected
	chunk1URL := "http://127.0.0.1:9091/chunks/" + modelID + "/1"
	reqReplay, _ := http.NewRequest("GET", chunk1URL, nil)
	reqReplay.Header.Set("X-Torrentia-Payment-Tx", "0xvalidtx")
	respReplay, err := http.DefaultClient.Do(reqReplay)
	if err != nil {
		t.Fatalf("replay payment request failed: %v", err)
	}
	defer respReplay.Body.Close()

	if respReplay.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for replayed txHash, got %d", respReplay.StatusCode)
	}

	// 8. Graceful Stop
	cancel()
	select {
	case <-engineErrCh:
		// Clean exit
	case <-time.After(2 * time.Second):
		t.Fatalf("engine shutdown timed out")
	}
}
