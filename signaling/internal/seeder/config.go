package seeder

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// HTTPOptions defines configuration for the authenticated HTTP/QUIC chunk endpoint.
type HTTPOptions struct {
	Enabled   bool   `json:"enabled"`
	Port      int    `json:"port"`
	PublicURL string `json:"publicUrl"`
}

// QuotaLimits defines storage and bandwidth restrictions for the node.
type QuotaLimits struct {
	MaxStorageBytes               uint64 `json:"maxStorageBytes"`
	MaxUploadBandwidthBytesPerSec uint64 `json:"maxUploadBandwidthBytesPerSec"`
	MaxConcurrentPeers            int    `json:"maxConcurrentPeers"`
}

// Config defines the complete persistent seeder node configuration.
type Config struct {
	Version               int         `json:"version"`
	DataDir               string      `json:"dataDir"`
	SeederAddress         string      `json:"seederAddress"`
	SignalingURL          string      `json:"signalingUrl"`
	MonadRPCURL           string      `json:"monadRpcUrl"`
	ChainID               int64       `json:"chainId"`
	SplitPaymentContract  string      `json:"splitPaymentContract"`
	ModelRegistryContract string      `json:"modelRegistryContract"`
	HTTPEndpoint          HTTPOptions `json:"httpEndpoint"`
	Limits                QuotaLimits `json:"limits"`
	IPFSGateways          []string    `json:"ipfsGateways"`
	RedisURL              string      `json:"-"`
}

// DefaultConfig returns the production-ready default configuration for Monad Testnet.
func DefaultConfig() *Config {
	homeDir, err := os.UserHomeDir()
	dataDir := "./torrentia-data"
	if err == nil {
		dataDir = filepath.Join(homeDir, ".torrentia-seeder", "data")
	}

	return &Config{
		Version:               1,
		DataDir:               dataDir,
		SeederAddress:         "",
		SignalingURL:          "ws://localhost:8081/ws",
		MonadRPCURL:           "https://testnet-rpc.monad.xyz",
		ChainID:               10143,
		SplitPaymentContract:  "0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa",
		ModelRegistryContract: "0xe2cEDee4817B11716728aed3C3d7AD0438813340",
		HTTPEndpoint: HTTPOptions{
			Enabled:   true,
			Port:      9090,
			PublicURL: "http://127.0.0.1:9090",
		},
		Limits: QuotaLimits{
			MaxStorageBytes:               100 * 1024 * 1024 * 1024, // 100 GB
			MaxUploadBandwidthBytesPerSec: 20 * 1024 * 1024,         // 20 MB/s
			MaxConcurrentPeers:            32,
		},
		IPFSGateways: []string{
			"https://gateway.pinata.cloud/ipfs/",
			"https://ipfs.io/ipfs/",
			"https://cloudflare-ipfs.com/ipfs/",
		},
	}
}

// Validate checks whether the configuration is well-formed.
func (c *Config) Validate() error {
	if c.SeederAddress == "" {
		return errors.New("seederAddress is required")
	}
	if !strings.HasPrefix(c.SeederAddress, "0x") || len(c.SeederAddress) != 42 {
		return fmt.Errorf("invalid seederAddress: %s (must be 42-char 0x-prefixed hex address)", c.SeederAddress)
	}
	if c.SignalingURL == "" {
		return errors.New("signalingUrl is required")
	}
	if c.MonadRPCURL == "" {
		return errors.New("monadRpcUrl is required")
	}
	if c.SplitPaymentContract == "" {
		return errors.New("splitPaymentContract is required")
	}
	if c.ModelRegistryContract == "" {
		return errors.New("modelRegistryContract is required")
	}
	if c.DataDir == "" {
		return errors.New("dataDir is required")
	}
	return nil
}

// LoadConfig reads and parses a JSON config file.
func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config file: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config json: %w", err)
	}

	return &cfg, nil
}

// SaveConfig writes the configuration to disk with 0600 permissions.
func SaveConfig(path string, cfg *Config) error {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config json: %w", err)
	}

	tmpFile := fmt.Sprintf("%s.tmp.%d", path, os.Getpid())
	if err := os.WriteFile(tmpFile, data, 0600); err != nil {
		return fmt.Errorf("write temp config: %w", err)
	}

	if err := os.Rename(tmpFile, path); err != nil {
		_ = os.Remove(tmpFile)
		return fmt.Errorf("rename config file: %w", err)
	}

	return nil
}
