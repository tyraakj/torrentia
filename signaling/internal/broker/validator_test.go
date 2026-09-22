package broker

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"
)

func TestValidateManifest_Success(t *testing.T) {
	manifest := ChunkManifest{
		ModelID:   "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
		ModelName: "test-model",
		TotalSize: 2097152,
		Chunks: []ChunkMetadata{
			{
				Index: 0,
				Size:  1048576,
				Hash:  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			},
			{
				Index: 1,
				Size:  1048576,
				Hash:  "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
			},
		},
	}

	rawJSON, err := json.Marshal(manifest)
	if err != nil {
		t.Fatalf("failed to marshal manifest: %v", err)
	}

	rawHash := sha256.Sum256(rawJSON)
	rawHashHex := hex.EncodeToString(rawHash[:])

	intent := UploadIntent{
		ModelID:      manifest.ModelID,
		TotalSize:    2097152,
		ChunkCount:   2,
		ManifestHash: "0x" + rawHashHex,
	}

	if err := ValidateManifest(rawJSON, manifest, intent, 5*1024*1024); err != nil {
		t.Fatalf("expected valid manifest, got: %v", err)
	}
}

func TestValidateManifest_Failures(t *testing.T) {
	manifest := ChunkManifest{
		ModelID:   "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
		ModelName: "test-model",
		TotalSize: 2048,
		Chunks: []ChunkMetadata{
			{
				Index: 0,
				Size:  1024,
				Hash:  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			},
			{
				Index: 1,
				Size:  1024,
				Hash:  "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
			},
		},
	}

	rawJSON, err := json.Marshal(manifest)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}
	rawHash := sha256.Sum256(rawJSON)
	rawHashHex := "0x" + hex.EncodeToString(rawHash[:])

	baseIntent := UploadIntent{
		ModelID:      manifest.ModelID,
		TotalSize:    2048,
		ChunkCount:   2,
		ManifestHash: rawHashHex,
	}

	// 1. Max size exceeded
	if err := ValidateManifest(rawJSON, manifest, baseIntent, 10); err == nil {
		t.Fatal("expected error on size exceeding limit")
	}

	// 2. Hash mismatch
	badHashIntent := baseIntent
	badHashIntent.ManifestHash = "0x0000000000000000000000000000000000000000000000000000000000000000"
	if err := ValidateManifest(rawJSON, manifest, badHashIntent, 5*1024*1024); err == nil {
		t.Fatal("expected error on hash mismatch")
	}

	// 3. Chunk count mismatch
	badCountIntent := baseIntent
	badCountIntent.ChunkCount = 5
	if err := ValidateManifest(rawJSON, manifest, badCountIntent, 5*1024*1024); err == nil {
		t.Fatal("expected error on chunk count mismatch")
	}

	// 4. Non-contiguous indices
	badIndicesManifest := manifest
	badIndicesManifest.Chunks = []ChunkMetadata{
		{Index: 0, Size: 1024, Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
		{Index: 2, Size: 1024, Hash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"}, // index 2 instead of 1
	}
	rawBadIndices, _ := json.Marshal(badIndicesManifest)
	h := sha256.Sum256(rawBadIndices)
	intentNonContig := baseIntent
	intentNonContig.ManifestHash = "0x" + hex.EncodeToString(h[:])
	if err := ValidateManifest(rawBadIndices, badIndicesManifest, intentNonContig, 5*1024*1024); err == nil {
		t.Fatal("expected error on non-contiguous chunk index")
	}

	// 5. Zero size chunk
	badZeroManifest := manifest
	badZeroManifest.Chunks = []ChunkMetadata{
		{Index: 0, Size: 0, Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
		{Index: 1, Size: 2048, Hash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"},
	}
	rawZero, _ := json.Marshal(badZeroManifest)
	hz := sha256.Sum256(rawZero)
	intentZero := baseIntent
	intentZero.ManifestHash = "0x" + hex.EncodeToString(hz[:])
	if err := ValidateManifest(rawZero, badZeroManifest, intentZero, 5*1024*1024); err == nil {
		t.Fatal("expected error on zero size chunk")
	}

	// 6. Invalid SHA-256 hex string
	badHashChunkManifest := manifest
	badHashChunkManifest.Chunks = []ChunkMetadata{
		{Index: 0, Size: 1024, Hash: "invalid-hash-too-short"},
		{Index: 1, Size: 1024, Hash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"},
	}
	rawBadChunkHash, _ := json.Marshal(badHashChunkManifest)
	hbch := sha256.Sum256(rawBadChunkHash)
	intentBadChunkHash := baseIntent
	intentBadChunkHash.ManifestHash = "0x" + hex.EncodeToString(hbch[:])
	if err := ValidateManifest(rawBadChunkHash, badHashChunkManifest, intentBadChunkHash, 5*1024*1024); err == nil {
		t.Fatal("expected error on invalid chunk hash format")
	}

	// 7. Sum of chunk sizes != totalSize
	badSumManifest := manifest
	badSumManifest.Chunks = []ChunkMetadata{
		{Index: 0, Size: 1000, Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
		{Index: 1, Size: 1000, Hash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"}, // sum = 2000, but intent says 2048
	}
	rawBadSum, _ := json.Marshal(badSumManifest)
	hbs := sha256.Sum256(rawBadSum)
	intentBadSum := baseIntent
	intentBadSum.ManifestHash = "0x" + hex.EncodeToString(hbs[:])
	if err := ValidateManifest(rawBadSum, badSumManifest, intentBadSum, 5*1024*1024); err == nil {
		t.Fatal("expected error on chunk size sum mismatch")
	}
}
