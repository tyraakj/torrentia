package broker

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

// IPFSClient defines the interface for pinning manifest JSON content to IPFS.
type IPFSClient interface {
	PinJSON(ctx context.Context, name string, rawJSON []byte) (string, error)
}

// PinataClient pins JSON content to IPFS using Pinata's API.
type PinataClient struct {
	jwt        string
	apiURL     string
	httpClient *http.Client
}

// NewPinataClient creates a new PinataClient with the specified JWT.
func NewPinataClient(jwt string) *PinataClient {
	return NewPinataClientWithURL(jwt, "https://api.pinata.cloud/pinning/pinJSONToIPFS", 15*time.Second)
}

// NewPinataClientWithURL creates a new PinataClient allowing custom endpoint and timeout (useful for testing).
func NewPinataClientWithURL(jwt string, apiURL string, timeout time.Duration) *PinataClient {
	return &PinataClient{
		jwt:    jwt,
		apiURL: apiURL,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// PinJSON uploads the raw manifest JSON to Pinata and returns the resulting IPFS CID.
func (p *PinataClient) PinJSON(ctx context.Context, name string, rawJSON []byte) (string, error) {
	if p.jwt == "" {
		return "", errors.New("pinata JWT is not configured")
	}

	payload := map[string]interface{}{
		"pinataContent": json.RawMessage(rawJSON),
		"pinataMetadata": map[string]string{
			"name": name,
		},
		"pinataOptions": map[string]int{
			"cidVersion": 1,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal pinata payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.apiURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create pinata request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.jwt)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("pinata request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read pinata response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("pinata returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		IpfsHash string `json:"IpfsHash"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("failed to decode pinata response: %w", err)
	}

	if result.IpfsHash == "" {
		return "", errors.New("empty IPFS hash returned from pinata")
	}

	return result.IpfsHash, nil
}

// MockIPFSClient is a mock implementation of IPFSClient for testing and offline/local fallback.
type MockIPFSClient struct {
	PinnedCIDs map[string][]byte
	FailNext   bool
	NextCID    string
}

// NewMockIPFSClient returns an initialized MockIPFSClient.
func NewMockIPFSClient() *MockIPFSClient {
	return &MockIPFSClient{
		PinnedCIDs: make(map[string][]byte),
	}
}

// PinJSON mocks the pinning of JSON content.
func (m *MockIPFSClient) PinJSON(ctx context.Context, name string, rawJSON []byte) (string, error) {
	if m.FailNext {
		m.FailNext = false
		return "", errors.New("mock pinning failure")
	}

	cid := m.NextCID
	if cid == "" {
		cid = fmt.Sprintf("bafkreimock%x", time.Now().UnixNano())
	}
	m.PinnedCIDs[cid] = rawJSON
	return cid, nil
}
