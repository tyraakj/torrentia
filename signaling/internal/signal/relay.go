package signal

import (
	"encoding/json"
	"errors"
	"fmt"
)

var (
	ErrPeerNotFound = errors.New("peer not found")
	ErrMissingTo    = errors.New("missing 'to' peer recipient")
)

// PeerSender is an abstraction for dispatching raw messages to connected peers.
type PeerSender interface {
	SendToPeer(peerID string, data []byte) error
}

// Envelope represents WebRTC signaling messages (offer, answer, ice-candidate).
type Envelope struct {
	Type    string          `json:"type"`
	From    string          `json:"from"`
	To      string          `json:"to"`
	Payload json.RawMessage `json:"payload"`
}

// ErrorResponse is sent back to a peer when a signaling relay or command fails.
type ErrorResponse struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// Relay routes WebRTC SDP and ICE messages between peers without inspecting or altering payloads.
type Relay struct {
	sender PeerSender
}

// NewRelay creates a new Relay instance.
func NewRelay(sender PeerSender) *Relay {
	return &Relay{sender: sender}
}

// Forward relays the message verbatim to the target peer specified in the 'to' field.
// It ensures the 'from' field accurately reflects the sending peer's ID.
func (r *Relay) Forward(fromPeerID string, raw []byte) error {
	var env Envelope
	if err := json.Unmarshal(raw, &env); err != nil {
		return fmt.Errorf("invalid signaling message format: %w", err)
	}

	if env.To == "" {
		return ErrMissingTo
	}

	// Stamp sender identity
	env.From = fromPeerID

	payloadBytes, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("failed to marshal relay envelope: %w", err)
	}

	if err := r.sender.SendToPeer(env.To, payloadBytes); err != nil {
		return err
	}

	return nil
}
