package broker

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

var (
	// EIP712DomainTypeHash is keccak256("EIP712Domain(string name,string version,uint256 chainId)")
	EIP712DomainTypeHash = crypto.Keccak256([]byte(
		"EIP712Domain(string name,string version,uint256 chainId)",
	))

	// UploadIntentTypeHash is keccak256("UploadIntent(address creator,bytes32 modelId,uint64 totalSize,uint32 chunkCount,bytes32 manifestHash,uint256 nonce,uint256 deadline)")
	UploadIntentTypeHash = crypto.Keccak256([]byte(
		"UploadIntent(address creator,bytes32 modelId,uint64 totalSize,uint32 chunkCount,bytes32 manifestHash,uint256 nonce,uint256 deadline)",
	))
)

// UploadIntent represents a cryptographically authorized upload request.
type UploadIntent struct {
	Creator      string   `json:"creator"`
	ModelID      string   `json:"modelId"`
	TotalSize    uint64   `json:"totalSize"`
	ChunkCount   uint32   `json:"chunkCount"`
	ManifestHash string   `json:"manifestHash"` // SHA-256 hex of canonical manifest
	Nonce        *big.Int `json:"nonce"`
	Deadline     int64    `json:"deadline"`
}

// UnmarshalJSON implements custom deserialization for UploadIntent to support
// nonce supplied as numeric or string.
func (u *UploadIntent) UnmarshalJSON(data []byte) error {
	type Alias struct {
		Creator      string          `json:"creator"`
		ModelID      string          `json:"modelId"`
		TotalSize    uint64          `json:"totalSize"`
		ChunkCount   uint32          `json:"chunkCount"`
		ManifestHash string          `json:"manifestHash"`
		Nonce        json.RawMessage `json:"nonce"`
		Deadline     int64           `json:"deadline"`
	}

	var aux Alias
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	u.Creator = aux.Creator
	u.ModelID = aux.ModelID
	u.TotalSize = aux.TotalSize
	u.ChunkCount = aux.ChunkCount
	u.ManifestHash = aux.ManifestHash
	u.Deadline = aux.Deadline

	if len(aux.Nonce) > 0 {
		var nonceStr string
		if err := json.Unmarshal(aux.Nonce, &nonceStr); err == nil {
			n, ok := new(big.Int).SetString(nonceStr, 10)
			if !ok {
				return fmt.Errorf("invalid nonce string value: %s", nonceStr)
			}
			u.Nonce = n
		} else {
			var nonceUint uint64
			if err := json.Unmarshal(aux.Nonce, &nonceUint); err == nil {
				u.Nonce = new(big.Int).SetUint64(nonceUint)
			} else {
				return fmt.Errorf("invalid nonce format: %s", string(aux.Nonce))
			}
		}
	} else {
		u.Nonce = big.NewInt(0)
	}

	return nil
}

// ComputeDomainSeparator calculates the EIP-712 domain separator hash.
func ComputeDomainSeparator(name, version string, chainID int64) []byte {
	return crypto.Keccak256(
		EIP712DomainTypeHash,
		crypto.Keccak256([]byte(name)),
		crypto.Keccak256([]byte(version)),
		common.BigToHash(big.NewInt(chainID)).Bytes(),
	)
}

// ComputeUploadIntentDigest hashes an UploadIntent with the given domain separator.
func ComputeUploadIntentDigest(intent UploadIntent, domainSeparator []byte) []byte {
	creatorAddr := common.HexToAddress(intent.Creator)
	modelIDBytes := common.HexToHash(intent.ModelID)
	manifestHashBytes := common.HexToHash(intent.ManifestHash)

	nonceVal := intent.Nonce
	if nonceVal == nil {
		nonceVal = big.NewInt(0)
	}

	structHash := crypto.Keccak256(
		UploadIntentTypeHash,
		common.LeftPadBytes(creatorAddr.Bytes(), 32),
		modelIDBytes.Bytes(),
		common.BigToHash(new(big.Int).SetUint64(intent.TotalSize)).Bytes(),
		common.BigToHash(big.NewInt(int64(intent.ChunkCount))).Bytes(),
		manifestHashBytes.Bytes(),
		common.BigToHash(nonceVal).Bytes(),
		common.BigToHash(big.NewInt(intent.Deadline)).Bytes(),
	)

	return crypto.Keccak256(
		[]byte("\x19\x01"),
		domainSeparator,
		structHash,
	)
}

// VerifyUploadIntent verifies the EIP-712 signature against the declared creator address.
func VerifyUploadIntent(intent UploadIntent, signatureHex string, domainSeparator []byte) (common.Address, error) {
	if intent.Creator == "" {
		return common.Address{}, errors.New("creator address is empty")
	}

	if time.Now().Unix() > intent.Deadline {
		return common.Address{}, errors.New("upload intent expired")
	}

	digest := ComputeUploadIntentDigest(intent, domainSeparator)

	sig, err := hex.DecodeString(strings.TrimPrefix(signatureHex, "0x"))
	if err != nil || len(sig) != 65 {
		return common.Address{}, errors.New("invalid signature encoding or length: must be 65 bytes")
	}

	// Transform V from 27/28 to 0/1 for secp256k1 recovery if necessary
	sigCopy := make([]byte, 65)
	copy(sigCopy, sig)
	if sigCopy[64] >= 27 {
		sigCopy[64] -= 27
	}

	pubKey, err := crypto.SigToPub(digest, sigCopy)
	if err != nil {
		return common.Address{}, fmt.Errorf("failed to recover signer: %w", err)
	}

	recovered := crypto.PubkeyToAddress(*pubKey)
	if !strings.EqualFold(recovered.Hex(), intent.Creator) {
		return common.Address{}, fmt.Errorf("signer %s does not match creator %s", recovered.Hex(), intent.Creator)
	}

	return recovered, nil
}
