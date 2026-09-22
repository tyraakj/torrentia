package broker

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/crypto"
)

func setupTestServer(t *testing.T) (*Server, *MockIPFSClient, *MemoryNonceStore, *Config) {
	cfg := &Config{
		Port:           8082,
		ChainID:        10143,
		AllowedOrigins: []string{"*"},
		MaxManifestMB:  5,
		NonceTTL:       time.Hour,
	}

	mockPinner := NewMockIPFSClient()
	mockPinner.NextCID = "bafkreitest1234567890abcdef"
	nonceStore := NewMemoryNonceStore(time.Minute)

	srv := NewServer(cfg, mockPinner, nonceStore, nil)
	return srv, mockPinner, nonceStore, cfg
}

func TestServer_Health(t *testing.T) {
	srv, _, _, _ := setupTestServer(t)
	ts := httptest.NewServer(srv.Routes())
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/health")
	if err != nil {
		t.Fatalf("failed GET /health: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if data["status"] != "ok" {
		t.Fatalf("expected status ok, got %v", data["status"])
	}
}

func TestServer_UploadManifest_Flow(t *testing.T) {
	srv, mockPinner, nonceStore, _ := setupTestServer(t)
	defer nonceStore.Close()

	ts := httptest.NewServer(srv.Routes())
	defer ts.Close()

	// 1. Generate test wallet & key
	privKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	creatorAddr := crypto.PubkeyToAddress(privKey.PublicKey)

	// 2. Prepare ChunkManifest
	manifest := ChunkManifest{
		ModelID:   "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
		ModelName: "test-model-alpha",
		TotalSize: 2048,
		Chunks: []ChunkMetadata{
			{Index: 0, Size: 1024, Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
			{Index: 1, Size: 1024, Hash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"},
		},
	}
	rawManifest, err := json.Marshal(manifest)
	if err != nil {
		t.Fatalf("failed to marshal manifest: %v", err)
	}
	rawHash := sha256.Sum256(rawManifest)
	rawHashHex := "0x" + hex.EncodeToString(rawHash[:])

	domainSep := ComputeDomainSeparator("Torrentia Upload Broker", "1", 10143)

	intent := UploadIntent{
		Creator:      creatorAddr.Hex(),
		ModelID:      manifest.ModelID,
		TotalSize:    2048,
		ChunkCount:   2,
		ManifestHash: rawHashHex,
		Nonce:        big.NewInt(100),
		Deadline:     time.Now().Unix() + 3600,
	}

	digest := ComputeUploadIntentDigest(intent, domainSep)
	sig, err := crypto.Sign(digest, privKey)
	if err != nil {
		t.Fatalf("failed to sign digest: %v", err)
	}
	sigHex := "0x" + hex.EncodeToString(sig)

	// A. Missing Signature -> 401 Unauthorized
	reqBodyNoSig, _ := json.Marshal(UploadManifestRequest{
		Intent:    intent,
		Signature: "",
		Manifest:  rawManifest,
	})
	respNoSig, err := http.Post(ts.URL+"/v1/uploads/manifest", "application/json", bytes.NewReader(reqBodyNoSig))
	if err != nil {
		t.Fatalf("failed request: %v", err)
	}
	if respNoSig.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for missing signature, got %d", respNoSig.StatusCode)
	}
	respNoSig.Body.Close()

	// B. Expired Deadline -> 400 Bad Request
	expiredIntent := intent
	expiredIntent.Deadline = time.Now().Unix() - 10
	expDigest := ComputeUploadIntentDigest(expiredIntent, domainSep)
	expSig, _ := crypto.Sign(expDigest, privKey)
	reqBodyExpired, _ := json.Marshal(UploadManifestRequest{
		Intent:    expiredIntent,
		Signature: "0x" + hex.EncodeToString(expSig),
		Manifest:  rawManifest,
	})
	respExpired, err := http.Post(ts.URL+"/v1/uploads/manifest", "application/json", bytes.NewReader(reqBodyExpired))
	if err != nil {
		t.Fatalf("failed request: %v", err)
	}
	if respExpired.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for expired deadline, got %d", respExpired.StatusCode)
	}
	respExpired.Body.Close()

	// C. Valid Upload -> 200 OK
	reqBodyValid, _ := json.Marshal(UploadManifestRequest{
		Intent:    intent,
		Signature: sigHex,
		Manifest:  rawManifest,
	})
	respValid, err := http.Post(ts.URL+"/v1/uploads/manifest", "application/json", bytes.NewReader(reqBodyValid))
	if err != nil {
		t.Fatalf("failed valid request: %v", err)
	}
	defer respValid.Body.Close()

	if respValid.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", respValid.StatusCode)
	}

	var uploadResp UploadManifestResponse
	if err := json.NewDecoder(respValid.Body).Decode(&uploadResp); err != nil {
		t.Fatalf("failed to decode upload response: %v", err)
	}
	if uploadResp.CID != mockPinner.NextCID {
		t.Fatalf("expected CID %s, got %s", mockPinner.NextCID, uploadResp.CID)
	}
	if uploadResp.URI != "ipfs://"+mockPinner.NextCID {
		t.Fatalf("expected URI ipfs://%s, got %s", mockPinner.NextCID, uploadResp.URI)
	}

	// D. Replay identical request -> 409 Conflict
	respReplay, err := http.Post(ts.URL+"/v1/uploads/manifest", "application/json", bytes.NewReader(reqBodyValid))
	if err != nil {
		t.Fatalf("failed replay request: %v", err)
	}
	defer respReplay.Body.Close()

	if respReplay.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 Conflict on replay, got %d", respReplay.StatusCode)
	}
}

func TestServer_CORS_Preflight(t *testing.T) {
	srv, _, _, _ := setupTestServer(t)
	ts := httptest.NewServer(srv.Routes())
	defer ts.Close()

	req, err := http.NewRequest(http.MethodOptions, ts.URL+"/v1/uploads/manifest", nil)
	if err != nil {
		t.Fatalf("failed to create OPTIONS request: %v", err)
	}
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "POST")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("failed OPTIONS request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 No Content for OPTIONS, got %d", resp.StatusCode)
	}
	allowOrigin := resp.Header.Get("Access-Control-Allow-Origin")
	if allowOrigin != "http://localhost:5173" && allowOrigin != "*" {
		t.Fatalf("unexpected CORS allow origin: %s", allowOrigin)
	}
}
