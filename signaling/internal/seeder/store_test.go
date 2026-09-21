package seeder_test

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"
	"torrentia/signaling/internal/seeder"
)

func TestStore_PutGetAndVerifyHash(t *testing.T) {
	tmpDir := t.TempDir()
	store := seeder.NewStore(tmpDir, 10*1024*1024)

	modelID := "0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f"
	data := []byte("torrentia test chunk data 12345")
	h := sha256.Sum256(data)
	expectedHash := hex.EncodeToString(h[:])

	// Put chunk with valid hash
	err := store.PutChunk(modelID, 0, data, expectedHash)
	if err != nil {
		t.Fatalf("PutChunk failed: %v", err)
	}

	// Corrupt hash check: should fail with ErrHashMismatch
	err = store.PutChunk(modelID, 1, data, "0000000000000000000000000000000000000000000000000000000000000000")
	if err != seeder.ErrHashMismatch {
		t.Fatalf("expected ErrHashMismatch, got: %v", err)
	}

	// Get chunk 0
	retrieved, err := store.GetChunk(modelID, 0)
	if err != nil {
		t.Fatalf("GetChunk failed: %v", err)
	}
	if string(retrieved) != string(data) {
		t.Fatalf("chunk data mismatch: got %s, want %s", string(retrieved), string(data))
	}

	// Check HasChunk
	if !store.HasChunk(modelID, 0) {
		t.Fatalf("expected HasChunk to be true for index 0")
	}
	if store.HasChunk(modelID, 1) {
		t.Fatalf("expected HasChunk to be false for index 1")
	}

	// Put chunk 2
	data2 := []byte("torrentia test chunk 2")
	h2 := sha256.Sum256(data2)
	_ = store.PutChunk(modelID, 2, data2, hex.EncodeToString(h2[:]))

	// Check Held Chunks (should be sorted [0, 2])
	held, err := store.GetHeldChunks(modelID)
	if err != nil {
		t.Fatalf("GetHeldChunks failed: %v", err)
	}
	if len(held) != 2 || held[0] != 0 || held[1] != 2 {
		t.Fatalf("unexpected held chunks: %v", held)
	}

	// Check total size
	used, err := store.GetTotalUsedBytes()
	if err != nil {
		t.Fatalf("GetTotalUsedBytes failed: %v", err)
	}
	if used != uint64(len(data)+len(data2)) {
		t.Fatalf("unexpected used bytes: %d, expected %d", used, len(data)+len(data2))
	}

	// Delete model
	if err := store.DeleteModel(modelID); err != nil {
		t.Fatalf("DeleteModel failed: %v", err)
	}
	heldAfter, _ := store.GetHeldChunks(modelID)
	if len(heldAfter) != 0 {
		t.Fatalf("expected 0 held chunks after delete, got %d", len(heldAfter))
	}
}

func TestStore_QuotaEnforcement(t *testing.T) {
	tmpDir := t.TempDir()
	// Store with tiny quota: 20 bytes
	store := seeder.NewStore(tmpDir, 20)

	modelID := "0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f"
	data := []byte("12345678901234567890") // 20 bytes
	h := sha256.Sum256(data)
	err := store.PutChunk(modelID, 0, data, hex.EncodeToString(h[:]))
	if err != nil {
		t.Fatalf("PutChunk within quota failed: %v", err)
	}

	// Next chunk exceeds quota
	data2 := []byte("overflow")
	h2 := sha256.Sum256(data2)
	err = store.PutChunk(modelID, 1, data2, hex.EncodeToString(h2[:]))
	if err != seeder.ErrQuotaExceeded {
		t.Fatalf("expected ErrQuotaExceeded, got: %v", err)
	}
}
