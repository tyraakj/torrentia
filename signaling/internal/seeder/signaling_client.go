package seeder

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// SignalingMessageHandler handles incoming WebRTC messages from the signaling relay.
type SignalingMessageHandler func(msgType string, fromPeer string, payload json.RawMessage)

// SignalingClient manages a persistent WebSocket connection to the Torrentia signaling hub.
type SignalingClient struct {
	url           string
	peerID        string
	seederAddress string
	conn          *websocket.Conn
	mu            sync.Mutex
	writeMu       sync.Mutex
	closed        bool
	closeChan     chan struct{}
	handler       SignalingMessageHandler
}

// NewSignalingClient constructs a new signaling client.
func NewSignalingClient(url, peerID, seederAddress string) *SignalingClient {
	return &SignalingClient{
		url:           url,
		peerID:        peerID,
		seederAddress: seederAddress,
		closeChan:     make(chan struct{}),
	}
}

// SetHandler configures the callback for incoming signaling messages (offers, ICE candidates).
func (c *SignalingClient) SetHandler(h SignalingMessageHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handler = h
}

// Connect dials the signaling server, registers the peer identity, and starts the message pumps.
func (c *SignalingClient) Connect(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, c.url, nil)
	if err != nil {
		return fmt.Errorf("dial signaling server: %w", err)
	}
	c.conn = conn

	// 1. Send registration
	regMsg := map[string]string{
		"type":    "register",
		"peerId":  c.peerID,
		"address": c.seederAddress,
	}
	if err := conn.WriteJSON(regMsg); err != nil {
		_ = conn.Close()
		return fmt.Errorf("send register message: %w", err)
	}

	// 2. Start background heartbeat ticker
	go c.heartbeatLoop()

	// 3. Start read loop
	go c.readLoop()

	return nil
}

func (c *SignalingClient) heartbeatLoop() {
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.closeChan:
			return
		case <-ticker.C:
			c.mu.Lock()
			closed := c.closed
			c.mu.Unlock()
			if closed {
				return
			}

			_ = c.sendJSON(map[string]string{
				"type": "heartbeat",
			})
		}
	}
}

type incomingEnvelope struct {
	Type    string          `json:"type"`
	From    string          `json:"from,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Message string          `json:"message,omitempty"`
}

func (c *SignalingClient) readLoop() {
	for {
		c.mu.Lock()
		conn := c.conn
		closed := c.closed
		c.mu.Unlock()

		if closed || conn == nil {
			return
		}

		_, data, err := conn.ReadMessage()
		if err != nil {
			c.mu.Lock()
			if !c.closed {
				slog.Debug("signaling connection read closed", "err", err)
			}
			c.mu.Unlock()
			return
		}

		var env incomingEnvelope
		if err := json.Unmarshal(data, &env); err != nil {
			continue
		}

		switch env.Type {
		case "registered":
			slog.Info("signaling client registered", "peerId", c.peerID)
		case "announced":
			slog.Debug("signaling chunks announced ack received")
		case "offer", "answer", "ice-candidate":
			c.mu.Lock()
			handler := c.handler
			c.mu.Unlock()
			if handler != nil {
				handler(env.Type, env.From, env.Payload)
			}
		case "error":
			slog.Warn("signaling server returned error", "msg", env.Message)
		}
	}
}

func (c *SignalingClient) sendJSON(v interface{}) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()

	c.mu.Lock()
	conn := c.conn
	closed := c.closed
	c.mu.Unlock()

	if closed || conn == nil {
		return errors.New("signaling client is closed")
	}

	return conn.WriteJSON(v)
}

// Announce broadcasts availability of held chunks for a specific model.
func (c *SignalingClient) Announce(modelID string, chunksHeld []uint32) error {
	msg := map[string]interface{}{
		"type":       "announce",
		"modelId":    modelID,
		"address":    c.seederAddress,
		"chunksHeld": chunksHeld,
	}
	return c.sendJSON(msg)
}

// SendSignaling relays an offer, answer, or ICE candidate to a specific peer.
func (c *SignalingClient) SendSignaling(msgType, toPeer string, payload interface{}) error {
	msg := map[string]interface{}{
		"type":    msgType,
		"from":    c.peerID,
		"to":      toPeer,
		"payload": payload,
	}
	return c.sendJSON(msg)
}

// Close gracefully closes the signaling WebSocket connection.
func (c *SignalingClient) Close() error {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return nil
	}
	c.closed = true
	close(c.closeChan)
	conn := c.conn
	c.conn = nil
	c.mu.Unlock()

	if conn != nil {
		_ = conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		return conn.Close()
	}
	return nil
}
