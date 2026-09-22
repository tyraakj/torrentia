package broker

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestPinataClient_PinJSON_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-jwt-123" {
			t.Errorf("expected Bearer test-jwt-123, got %s", auth)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"IpfsHash":"bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"}`))
	}))
	defer server.Close()

	client := NewPinataClientWithURL("test-jwt-123", server.URL, 5*time.Second)
	cid, err := client.PinJSON(context.Background(), "test-manifest.json", []byte(`{"modelId":"0x123"}`))
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	expectedCID := "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
	if cid != expectedCID {
		t.Fatalf("expected CID %s, got %s", expectedCID, cid)
	}
}

func TestPinataClient_PinJSON_ErrorResponses(t *testing.T) {
	// Missing JWT
	clientNoJWT := NewPinataClient("")
	if _, err := clientNoJWT.PinJSON(context.Background(), "test", []byte(`{}`)); err == nil {
		t.Fatal("expected error on missing JWT")
	}

	// 401 Unauthorized
	server401 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error":"unauthorized"}`))
	}))
	defer server401.Close()

	client401 := NewPinataClientWithURL("bad-jwt", server401.URL, 5*time.Second)
	if _, err := client401.PinJSON(context.Background(), "test", []byte(`{}`)); err == nil {
		t.Fatal("expected error on 401 Unauthorized")
	}

	// Empty IpfsHash
	serverEmpty := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"IpfsHash":""}`))
	}))
	defer serverEmpty.Close()

	clientEmpty := NewPinataClientWithURL("jwt", serverEmpty.URL, 5*time.Second)
	if _, err := clientEmpty.PinJSON(context.Background(), "test", []byte(`{}`)); err == nil {
		t.Fatal("expected error on empty IpfsHash")
	}
}

func TestMockIPFSClient(t *testing.T) {
	mock := NewMockIPFSClient()
	mock.NextCID = "bafkreitest123"

	cid, err := mock.PinJSON(context.Background(), "name", []byte("sample"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cid != "bafkreitest123" {
		t.Fatalf("expected bafkreitest123, got %s", cid)
	}

	mock.FailNext = true
	if _, err := mock.PinJSON(context.Background(), "name", []byte("sample")); err == nil {
		t.Fatal("expected simulated failure")
	}
}
