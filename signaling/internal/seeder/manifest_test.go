package seeder_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"torrentia/signaling/internal/seeder"
)

func TestManifest_ValidateAndFetch(t *testing.T) {
	manifest := seeder.ChunkManifest{
		ModelID:   "0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f",
		TotalSize: 2048,
		Chunks: []seeder.ChunkEntry{
			{Index: 0, Hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", Size: 1024},
			{Index: 1, Hash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789", Size: 1024},
		},
		ModelCard: "# Test Model",
	}

	// 1. Valid manifest
	if err := seeder.ValidateManifest(&manifest); err != nil {
		t.Fatalf("valid manifest failed validation: %v", err)
	}

	// 2. Non-contiguous index failure
	invalidManifest := manifest
	invalidManifest.Chunks = []seeder.ChunkEntry{
		{Index: 0, Hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", Size: 1024},
		{Index: 2, Hash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789", Size: 1024},
	}
	if err := seeder.ValidateManifest(&invalidManifest); err != seeder.ErrNonContiguousChunks {
		t.Fatalf("expected ErrNonContiguousChunks, got: %v", err)
	}

	// 3. Size mismatch failure
	invalidSize := manifest
	invalidSize.TotalSize = 9999
	if err := seeder.ValidateManifest(&invalidSize); err != seeder.ErrTotalSizeMismatch {
		t.Fatalf("expected ErrTotalSizeMismatch, got: %v", err)
	}

	// 4. Test HTTP fetcher across gateways
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(manifest)
	}))
	defer server.Close()

	fetched, err := seeder.FetchManifest(context.Background(), "bafkreitest", []string{server.URL + "/ipfs/"})
	if err != nil {
		t.Fatalf("failed to fetch manifest: %v", err)
	}
	if fetched.ModelID != manifest.ModelID || len(fetched.Chunks) != 2 {
		t.Fatalf("fetched manifest mismatch: %+v", fetched)
	}
}
