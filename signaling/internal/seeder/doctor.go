package seeder

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// DoctorResult records the outcome of a single diagnostic check.
type DoctorResult struct {
	Name    string `json:"name"`
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}

// RunDoctor performs automated connectivity, permission, and protocol checks.
func RunDoctor(ctx context.Context, cfg *Config) []DoctorResult {
	var results []DoctorResult
	client := &http.Client{Timeout: 5 * time.Second}

	// 1. Check storage directory write permissions
	dirErr := os.MkdirAll(cfg.DataDir, 0755)
	if dirErr != nil {
		results = append(results, DoctorResult{
			Name:    "Storage Directory",
			OK:      false,
			Message: fmt.Sprintf("Failed to create/access data directory: %v", dirErr),
		})
	} else {
		testFile := filepath.Join(cfg.DataDir, ".doctor_write_test")
		writeErr := os.WriteFile(testFile, []byte("ok"), 0644)
		if writeErr != nil {
			results = append(results, DoctorResult{
				Name:    "Storage Directory",
				OK:      false,
				Message: fmt.Sprintf("Data directory is not writable: %v", writeErr),
			})
		} else {
			_ = os.Remove(testFile)
			results = append(results, DoctorResult{
				Name:    "Storage Directory",
				OK:      true,
				Message: fmt.Sprintf("Writable (%s)", cfg.DataDir),
			})
		}
	}

	// 2. Check wallet configuration
	if cfg.SeederAddress == "" || !strings.HasPrefix(cfg.SeederAddress, "0x") || len(cfg.SeederAddress) != 42 {
		results = append(results, DoctorResult{
			Name:    "Seeder Payout Address",
			OK:      false,
			Message: fmt.Sprintf("Invalid or unconfigured payout address: %s", cfg.SeederAddress),
		})
	} else {
		results = append(results, DoctorResult{
			Name:    "Seeder Payout Address",
			OK:      true,
			Message: fmt.Sprintf("Valid (%s)", cfg.SeederAddress),
		})
	}

	// 3. Check Signaling Server Health
	healthURL := strings.Replace(cfg.SignalingURL, "ws://", "http://", 1)
	healthURL = strings.Replace(healthURL, "wss://", "https://", 1)
	healthURL = strings.TrimSuffix(healthURL, "/ws") + "/health"

	req, _ := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	resp, err := client.Do(req)
	if err != nil {
		results = append(results, DoctorResult{
			Name:    "Signaling Server",
			OK:      false,
			Message: fmt.Sprintf("Unreachable at %s: %v", healthURL, err),
		})
	} else {
		resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			results = append(results, DoctorResult{
				Name:    "Signaling Server",
				OK:      true,
				Message: fmt.Sprintf("Online (%s)", healthURL),
			})
		} else {
			results = append(results, DoctorResult{
				Name:    "Signaling Server",
				OK:      false,
				Message: fmt.Sprintf("HTTP %d from %s", resp.StatusCode, healthURL),
			})
		}
	}

	// 4. Check Monad RPC connectivity & Chain ID
	rpcReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "eth_chainId",
		"params":  []interface{}{},
		"id":      1,
	}
	rpcData, _ := json.Marshal(rpcReq)
	reqRPC, _ := http.NewRequestWithContext(ctx, "POST", cfg.MonadRPCURL, bytes.NewReader(rpcData))
	reqRPC.Header.Set("Content-Type", "application/json")

	respRPC, err := client.Do(reqRPC)
	if err != nil {
		results = append(results, DoctorResult{
			Name:    "Monad RPC",
			OK:      false,
			Message: fmt.Sprintf("RPC unreachable at %s: %v", cfg.MonadRPCURL, err),
		})
	} else {
		defer respRPC.Body.Close()
		var rpcResp struct {
			Result string `json:"result"`
		}
		_ = json.NewDecoder(respRPC.Body).Decode(&rpcResp)

		chainID64, _ := strconv.ParseInt(strings.TrimPrefix(rpcResp.Result, "0x"), 16, 64)
		if chainID64 == cfg.ChainID {
			results = append(results, DoctorResult{
				Name:    "Monad RPC",
				OK:      true,
				Message: fmt.Sprintf("Connected (Chain ID %d)", chainID64),
			})
		} else {
			results = append(results, DoctorResult{
				Name:    "Monad RPC",
				OK:      true,
				Message: fmt.Sprintf("Connected (Response %s, Expected Chain ID %d)", rpcResp.Result, cfg.ChainID),
			})
		}
	}

	// 5. Check SplitPayment Contract
	if cfg.SplitPaymentContract != "" {
		codeReq := map[string]interface{}{
			"jsonrpc": "2.0",
			"method":  "eth_getCode",
			"params":  []interface{}{cfg.SplitPaymentContract, "latest"},
			"id":      2,
		}
		codeData, _ := json.Marshal(codeReq)
		reqCode, _ := http.NewRequestWithContext(ctx, "POST", cfg.MonadRPCURL, bytes.NewReader(codeData))
		reqCode.Header.Set("Content-Type", "application/json")

		respCode, err := client.Do(reqCode)
		if err == nil {
			defer respCode.Body.Close()
			var codeResp struct {
				Result string `json:"result"`
			}
			_ = json.NewDecoder(respCode.Body).Decode(&codeResp)
			if len(codeResp.Result) > 4 {
				results = append(results, DoctorResult{
					Name:    "SplitPayment Contract",
					OK:      true,
					Message: fmt.Sprintf("Verified at %s", cfg.SplitPaymentContract),
				})
			} else {
				results = append(results, DoctorResult{
					Name:    "SplitPayment Contract",
					OK:      false,
					Message: fmt.Sprintf("No bytecode found at %s", cfg.SplitPaymentContract),
				})
			}
		}
	}

	return results
}
