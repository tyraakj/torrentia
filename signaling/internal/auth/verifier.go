package auth

import (
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// ComputePersonalSignHash calculates the EIP-191 personal_sign digest:
// keccak256("\x19Ethereum Signed Message:\n" + len(msg) + msg)
func ComputePersonalSignHash(message string) []byte {
	prefix := "\x19Ethereum Signed Message:\n" + strconv.Itoa(len(message))
	return crypto.Keccak256([]byte(prefix + message))
}

// RecoverSigner extracts the Ethereum address that signed the personal_sign message.
func RecoverSigner(message, signatureHex string) (common.Address, error) {
	sigBytes, err := hex.DecodeString(strings.TrimPrefix(signatureHex, "0x"))
	if err != nil {
		return common.Address{}, fmt.Errorf("invalid hex signature: %w", err)
	}

	if len(sigBytes) != 65 {
		return common.Address{}, fmt.Errorf("invalid signature length: expected 65 bytes, got %d", len(sigBytes))
	}

	// Normalise V byte (27/28 -> 0/1 for secp256k1 recovery)
	if sigBytes[64] >= 27 {
		sigBytes[64] -= 27
	}
	if sigBytes[64] != 0 && sigBytes[64] != 1 {
		return common.Address{}, errors.New("invalid signature V byte (expected 0, 1, 27, or 28)")
	}

	digest := ComputePersonalSignHash(message)
	pubKey, err := crypto.SigToPub(digest, sigBytes)
	if err != nil {
		return common.Address{}, fmt.Errorf("secp256k1 signature recovery failed: %w", err)
	}

	return crypto.PubkeyToAddress(*pubKey), nil
}

// VerifySignature checks that signatureHex is a valid signature of message by expectedAddress.
func VerifySignature(message, signatureHex, expectedAddress string) error {
	if !common.IsHexAddress(expectedAddress) {
		return errors.New("invalid expected address")
	}

	recovered, err := RecoverSigner(message, signatureHex)
	if err != nil {
		return err
	}

	expected := common.HexToAddress(expectedAddress)
	if !strings.EqualFold(recovered.Hex(), expected.Hex()) {
		return fmt.Errorf("recovered signer %s does not match expected address %s", recovered.Hex(), expected.Hex())
	}

	return nil
}
