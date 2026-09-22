package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

const (
	ChallengeTTL = 2 * time.Minute
	ChainID      = 10143 // Monad Testnet
)

// Challenge represents an authentication challenge issued to a wallet.
type Challenge struct {
	Nonce     string `json:"nonce"`
	Address   string `json:"address"`
	ExpiresAt int64  `json:"expiresAt"`
	Message   string `json:"message"`
}

// ChallengeStore tracks active challenges and handles single-use consumption.
type ChallengeStore interface {
	CreateChallenge(address string) (*Challenge, error)
	GetChallenge(address string) (*Challenge, error)
	ConsumeChallenge(address string) (*Challenge, error)
}

// MemoryChallengeStore is an in-memory, thread-safe implementation of ChallengeStore.
type MemoryChallengeStore struct {
	mu         sync.Mutex
	challenges map[string]*Challenge // normalized lowercase address -> challenge
}

// NewMemoryChallengeStore creates an initialized MemoryChallengeStore.
func NewMemoryChallengeStore() *MemoryChallengeStore {
	store := &MemoryChallengeStore{
		challenges: make(map[string]*Challenge),
	}
	return store
}

// FormatChallengeMessage creates the standard EIP-191 message to be signed.
func FormatChallengeMessage(chainID int, address, nonce string, expiresAt int64) string {
	return fmt.Sprintf("Torrentia Session Authentication\nChain ID: %d\nAddress: %s\nNonce: %s\nExpires: %d",
		chainID, address, nonce, expiresAt)
}

// CreateChallenge generates a cryptographically random 32-byte hex nonce with a 2-minute TTL.
func (s *MemoryChallengeStore) CreateChallenge(address string) (*Challenge, error) {
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

	s.mu.Lock()
	defer s.mu.Unlock()

	s.cleanExpiredLocked()
	s.challenges[strings.ToLower(normAddr)] = ch

	return ch, nil
}

// GetChallenge retrieves the active challenge for an address without consuming it.
func (s *MemoryChallengeStore) GetChallenge(address string) (*Challenge, error) {
	if !common.IsHexAddress(address) {
		return nil, errors.New("invalid ethereum address format")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	key := strings.ToLower(common.HexToAddress(address).Hex())
	ch, ok := s.challenges[key]
	if !ok {
		return nil, errors.New("challenge not found")
	}

	if time.Now().Unix() > ch.ExpiresAt {
		delete(s.challenges, key)
		return nil, errors.New("challenge expired")
	}

	return ch, nil
}

// ConsumeChallenge retrieves and deletes the challenge to prevent signature replay.
func (s *MemoryChallengeStore) ConsumeChallenge(address string) (*Challenge, error) {
	if !common.IsHexAddress(address) {
		return nil, errors.New("invalid ethereum address format")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	key := strings.ToLower(common.HexToAddress(address).Hex())
	ch, ok := s.challenges[key]
	if !ok {
		return nil, errors.New("challenge not found")
	}

	delete(s.challenges, key)

	if time.Now().Unix() > ch.ExpiresAt {
		return nil, errors.New("challenge expired")
	}

	return ch, nil
}

func (s *MemoryChallengeStore) cleanExpiredLocked() {
	now := time.Now().Unix()
	for addr, ch := range s.challenges {
		if now > ch.ExpiresAt {
			delete(s.challenges, addr)
		}
	}
}
