package seeder

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// PaymentSplitTopic0 is keccak256("PaymentSplit(bytes32,address,address,uint256,uint256,uint256)")
	PaymentSplitTopic0 = "0x3238fbdab70e555ad163955d8f0517199c4923108133b37db082673bdf32ede8"
)

var (
	ErrPaymentAlreadyRedeemed = errors.New("payment transaction hash already redeemed for chunk")
	ErrReceiptNotFound        = errors.New("transaction receipt not found on chain")
	ErrTransactionReverted    = errors.New("transaction reverted on-chain")
	ErrLogNotFound            = errors.New("PaymentSplit event log not found in transaction receipt")
	ErrInvalidPaymentAmount   = errors.New("total payment amount is less than required chunk price")
	ErrSeederMismatch         = errors.New("seeder address in PaymentSplit does not match node payout address")
	ErrModelMismatch          = errors.New("model ID in PaymentSplit does not match requested model")
)

type jsonRPCRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
	ID      int           `json:"id"`
}

type txLog struct {
	Address string   `json:"address"`
	Topics  []string `json:"topics"`
	Data    string   `json:"data"`
}

type txReceipt struct {
	Status string  `json:"status"`
	Logs   []txLog `json:"logs"`
}

type jsonRPCReceiptResponse struct {
	JSONRPC string     `json:"jsonrpc"`
	ID      int        `json:"id"`
	Result  *txReceipt `json:"result"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// PaymentVerifier validates on-chain payments using Monad JSON-RPC.
type PaymentVerifier struct {
	rpcURL          string
	contractAddress string
	seederAddress   string
	chainID         int64
	client          *http.Client
	replayStore     PaymentReplayStore
}

// PaymentReplayStore is the settlement replay boundary. Production nodes use
// Redis so multiple seeder containers share one atomic receipt claim.
type PaymentReplayStore interface {
	Claim(ctx context.Context, txHash string, ttl time.Duration) (bool, error)
}

type memoryPaymentReplayStore struct {
	mu      sync.Mutex
	entries map[string]time.Time
}

func (s *memoryPaymentReplayStore) Claim(_ context.Context, txHash string, ttl time.Duration) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	if expiresAt, ok := s.entries[txHash]; ok && now.Before(expiresAt) {
		return false, nil
	}
	s.entries[txHash] = now.Add(ttl)
	return true, nil
}

type redisPaymentReplayStore struct {
	client *redis.Client
	prefix string
}

func NewRedisPaymentReplayStore(client *redis.Client) PaymentReplayStore {
	return &redisPaymentReplayStore{client: client, prefix: "torrentia:settlement:receipt:"}
}

func (s *redisPaymentReplayStore) Claim(ctx context.Context, txHash string, ttl time.Duration) (bool, error) {
	return s.client.SetNX(ctx, s.prefix+strings.ToLower(strings.TrimSpace(txHash)), "1", ttl).Result()
}

// NewPaymentVerifier constructs a new payment verifier instance.
func NewPaymentVerifier(rpcURL, contractAddress, seederAddress string, chainID int64) *PaymentVerifier {
	return NewPaymentVerifierWithReplayStore(rpcURL, contractAddress, seederAddress, chainID, &memoryPaymentReplayStore{entries: make(map[string]time.Time)})
}

func NewPaymentVerifierWithReplayStore(rpcURL, contractAddress, seederAddress string, chainID int64, replayStore PaymentReplayStore) *PaymentVerifier {
	return &PaymentVerifier{
		rpcURL:          rpcURL,
		contractAddress: strings.ToLower(contractAddress),
		seederAddress:   strings.ToLower(seederAddress),
		chainID:         chainID,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		replayStore: replayStore,
	}
}

// VerifyChunkPayment verifies that a txHash settled the PaymentSplit event for modelID and chunkIndex.
func (v *PaymentVerifier) VerifyChunkPayment(ctx context.Context, modelID string, chunkIndex uint32, txHash string, expectedPrice *big.Int) (bool, error) {
	cleanTx := strings.ToLower(strings.TrimSpace(txHash))
	if cleanTx == "" {
		return false, errors.New("empty transaction hash")
	}

	// Fetch transaction receipt from Monad RPC
	reqBody := jsonRPCRequest{
		JSONRPC: "2.0",
		Method:  "eth_getTransactionReceipt",
		Params:  []interface{}{cleanTx},
		ID:      1,
	}
	reqData, err := json.Marshal(reqBody)
	if err != nil {
		return false, fmt.Errorf("marshal rpc request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", v.rpcURL, bytes.NewReader(reqData))
	if err != nil {
		return false, fmt.Errorf("create rpc http request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	httpResp, err := v.client.Do(httpReq)
	if err != nil {
		return false, fmt.Errorf("execute rpc request: %w", err)
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("rpc endpoint returned http status %d", httpResp.StatusCode)
	}

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return false, fmt.Errorf("read rpc response body: %w", err)
	}

	var rpcResp jsonRPCReceiptResponse
	if err := json.Unmarshal(respBody, &rpcResp); err != nil {
		return false, fmt.Errorf("unmarshal rpc response: %w", err)
	}

	if rpcResp.Error != nil {
		return false, fmt.Errorf("rpc error: %s (code %d)", rpcResp.Error.Message, rpcResp.Error.Code)
	}

	if rpcResp.Result == nil {
		return false, ErrReceiptNotFound
	}

	// Assert transaction succeeded (status == 0x1)
	if rpcResp.Result.Status != "0x1" && rpcResp.Result.Status != "1" {
		return false, ErrTransactionReverted
	}

	cleanModelID := strings.ToLower(strings.TrimPrefix(modelID, "0x"))
	cleanSeeder := strings.ToLower(strings.TrimPrefix(v.seederAddress, "0x"))
	cleanContract := strings.ToLower(v.contractAddress)

	foundLog := false
	for _, log := range rpcResp.Result.Logs {
		if strings.ToLower(log.Address) != cleanContract {
			continue
		}
		if len(log.Topics) < 3 {
			continue
		}

		// Topic0: PaymentSplit event hash
		if strings.ToLower(log.Topics[0]) != strings.ToLower(PaymentSplitTopic0) {
			continue
		}

		// Topic1: modelId (bytes32)
		topicModel := strings.ToLower(strings.TrimPrefix(log.Topics[1], "0x"))
		if !strings.EqualFold(topicModel, cleanModelID) {
			return false, ErrModelMismatch
		}

		// Topic2: seeder address (padded to 32 bytes / 64 hex characters)
		topicSeeder := strings.ToLower(strings.TrimPrefix(log.Topics[2], "0x"))
		if !strings.HasSuffix(topicSeeder, cleanSeeder) {
			return false, ErrSeederMismatch
		}

		// Data: uint256 seederAmount, uint256 creatorAmount, uint256 totalPaid
		dataHex := strings.TrimPrefix(log.Data, "0x")
		dataBytes, err := hex.DecodeString(dataHex)
		if err != nil || len(dataBytes) < 96 {
			return false, fmt.Errorf("invalid PaymentSplit log data: %w", err)
		}

		totalPaid := new(big.Int).SetBytes(dataBytes[64:96])
		if expectedPrice != nil && totalPaid.Cmp(expectedPrice) < 0 {
			return false, fmt.Errorf("%w: paid %s wei, expected at least %s wei", ErrInvalidPaymentAmount, totalPaid.String(), expectedPrice.String())
		}

		foundLog = true
		break
	}

	if !foundLog {
		return false, ErrLogNotFound
	}

	// Claim only after complete validation. Redis SET NX makes this atomic across
	// all seeder replicas and avoids consuming a receipt for an invalid request.
	claimed, err := v.replayStore.Claim(ctx, cleanTx, 24*time.Hour)
	if err != nil {
		return false, fmt.Errorf("claim settlement receipt: %w", err)
	}
	if !claimed {
		return false, ErrPaymentAlreadyRedeemed
	}

	return true, nil
}
