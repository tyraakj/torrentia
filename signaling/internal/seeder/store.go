package seeder

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	ErrHashMismatch   = errors.New("chunk SHA-256 hash mismatch")
	ErrChunkNotFound  = errors.New("chunk not found")
	ErrQuotaExceeded  = errors.New("storage quota exceeded")
	ErrInvalidModelID = errors.New("invalid model ID")
)

// Store provides thread-safe, content-addressed disk storage for verified chunks.
type Store struct {
	mu              sync.RWMutex
	dataDir         string
	maxStorageBytes uint64
}

// NewStore initializes a new chunk store rooted at dataDir.
func NewStore(dataDir string, maxStorageBytes uint64) *Store {
	return &Store{
		dataDir:         dataDir,
		maxStorageBytes: maxStorageBytes,
	}
}

// sanitizeModelID cleans the model ID to ensure safe directory paths.
func sanitizeModelID(modelID string) (string, error) {
	clean := strings.ToLower(strings.TrimSpace(modelID))
	clean = strings.TrimPrefix(clean, "0x")
	if len(clean) == 0 {
		return "", ErrInvalidModelID
	}
	// Verify hex
	for _, r := range clean {
		if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f')) {
			return "", ErrInvalidModelID
		}
	}
	return "0x" + clean, nil
}

func (s *Store) modelChunkDir(modelID string) (string, error) {
	cleanID, err := sanitizeModelID(modelID)
	if err != nil {
		return "", err
	}
	return filepath.Join(s.dataDir, "chunks", cleanID), nil
}

func (s *Store) chunkPath(modelID string, index uint32) (string, error) {
	dir, err := s.modelChunkDir(modelID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, fmt.Sprintf("%d.bin", index)), nil
}

// PutChunk validates the SHA-256 hash of data, verifies quota headroom, and writes atomically.
func (s *Store) PutChunk(modelID string, index uint32, data []byte, expectedHash string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Verify SHA-256 checksum
	h := sha256.Sum256(data)
	computedHash := hex.EncodeToString(h[:])
	cleanExpected := strings.ToLower(strings.TrimPrefix(expectedHash, "0x"))
	if computedHash != cleanExpected {
		return ErrHashMismatch
	}

	// 2. Check quota
	currentUsage, err := s.getDiskUsageLocked()
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("calculate storage usage: %w", err)
	}
	if s.maxStorageBytes > 0 && currentUsage+uint64(len(data)) > s.maxStorageBytes {
		return ErrQuotaExceeded
	}

	// 3. Ensure chunk directory exists
	dir, err := s.modelChunkDir(modelID)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create chunk directory: %w", err)
	}

	targetPath, err := s.chunkPath(modelID, index)
	if err != nil {
		return err
	}

	// 4. Write to temp file then atomic rename
	tmpPath := fmt.Sprintf("%s.tmp.%d.%d", targetPath, os.Getpid(), time.Now().UnixNano())
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return fmt.Errorf("write temp chunk: %w", err)
	}

	if err := os.Rename(tmpPath, targetPath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("rename chunk file: %w", err)
	}

	return nil
}

// GetChunk retrieves the raw binary chunk data from disk.
func (s *Store) GetChunk(modelID string, index uint32) ([]byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	targetPath, err := s.chunkPath(modelID, index)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(targetPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrChunkNotFound
		}
		return nil, fmt.Errorf("read chunk: %w", err)
	}

	return data, nil
}

// HasChunk returns true if the chunk exists on disk.
func (s *Store) HasChunk(modelID string, index uint32) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	targetPath, err := s.chunkPath(modelID, index)
	if err != nil {
		return false
	}

	info, err := os.Stat(targetPath)
	return err == nil && !info.IsDir()
}

// GetHeldChunks scans the model's chunk directory and returns sorted chunk indices.
func (s *Store) GetHeldChunks(modelID string) ([]uint32, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dir, err := s.modelChunkDir(modelID)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []uint32{}, nil
		}
		return nil, fmt.Errorf("read chunk directory: %w", err)
	}

	var indices []uint32
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".bin") {
			continue
		}
		idxStr := strings.TrimSuffix(name, ".bin")
		idx, err := strconv.ParseUint(idxStr, 10, 32)
		if err == nil {
			indices = append(indices, uint32(idx))
		}
	}

	sort.Slice(indices, func(i, j int) bool {
		return indices[i] < indices[j]
	})

	return indices, nil
}

// DeleteModel removes all stored chunk files for a given model.
func (s *Store) DeleteModel(modelID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir, err := s.modelChunkDir(modelID)
	if err != nil {
		return err
	}

	if err := os.RemoveAll(dir); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete model chunks: %w", err)
	}
	return nil
}

// GetTotalUsedBytes calculates total bytes stored across all models.
func (s *Store) GetTotalUsedBytes() (uint64, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.getDiskUsageLocked()
}

func (s *Store) getDiskUsageLocked() (uint64, error) {
	chunksRoot := filepath.Join(s.dataDir, "chunks")
	var totalBytes uint64

	err := filepath.Walk(chunksRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if os.IsNotExist(err) {
				return nil
			}
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".bin") {
			totalBytes += uint64(info.Size())
		}
		return nil
	})

	return totalBytes, err
}

// OpenChunkFile opens a file handle for zero-copy streaming.
func (s *Store) OpenChunkFile(modelID string, index uint32) (*os.File, os.FileInfo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	targetPath, err := s.chunkPath(modelID, index)
	if err != nil {
		return nil, nil, err
	}

	f, err := os.Open(targetPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil, ErrChunkNotFound
		}
		return nil, nil, err
	}

	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, nil, err
	}

	return f, info, nil
}
