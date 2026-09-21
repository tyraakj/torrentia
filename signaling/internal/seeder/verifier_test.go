package seeder_test

import (
	"context"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"torrentia/signaling/internal/seeder"
)

func TestVerifier_ValidPaymentAndReplayProtection(t *testing.T) {
	modelID := "0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f"
	seederAddr := "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"
	contractAddr := "0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa"

	// Mock JSON-RPC server returning eth_getTransactionReceipt with PaymentSplit log
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	defer server.Close()

	v := seeder.NewPaymentVerifier(server.URL, contractAddr, seederAddr, 10143)

	// First verify should pass
	ok, err := v.VerifyChunkPayment(context.Background(), modelID, 0, "0x123abc", big.NewInt(1000000))
	if err != nil || !ok {
		t.Fatalf("expected payment verified, got ok=%v err=%v", ok, err)
	}

	// Replay attempt on different chunk with same txHash should fail with ErrPaymentAlreadyRedeemed
	ok, err = v.VerifyChunkPayment(context.Background(), modelID, 1, "0x123abc", big.NewInt(1000000))
	if err != seeder.ErrPaymentAlreadyRedeemed || ok {
		t.Fatalf("expected ErrPaymentAlreadyRedeemed, got ok=%v err=%v", ok, err)
	}
}

func TestVerifier_InvalidPaymentReceipt(t *testing.T) {
	modelID := "0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f"
	seederAddr := "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"
	contractAddr := "0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa"

	// Mock server returning status 0x0 (reverted transaction)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"jsonrpc": "2.0",
			"id": 1,
			"result": {
				"status": "0x0",
				"logs": []
			}
		}`))
	}))
	defer server.Close()

	v := seeder.NewPaymentVerifier(server.URL, contractAddr, seederAddr, 10143)
	ok, err := v.VerifyChunkPayment(context.Background(), modelID, 0, "0xbadtx", big.NewInt(1000))
	if err == nil || ok {
		t.Fatalf("expected failed verification for reverted transaction, got ok=%v", ok)
	}
}
