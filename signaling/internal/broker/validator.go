package broker

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var sha256HexRegex = regexp.MustCompile(`^[a-f0-9]{64}$`)

// ChunkMetadata represents metadata for a single model weight chunk.
type ChunkMetadata struct {
	Index  uint32 `json:"index"`
	Offset uint64 `json:"offset,omitempty"`
	Size   uint32 `json:"size"`
	Hash   string `json:"hash"`
}

// ChunkManifest represents the off-chain blueprint of an AI model's chunked weights.
type ChunkManifest struct {
	ManifestVersion int             `json:"manifestVersion,omitempty"`
	ModelID         string          `json:"modelId"`
	ModelName       string          `json:"modelName,omitempty"`
	Chunks          []ChunkMetadata `json:"chunks"`
	TotalSize       uint64          `json:"totalSize"`
	ChunkSize       uint32          `json:"chunkSize,omitempty"`
	ModelCard       string          `json:"modelCard,omitempty"`
	CreatedAt       int64           `json:"createdAt,omitempty"`
}

// ValidateManifest enforces schema constraints, raw hash integrity, chunk contiguity,
// and arithmetic balance between the ChunkManifest and the signed UploadIntent.
func ValidateManifest(rawJSON []byte, manifest ChunkManifest, intent UploadIntent, maxManifestBytes int64) error {
	// 1. Raw byte size check (defaults to 5 MB if maxManifestBytes <= 0)
	if maxManifestBytes <= 0 {
		maxManifestBytes = 5 * 1024 * 1024
	}
	if int64(len(rawJSON)) > maxManifestBytes {
		return fmt.Errorf("manifest JSON size (%d bytes) exceeds maximum allowed size (%d bytes)", len(rawJSON), maxManifestBytes)
	}

	// 2. Hash of raw JSON must match intent.ManifestHash
	computedHash := sha256.Sum256(rawJSON)
	computedHashHex := hex.EncodeToString(computedHash[:])
	expectedHashHex := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(intent.ManifestHash)), "0x")
	if !strings.EqualFold(computedHashHex, expectedHashHex) {
		return fmt.Errorf("manifest SHA-256 mismatch: computed %s, intent declared %s", computedHashHex, expectedHashHex)
	}

	// 3. Model ID match check if manifest declares one
	if manifest.ModelID != "" && intent.ModelID != "" {
		mClean := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(manifest.ModelID)), "0x")
		iClean := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(intent.ModelID)), "0x")
		if mClean != iClean {
			return fmt.Errorf("manifest modelId (%s) does not match intent modelId (%s)", manifest.ModelID, intent.ModelID)
		}
	}

	// 4. Chunk count match
	if len(manifest.Chunks) != int(intent.ChunkCount) {
		return fmt.Errorf("chunk count mismatch: manifest contains %d chunks, intent declared %d", len(manifest.Chunks), intent.ChunkCount)
	}

	if len(manifest.Chunks) == 0 {
		return errors.New("manifest must contain at least 1 chunk")
	}

	// 5. Contiguity and chunk math check
	var accumulatedSize uint64
	for i, chunk := range manifest.Chunks {
		if chunk.Index != uint32(i) {
			return fmt.Errorf("chunk index %d is not contiguous (expected index %d)", chunk.Index, i)
		}
		if chunk.Size == 0 {
			return fmt.Errorf("chunk at index %d has invalid zero size", i)
		}
		cleanHash := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(chunk.Hash)), "0x")
		if !sha256HexRegex.MatchString(cleanHash) {
			return fmt.Errorf("chunk at index %d has invalid SHA-256 hash: %s", i, chunk.Hash)
		}
		accumulatedSize += uint64(chunk.Size)
	}

	// 6. Total size equality
	if accumulatedSize != intent.TotalSize {
		return fmt.Errorf("sum of chunk sizes (%d bytes) does not match intent totalSize (%d bytes)", accumulatedSize, intent.TotalSize)
	}

	if manifest.TotalSize != 0 && manifest.TotalSize != intent.TotalSize {
		return fmt.Errorf("manifest totalSize (%d bytes) does not match intent totalSize (%d bytes)", manifest.TotalSize, intent.TotalSize)
	}

	return nil
}
