package ws

import (
	"log/slog"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 1024 // 1 MB max message size
)

// Peer wraps a single WebSocket connection with dedicated read and write pumps.
type Peer struct {
	hub     *Hub
	conn    *websocket.Conn
	send    chan []byte
	closed  bool
	closeMu sync.Mutex

	mu      sync.RWMutex
	id      string
	address string
	limiter *PeerMessageLimiter
}

// NewPeer creates an uninitialized Peer wrapper with default rate limiting.
func NewPeer(hub *Hub, conn *websocket.Conn) *Peer {
	return &Peer{
		hub:     hub,
		conn:    conn,
		send:    make(chan []byte, 256),
		limiter: NewPeerMessageLimiter(50.0), // 50 msg/sec max
	}
}

// AllowMessage checks if the peer is within its allowed message rate limit.
func (p *Peer) AllowMessage() bool {
	if p.limiter == nil {
		return true
	}
	return p.limiter.Allow()
}

// ID returns the peer's registered identifier.
func (p *Peer) ID() string {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.id
}

// SetID updates the peer's registered identifier.
func (p *Peer) SetID(id string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.id = id
}

// Address returns the peer's Ethereum/Monad wallet address.
func (p *Peer) Address() string {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.address
}

// SetAddress updates the peer's wallet address.
func (p *Peer) SetAddress(addr string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.address = addr
}

// Send non-blockingly queues a message to be written to the WebSocket connection.
func (p *Peer) Send(data []byte) bool {
	p.closeMu.Lock()
	defer p.closeMu.Unlock()

	if p.closed {
		return false
	}

	select {
	case p.send <- data:
		return true
	default:
		slog.Warn("peer send buffer overflow, dropping message", "peerId", p.ID())
		return false
	}
}

// Close gracefully terminates the peer connection and closes the send channel once.
func (p *Peer) Close() {
	p.closeMu.Lock()
	defer p.closeMu.Unlock()

	if !p.closed {
		p.closed = true
		close(p.send)
		_ = p.conn.Close()
	}
}

// ReadPump listens for incoming messages from the WebSocket connection.
func (p *Peer) ReadPump() {
	defer func() {
		p.hub.UnregisterPeer(p)
		p.Close()
	}()

	p.conn.SetReadLimit(maxMessageSize)
	_ = p.conn.SetReadDeadline(time.Now().Add(pongWait))
	p.conn.SetPongHandler(func(string) error {
		_ = p.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := p.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Debug("websocket read error", "peerId", p.ID(), "err", err)
			}
			break
		}

		if err := p.hub.HandleMessage(p, message); err != nil {
			slog.Debug("failed to handle message", "peerId", p.ID(), "err", err)
		}
	}
}

// WritePump writes queued messages and heartbeats out to the WebSocket connection.
func (p *Peer) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		p.Close()
	}()

	for {
		select {
		case message, ok := <-p.send:
			_ = p.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel. Send close frame.
				_ = p.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Keep each queued JSON message as its own WebSocket frame.
			// The browser client parses one JSON object per message event.
			if err := p.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			_ = p.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := p.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
