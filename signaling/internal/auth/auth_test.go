package auth_test

import (
	"encoding/hex"
	"strings"
	"testing"
	"time"

	"torrentia/signaling/internal/auth"

	"github.com/ethereum/go-ethereum/crypto"
)

func TestChallengeLifecycle(t *testing.T) {
	store := auth.NewMemoryChallengeStore()

	// Generate a test private key
	privKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	address := crypto.PubkeyToAddress(privKey.PublicKey).Hex()

	// 1. Create challenge
	ch, err := store.CreateChallenge(address)
	if err != nil {
		t.Fatalf("CreateChallenge failed: %v", err)
	}

	if ch.Address != address {
		t.Errorf("expected address %s, got %s", address, ch.Address)
	}
	if len(ch.Nonce) != 64 {
		t.Errorf("expected 64-char hex nonce, got length %d", len(ch.Nonce))
	}
	if !strings.Contains(ch.Message, ch.Nonce) {
		t.Errorf("expected message to contain nonce %s", ch.Nonce)
	}

	// 2. Get challenge (case insensitive)
	chGet, err := store.GetChallenge(strings.ToLower(address))
	if err != nil {
		t.Fatalf("GetChallenge failed: %v", err)
	}
	if chGet.Nonce != ch.Nonce {
		t.Errorf("expected nonce %s, got %s", ch.Nonce, chGet.Nonce)
	}

	// 3. Sign the challenge message using private key
	digest := auth.ComputePersonalSignHash(ch.Message)
	sig, err := crypto.Sign(digest, privKey)
	if err != nil {
		t.Fatalf("crypto.Sign failed: %v", err)
	}
	sigHex := "0x" + hex.EncodeToString(sig)

	// 4. Verify signature recovery
	err = auth.VerifySignature(ch.Message, sigHex, address)
	if err != nil {
		t.Fatalf("VerifySignature failed: %v", err)
	}

	// Mismatched address check
	otherPrivKey, _ := crypto.GenerateKey()
	otherAddr := crypto.PubkeyToAddress(otherPrivKey.PublicKey).Hex()
	if err := auth.VerifySignature(ch.Message, sigHex, otherAddr); err == nil {
		t.Errorf("expected verification to fail with mismatched address")
	}

	// Tampered message check
	if err := auth.VerifySignature(ch.Message+"tampered", sigHex, address); err == nil {
		t.Errorf("expected verification to fail with tampered message")
	}

	// 5. Consume challenge (single-use)
	consumed, err := store.ConsumeChallenge(address)
	if err != nil {
		t.Fatalf("ConsumeChallenge failed: %v", err)
	}
	if consumed.Nonce != ch.Nonce {
		t.Errorf("expected consumed nonce %s, got %s", ch.Nonce, consumed.Nonce)
	}

	// 6. Nonce replay prevention: second consume fails
	_, err = store.ConsumeChallenge(address)
	if err == nil {
		t.Errorf("expected second consume to fail (replay protection)")
	}
}

func TestSessionToken(t *testing.T) {
	secret := []byte("torrentia-super-secret-hmac-key-12345")
	address := "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"

	token, peerID, expiresAt, err := auth.GenerateSessionToken(address, secret)
	if err != nil {
		t.Fatalf("GenerateSessionToken failed: %v", err)
	}

	if token == "" || peerID == "" || expiresAt <= time.Now().Unix() {
		t.Fatalf("invalid generated token parameters: token=%s, peerID=%s, exp=%d", token, peerID, expiresAt)
	}

	// Verify valid token
	claims, err := auth.VerifySessionToken(token, secret)
	if err != nil {
		t.Fatalf("VerifySessionToken failed: %v", err)
	}

	if claims.Address != address {
		t.Errorf("expected address %s, got %s", address, claims.Address)
	}
	if claims.PeerID != peerID {
		t.Errorf("expected peerID %s, got %s", peerID, claims.PeerID)
	}

	// Wrong secret verification fails
	wrongSecret := []byte("different-secret-key")
	if _, err := auth.VerifySessionToken(token, wrongSecret); err == nil {
		t.Errorf("expected verification to fail with wrong secret")
	}

	// Tampered token fails
	tamperedToken := token + "bad"
	if _, err := auth.VerifySessionToken(tamperedToken, secret); err == nil {
		t.Errorf("expected verification to fail with tampered token")
	}
}
