package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/redis/go-redis/v9"
)

// RedisChallengeStore stores and manages challenge nonces in Redis with atomic consumption.
type RedisChallengeStore struct {
	client *redis.Client
}

// NewRedisChallengeStore creates a new challenge store backed by Redis.
func NewRedisChallengeStore(client *redis.Client) *RedisChallengeStore {
	return &RedisChallengeStore{client: client}
}

// CreateChallenge generates a cryptographically random 32-byte hex nonce and stores it in Redis.
func (s *RedisChallengeStore) CreateChallenge(address string) (*Challenge, error) {
	if !common.IsHexAddress(address) {
		return nil, errors.New("invalid ethereum address format")
	}

	normAddr := common.HexToAddress(address).Hex()

	nonceBytes := make([]byte, 32)
	if _, err := rand.Read(nonceBytes); err != nil {
		return nil, fmt.Errorf("generate random nonce: %w", err)
	}
	nonce := hex.EncodeToString(nonceBytes)

	expiresAt := time.Now().Add(ChallengeTTL).Unix()
	msg := FormatChallengeMessage(ChainID, normAddr, nonce, expiresAt)

	ch := &Challenge{
		Nonce:     nonce,
		Address:   normAddr,
		ExpiresAt: expiresAt,
		Message:   msg,
	}

	rawJSON, err := json.Marshal(ch)
	if err != nil {
		return nil, fmt.Errorf("marshal challenge: %w", err)
	}

	key := fmt.Sprintf("auth:nonce:%s", strings.ToLower(normAddr))
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := s.client.Set(ctx, key, rawJSON, ChallengeTTL).Err(); err != nil {
		return nil, fmt.Errorf("redis set challenge: %w", err)
	}

	return ch, nil
}

// GetChallenge retrieves an active challenge from Redis without consuming it.
func (s *RedisChallengeStore) GetChallenge(address string) (*Challenge, error) {
	if !common.IsHexAddress(address) {
		return nil, errors.New("invalid ethereum address format")
	}

	normAddr := common.HexToAddress(address).Hex()
	key := fmt.Sprintf("auth:nonce:%s", strings.ToLower(normAddr))

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rawJSON, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, errors.New("challenge not found")
		}
		return nil, fmt.Errorf("redis get challenge: %w", err)
	}

	var ch Challenge
	if err := json.Unmarshal([]byte(rawJSON), &ch); err != nil {
		return nil, fmt.Errorf("unmarshal challenge: %w", err)
	}

	if time.Now().Unix() > ch.ExpiresAt {
		return nil, errors.New("challenge expired")
	}

	return &ch, nil
}

// Lua script to atomically get and delete a challenge to prevent replay attacks across replicas.
var consumeScript = redis.NewScript(`
local val = redis.call('GET', KEYS[1])
if val then
    redis.call('DEL', KEYS[1])
end
return val
`)

// ConsumeChallenge retrieves and deletes the challenge atomically to prevent signature replay.
func (s *RedisChallengeStore) ConsumeChallenge(address string) (*Challenge, error) {
	if !common.IsHexAddress(address) {
		return nil, errors.New("invalid ethereum address format")
	}

	normAddr := common.HexToAddress(address).Hex()
	key := fmt.Sprintf("auth:nonce:%s", strings.ToLower(normAddr))

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	res, err := consumeScript.Run(ctx, s.client, []string{key}).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, errors.New("challenge not found")
		}
		return nil, fmt.Errorf("redis consume challenge: %w", err)
	}

	if res == nil {
		return nil, errors.New("challenge not found")
	}

	rawJSON, ok := res.(string)
	if !ok || rawJSON == "" {
		return nil, errors.New("challenge not found")
	}

	var ch Challenge
	if err := json.Unmarshal([]byte(rawJSON), &ch); err != nil {
		return nil, fmt.Errorf("unmarshal challenge: %w", err)
	}

	if time.Now().Unix() > ch.ExpiresAt {
		return nil, errors.New("challenge expired")
	}

	return &ch, nil
}
