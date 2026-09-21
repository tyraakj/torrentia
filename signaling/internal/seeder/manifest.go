package seeder

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var (
	ErrEmptyManifest       = errors.New("manifest contains zero chunks")
	ErrNonContiguousChunks = errors.New("chunk indices are not contiguous from 0")
	ErrTotalSizeMismatch   = errors.New("sum of chunk sizes does not equal manifest totalSize")
	ErrInvalidChunkHash    = errors.New("invalid chunk SHA-256 hash format")
	ErrManifestNotFound    = errors.New("manifest could not be retrieved from any configured IPFS gateway")
)

// ChunkEntry defines a single content-addressed 1 MB slice.
type ChunkEntry struct {
	Index uint32 `json:"index"`
	Hash  string `json:"hash"` // 64-char hex SHA-256
	Size  uint64 `json:"size"` // size in bytes
}

// ChunkManifest defines the full model passport pinned on IPFS.
type ChunkManifest struct {
	ModelID   string       `json:"modelId"`
	Chunks    []ChunkEntry `json:"chunks"`
	TotalSize uint64       `json:"totalSize"`
	ModelCard string       `json:"modelCard,omitempty"`
}

// ValidateManifest asserts schema correctness and chunk integrity rules.
func ValidateManifest(m *ChunkManifest) error {
	if m == nil {
		return errors.New("nil manifest")
	}
	if len(m.Chunks) == 0 {
		return ErrEmptyManifest
	}

	var computedTotal uint64
	for i, chunk := range m.Chunks {
		if chunk.Index != uint32(i) {
			return ErrNonContiguousChunks
		}

		cleanHash := strings.ToLower(strings.TrimPrefix(chunk.Hash, "0x"))
		if len(cleanHash) != 64 {
			return fmt.Errorf("%w: chunk %d has length %d", ErrInvalidChunkHash, i, len(cleanHash))
		}
		for _, r := range cleanHash {
			if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f')) {
				return fmt.Errorf("%w: chunk %d contains non-hex chars", ErrInvalidChunkHash, i)
			}
		}

		if chunk.Size == 0 {
			return fmt.Errorf("chunk %d has zero size", i)
		}

		computedTotal += chunk.Size
	}

	if computedTotal != m.TotalSize {
		return ErrTotalSizeMismatch
	}

	return nil
}

// FetchManifest queries IPFS gateways sequentially or returns error if all fail.
func FetchManifest(ctx context.Context, cid string, gateways []string) (*ChunkManifest, error) {
	cleanCID := strings.TrimSpace(cid)
	cleanCID = strings.TrimPrefix(cleanCID, "ipfs://")

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	var lastErr error
	for _, gw := range gateways {
		gwURL := strings.TrimSuffix(gw, "/") + "/" + cleanCID

		req, err := http.NewRequestWithContext(ctx, "GET", gwURL, nil)
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			lastErr = fmt.Errorf("gateway %s returned status %d", gw, resp.StatusCode)
			continue
		}

		body, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024)) // 10MB limit
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}

		var manifest ChunkManifest
		if err := json.Unmarshal(body, &manifest); err != nil {
			lastErr = fmt.Errorf("unmarshal manifest from %s: %w", gw, err)
			continue
		}

		if err := ValidateManifest(&manifest); err != nil {
			lastErr = fmt.Errorf("validate manifest from %s: %w", gw, err)
			continue
		}

		return &manifest, nil
	}

	if lastErr != nil {
		return nil, fmt.Errorf("%w: %v", ErrManifestNotFound, lastErr)
	}
	return nil, ErrManifestNotFound
}
