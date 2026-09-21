package seeder_test

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"torrentia/signaling/internal/seeder"
)

func TestHTTPServer_402ChallengeAndDelivery(t *testing.T) {
	tmpDir := t.TempDir()
	store := seeder.NewStore(tmpDir, 10*1024*1024)
	modelID := "0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f"
	data := []byte("chunk bytes content for torrentia http stream test")
	h := sha256.Sum256(data)
	_ = store.PutChunk(modelID, 0, data, hex.EncodeToString(h[:]))

	seederAddr := "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"
	contractAddr := "0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa"

	// Mock RPC server for payment verification
	rpcServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
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
	}))
	defer rpcServer.Close()

	verifier := seeder.NewPaymentVerifier(rpcServer.URL, contractAddr, seederAddr, 10143)
	chunkPrice := big.NewInt(1000000)
	srv := seeder.NewHTTPServer(0, store, verifier, chunkPrice, seederAddr, contractAddr, 10143)

	ts := httptest.NewServer(srv.Handler())
	defer ts.Close()

	// 1. Unpaid request -> 402 Payment Required with challenge headers
	req, _ := http.NewRequest("GET", ts.URL+"/chunks/"+modelID+"/0", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("unpaid request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusPaymentRequired {
		t.Fatalf("expected status 402, got %d", resp.StatusCode)
	}
	if resp.Header.Get("X-Torrentia-Seeder-Address") != seederAddr {
		t.Fatalf("unexpected seeder address header: %s", resp.Header.Get("X-Torrentia-Seeder-Address"))
	}
	if resp.Header.Get("X-Torrentia-Chunk-Price") != chunkPrice.String() {
		t.Fatalf("unexpected chunk price header: %s", resp.Header.Get("X-Torrentia-Chunk-Price"))
	}

	// 2. Paid request with valid txHash -> 200 OK + binary stream
	paidReq, _ := http.NewRequest("GET", ts.URL+"/chunks/"+modelID+"/0", nil)
	paidReq.Header.Set("X-Torrentia-Payment-Tx", "0xabc123")
	paidResp, err := http.DefaultClient.Do(paidReq)
	if err != nil {
		t.Fatalf("paid request failed: %v", err)
	}
	defer paidResp.Body.Close()

	if paidResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(paidResp.Body)
		t.Fatalf("expected status 200, got %d: %s", paidResp.StatusCode, string(body))
	}

	receivedBytes, err := io.ReadAll(paidResp.Body)
	if err != nil {
		t.Fatalf("failed to read chunk stream: %v", err)
	}
	if string(receivedBytes) != string(data) {
		t.Fatalf("streamed chunk bytes mismatch: got %s, want %s", string(receivedBytes), string(data))
	}

	// 3. Replay attempt with same txHash -> 403 Forbidden
	replayReq, _ := http.NewRequest("GET", ts.URL+"/chunks/"+modelID+"/0", nil)
	replayReq.Header.Set("X-Torrentia-Payment-Tx", "0xabc123")
	replayResp, err := http.DefaultClient.Do(replayReq)
	if err != nil {
		t.Fatalf("replay request failed: %v", err)
	}
	defer replayResp.Body.Close()

	if replayResp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403 for replayed transaction hash, got %d", replayResp.StatusCode)
	}
}
