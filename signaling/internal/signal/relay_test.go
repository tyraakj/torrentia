package signal

import (
	"encoding/json"
	"testing"
)

type mockSender struct {
	sentTo   string
	sentData []byte
	err      error
}

func (m *mockSender) SendToPeer(peerID string, data []byte) error {
	m.sentTo = peerID
	m.sentData = data
	return m.err
}

func TestRelay_ForwardOfferSuccess(t *testing.T) {
	mock := &mockSender{}
	relay := NewRelay(mock)

	msg := `{"type":"offer","to":"peer-bob","payload":{"type":"offer","sdp":"v=0..."}}`
	err := relay.Forward("peer-alice", []byte(msg))
	if err != nil {
		t.Fatalf("unexpected error forwarding offer: %v", err)
	}

	if mock.sentTo != "peer-bob" {
		t.Errorf("expected destination peer-bob, got %s", mock.sentTo)
	}

	var parsed Envelope
	if err := json.Unmarshal(mock.sentData, &parsed); err != nil {
		t.Fatalf("failed to unmarshal sent data: %v", err)
	}

	if parsed.Type != "offer" {
		t.Errorf("expected type offer, got %s", parsed.Type)
	}
	if parsed.From != "peer-alice" {
		t.Errorf("expected from peer-alice, got %s", parsed.From)
	}
	if parsed.To != "peer-bob" {
		t.Errorf("expected to peer-bob, got %s", parsed.To)
	}

	var payloadMap map[string]interface{}
	if err := json.Unmarshal(parsed.Payload, &payloadMap); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}
	if payloadMap["sdp"] != "v=0..." {
		t.Errorf("expected sdp to be untouched, got %v", payloadMap["sdp"])
	}
}

func TestRelay_ForwardMissingTo(t *testing.T) {
	mock := &mockSender{}
	relay := NewRelay(mock)

	msg := `{"type":"ice-candidate","payload":{"candidate":"..."}}`
	err := relay.Forward("peer-alice", []byte(msg))
	if err != ErrMissingTo {
		t.Fatalf("expected ErrMissingTo, got %v", err)
	}
}

func TestRelay_PeerNotFound(t *testing.T) {
	mock := &mockSender{err: ErrPeerNotFound}
	relay := NewRelay(mock)

	msg := `{"type":"answer","to":"non-existent","payload":{}}`
	err := relay.Forward("peer-alice", []byte(msg))
	if err != ErrPeerNotFound {
		t.Fatalf("expected ErrPeerNotFound, got %v", err)
	}
}
