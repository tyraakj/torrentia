package broker

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds runtime configuration settings for the Upload Broker.
type Config struct {
	Port           int
	PinataJWT      string
	AllowedOrigins []string
	ChainID        int64
	NonceTTL       time.Duration
	RequestTimeout time.Duration
	MaxManifestMB  int64
}

// LoadConfigFromEnv reads configuration from environment variables with sensible defaults.
func LoadConfigFromEnv() (*Config, error) {
	port := 8082
	if pStr := os.Getenv("PORT"); pStr != "" {
		p, err := strconv.Atoi(pStr)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT value: %w", err)
		}
		port = p
	}

	chainID := int64(10143) // Monad Testnet default
	if cStr := os.Getenv("MONAD_CHAIN_ID"); cStr != "" {
		c, err := strconv.ParseInt(cStr, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid MONAD_CHAIN_ID value: %w", err)
		}
		chainID = c
	}

	origins := []string{"*"}
	if oStr := os.Getenv("ALLOWED_ORIGINS"); oStr != "" {
		parts := strings.Split(oStr, ",")
		origins = make([]string, 0, len(parts))
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
	}

	nonceTTL := 24 * time.Hour
	if ttlStr := os.Getenv("NONCE_TTL_HOURS"); ttlStr != "" {
		hours, err := strconv.Atoi(ttlStr)
		if err != nil {
			return nil, fmt.Errorf("invalid NONCE_TTL_HOURS value: %w", err)
		}
		nonceTTL = time.Duration(hours) * time.Hour
	}

	return &Config{
		Port:           port,
		PinataJWT:      os.Getenv("PINATA_JWT"),
		AllowedOrigins: origins,
		ChainID:        chainID,
		NonceTTL:       nonceTTL,
		RequestTimeout: 30 * time.Second,
		MaxManifestMB:  5,
	}, nil
}
