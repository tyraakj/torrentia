package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

const (
	SessionTTL = 24 * time.Hour
)

// SessionClaims holds authenticated identity attributes.
type SessionClaims struct {
	PeerID    string `json:"peerId"`
	Address   string `json:"address"`
	ExpiresAt int64  `json:"expiresAt"`
}

// GeneratePeerID produces a random UUIDv4 string without external dependencies.
func GeneratePeerID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // Version 4
	b[8] = (b[8] & 0x3f) | 0x80 // RFC 4122 variant
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// GenerateSessionToken creates a signed HMAC-SHA256 token for the given address.
func GenerateSessionToken(address string, secret []byte) (token string, peerID string, expiresAt int64, err error) {
	if len(secret) == 0 {
		return "", "", 0, errors.New("empty auth secret")
	}
	if !common.IsHexAddress(address) {
		return "", "", 0, errors.New("invalid address")
	}

	normAddr := common.HexToAddress(address).Hex()
	peerID = GeneratePeerID()
	expiresAt = time.Now().Add(SessionTTL).Unix()

	claims := SessionClaims{
		PeerID:    peerID,
		Address:   normAddr,
		ExpiresAt: expiresAt,
	}

	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", "", 0, fmt.Errorf("marshal claims: %w", err)
	}

	payloadB64 := base64.RawURLEncoding.EncodeToString(claimsJSON)

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(payloadB64))
	sigB64 := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	token = payloadB64 + "." + sigB64
	return token, peerID, expiresAt, nil
}

// VerifySessionToken parses and cryptographically validates an HMAC-SHA256 session token.
func VerifySessionToken(token string, secret []byte) (*SessionClaims, error) {
	if len(secret) == 0 {
		return nil, errors.New("empty auth secret")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, errors.New("invalid token format (expected payload.signature)")
	}

	payloadB64, sigB64 := parts[0], parts[1]

	sig, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		return nil, errors.New("invalid token signature encoding")
	}

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(payloadB64))
	expectedSig := mac.Sum(nil)

	if !hmac.Equal(sig, expectedSig) {
		return nil, errors.New("invalid token signature")
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, errors.New("invalid token payload encoding")
	}

	var claims SessionClaims
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return nil, fmt.Errorf("unmarshal token claims: %w", err)
	}

	if time.Now().Unix() > claims.ExpiresAt {
		return nil, errors.New("token expired")
	}

	if !common.IsHexAddress(claims.Address) || claims.PeerID == "" {
		return nil, errors.New("token contains invalid identity claims")
	}

	claims.Address = common.HexToAddress(claims.Address).Hex()
	return &claims, nil
}
