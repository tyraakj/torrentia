package broker

import (
	"testing"
	"time"
)

func TestMemoryNonceStore_ConsumeNonce(t *testing.T) {
	store := NewMemoryNonceStore(100 * time.Millisecond)
	defer store.Close()

	creator := "0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90"
	nonce1 := "1"
	nonce2 := "2"

	// 1. Empty creator or nonce
	if err := store.ConsumeNonce("", nonce1, time.Minute); err == nil {
		t.Fatal("expected error on empty creator")
	}
	if err := store.ConsumeNonce(creator, "", time.Minute); err == nil {
		t.Fatal("expected error on empty nonce")
	}

	// 2. Consume nonce1 successfully
	if err := store.ConsumeNonce(creator, nonce1, time.Hour); err != nil {
		t.Fatalf("expected successful nonce consumption, got %v", err)
	}

	// 3. Consume nonce1 again -> ErrNonceReused
	if err := store.ConsumeNonce(creator, nonce1, time.Hour); err != ErrNonceReused {
		t.Fatalf("expected ErrNonceReused, got %v", err)
	}

	// Case-insensitivity for creator address
	if err := store.ConsumeNonce("0x50bd6d079efc47afdf3ffe8a5387e7156b568b90", nonce1, time.Hour); err != ErrNonceReused {
		t.Fatalf("expected ErrNonceReused for lowercase creator, got %v", err)
	}

	// 4. Consume different nonce for same creator -> succeeds
	if err := store.ConsumeNonce(creator, nonce2, time.Hour); err != nil {
		t.Fatalf("expected successful nonce2 consumption, got %v", err)
	}

	// 5. Consume same nonce for different creator -> succeeds
	otherCreator := "0x1111111111111111111111111111111111111111"
	if err := store.ConsumeNonce(otherCreator, nonce1, time.Hour); err != nil {
		t.Fatalf("expected different creator with same nonce to succeed, got %v", err)
	}

	// 6. Expiration allows reuse after TTL
	shortTTL := 50 * time.Millisecond
	nonceExp := "999"
	if err := store.ConsumeNonce(creator, nonceExp, shortTTL); err != nil {
		t.Fatalf("failed initial consume: %v", err)
	}

	time.Sleep(70 * time.Millisecond)

	// Should succeed now because TTL has passed
	if err := store.ConsumeNonce(creator, nonceExp, time.Hour); err != nil {
		t.Fatalf("expected nonce to be reusable after expiration, got %v", err)
	}
}
