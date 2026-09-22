package broker

import (
	"encoding/hex"
	"encoding/json"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/crypto"
)

func TestVerifyUploadIntent_Success(t *testing.T) {
	// 1. Generate real ECDSA private key
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}

	creatorAddr := crypto.PubkeyToAddress(privateKey.PublicKey)
	domainSep := ComputeDomainSeparator("Torrentia Upload Broker", "1", 10143)

	intent := UploadIntent{
		Creator:      creatorAddr.Hex(),
		ModelID:      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
		TotalSize:    2097152, // 2 MB
		ChunkCount:   2,
		ManifestHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
		Nonce:        big.NewInt(1),
		Deadline:     time.Now().Unix() + 3600, // 1 hour in future
	}

	digest := ComputeUploadIntentDigest(intent, domainSep)
	sig, err := crypto.Sign(digest, privateKey)
	if err != nil {
		t.Fatalf("failed to sign: %v", err)
	}

	// In Ethereum, V is 0 or 1 from crypto.Sign, often serialized as 27 or 28
	sigHex := "0x" + hex.EncodeToString(sig)

	recovered, err := VerifyUploadIntent(intent, sigHex, domainSep)
	if err != nil {
		t.Fatalf("expected successful verification, got %v", err)
	}

	if recovered != creatorAddr {
		t.Fatalf("expected recovered address %s, got %s", creatorAddr.Hex(), recovered.Hex())
	}

	// Test with V + 27
	sigV27 := make([]byte, 65)
	copy(sigV27, sig)
	sigV27[64] += 27
	sigV27Hex := "0x" + hex.EncodeToString(sigV27)

	recovered27, err := VerifyUploadIntent(intent, sigV27Hex, domainSep)
	if err != nil {
		t.Fatalf("expected successful verification with V=27/28, got %v", err)
	}
	if recovered27 != creatorAddr {
		t.Fatalf("expected recovered address %s, got %s", creatorAddr.Hex(), recovered27.Hex())
	}
}

func TestVerifyUploadIntent_Failures(t *testing.T) {
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}

	creatorAddr := crypto.PubkeyToAddress(privateKey.PublicKey)
	domainSep := ComputeDomainSeparator("Torrentia Upload Broker", "1", 10143)

	intent := UploadIntent{
		Creator:      creatorAddr.Hex(),
		ModelID:      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
		TotalSize:    2097152,
		ChunkCount:   2,
		ManifestHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
		Nonce:        big.NewInt(1),
		Deadline:     time.Now().Unix() + 3600,
	}

	digest := ComputeUploadIntentDigest(intent, domainSep)
	sig, err := crypto.Sign(digest, privateKey)
	if err != nil {
		t.Fatalf("failed to sign: %v", err)
	}
	sigHex := "0x" + hex.EncodeToString(sig)

	// 1. Expired deadline
	expiredIntent := intent
	expiredIntent.Deadline = time.Now().Unix() - 100
	if _, err := VerifyUploadIntent(expiredIntent, sigHex, domainSep); err == nil {
		t.Fatal("expected error on expired intent")
	}

	// 2. Tampered field (e.g. TotalSize changed)
	tamperedIntent := intent
	tamperedIntent.TotalSize = 9999999
	if _, err := VerifyUploadIntent(tamperedIntent, sigHex, domainSep); err == nil {
		t.Fatal("expected error on tampered intent")
	}

	// 3. Mismatched creator address
	wrongCreatorIntent := intent
	wrongCreatorIntent.Creator = "0x0000000000000000000000000000000000000001"
	if _, err := VerifyUploadIntent(wrongCreatorIntent, sigHex, domainSep); err == nil {
		t.Fatal("expected error on mismatched creator")
	}

	// 4. Malformed signature
	if _, err := VerifyUploadIntent(intent, "0xbad", domainSep); err == nil {
		t.Fatal("expected error on bad signature format")
	}
}

func TestUploadIntent_JSONUnmarshal(t *testing.T) {
	// Nonce as string
	jsonStr := `{"creator":"0x123","modelId":"0x456","totalSize":100,"chunkCount":1,"manifestHash":"0x789","nonce":"42","deadline":1700000000}`
	var intent1 UploadIntent
	if err := json.Unmarshal([]byte(jsonStr), &intent1); err != nil {
		t.Fatalf("failed to unmarshal string nonce: %v", err)
	}
	if intent1.Nonce.Cmp(big.NewInt(42)) != 0 {
		t.Fatalf("expected nonce 42, got %v", intent1.Nonce)
	}

	// Nonce as number
	jsonNum := `{"creator":"0x123","modelId":"0x456","totalSize":100,"chunkCount":1,"manifestHash":"0x789","nonce":99,"deadline":1700000000}`
	var intent2 UploadIntent
	if err := json.Unmarshal([]byte(jsonNum), &intent2); err != nil {
		t.Fatalf("failed to unmarshal number nonce: %v", err)
	}
	if intent2.Nonce.Cmp(big.NewInt(99)) != 0 {
		t.Fatalf("expected nonce 99, got %v", intent2.Nonce)
	}
}
