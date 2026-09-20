package ws

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sync"

	"torrentia/signaling/internal/signal"
	"torrentia/signaling/internal/tracker"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 1024,
	WriteBufferSize: 1024 * 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for hackathon demo.
		// TODO: restrict CORS in production
		return true
	},
}

// Hub manages active WebSocket peers and dispatches signaling/tracking operations.
type Hub struct {
	mu      sync.RWMutex
	peers   map[string]*Peer
	tracker *tracker.Tracker
	relay   *signal.Relay
}

// NewHub constructs a Hub connected to a tracker and a signaling relay.
func NewHub(tr *tracker.Tracker) *Hub {
	h := &Hub{
		peers:   make(map[string]*Peer),
		tracker: tr,
	}
	h.relay = signal.NewRelay(h)
	return h
}

// SendToPeer sends raw data to a peer identified by peerID (implements signal.PeerSender).
func (h *Hub) SendToPeer(peerID string, data []byte) error {
	h.mu.RLock()
	peer, ok := h.peers[peerID]
	h.mu.RUnlock()

	if !ok {
		return signal.ErrPeerNotFound
	}

	if !peer.Send(data) {
		return errors.New("peer send buffer full")
	}
	return nil
}

// PeerCount returns the total number of currently registered peers.
func (h *Hub) PeerCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.peers)
}

// GetPeer retrieves a registered peer by ID.
func (h *Hub) GetPeer(peerID string) (*Peer, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	p, ok := h.peers[peerID]
	return p, ok
}

// UnregisterPeer removes a peer from the hub and tracker upon disconnection.
func (h *Hub) UnregisterPeer(p *Peer) {
	peerID := p.ID()
	if peerID == "" {
		return
	}

	h.mu.Lock()
	if current, ok := h.peers[peerID]; ok && current == p {
		delete(h.peers, peerID)
		slog.Info("peer disconnected and unregistered", "peerId", peerID)
	}
	h.mu.Unlock()

	h.tracker.RemovePeer(peerID)
}

// BaseMessage reads the common 'type' property of incoming JSON messages.
type BaseMessage struct {
	Type string `json:"type"`
}

// RegisterMessage defines peer registration payload.
type RegisterMessage struct {
	Type    string `json:"type"`
	PeerID  string `json:"peerId"`
	Address string `json:"address"`
}

// AnnounceMessage defines seeder chunk availability announcement.
type AnnounceMessage struct {
	Type       string   `json:"type"`
	ModelID    string   `json:"modelId"`
	Address    string   `json:"address,omitempty"`
	ChunksHeld []uint32 `json:"chunksHeld"`
}

// QueryMessage defines a client's request for available seeders of a model.
type QueryMessage struct {
	Type    string `json:"type"`
	ModelID string `json:"modelId"`
}

// QueryResponse defines the returned list of seeders.
type QueryResponse struct {
	Type    string              `json:"type"`
	ModelID string              `json:"modelId"`
	Seeders []tracker.SeederDTO `json:"seeders"`
}

// HandleMessage routes raw JSON WebSocket messages based on their 'type' attribute.
func (h *Hub) HandleMessage(p *Peer, raw []byte) error {
	var base BaseMessage
	if err := json.Unmarshal(raw, &base); err != nil {
		h.sendError(p, "invalid json payload")
		return fmt.Errorf("unmarshal base message: %w", err)
	}

	switch base.Type {
	case "register":
		var reg RegisterMessage
		if err := json.Unmarshal(raw, &reg); err != nil || reg.PeerID == "" {
			h.sendError(p, "invalid register payload: peerId is required")
			return fmt.Errorf("invalid register payload: %w", err)
		}

		oldID := p.ID()
		h.mu.Lock()
		if oldID != "" && oldID != reg.PeerID {
			delete(h.peers, oldID)
			h.tracker.RemovePeer(oldID)
		}

		// If another connection already held this peerId, kick the old one
		if existing, ok := h.peers[reg.PeerID]; ok && existing != p {
			existing.Close()
			delete(h.peers, reg.PeerID)
		}

		p.SetID(reg.PeerID)
		p.SetAddress(reg.Address)
		h.peers[reg.PeerID] = p
		h.mu.Unlock()

		slog.Info("peer registered", "peerId", reg.PeerID, "address", reg.Address)

		ack, _ := json.Marshal(map[string]string{
			"type":   "registered",
			"peerId": reg.PeerID,
		})
		p.Send(ack)
		return nil

	case "heartbeat":
		if p.ID() == "" {
			h.sendError(p, "unregistered peer cannot send heartbeat")
			return errors.New("unregistered heartbeat")
		}
		h.tracker.Heartbeat(p.ID())
		return nil

	case "announce":
		if p.ID() == "" {
			h.sendError(p, "unregistered peer cannot announce chunks")
			return errors.New("unregistered announce")
		}

		var ann AnnounceMessage
		if err := json.Unmarshal(raw, &ann); err != nil || ann.ModelID == "" {
			h.sendError(p, "invalid announce payload: modelId is required")
			return fmt.Errorf("invalid announce payload: %w", err)
		}

		if ann.Address != "" {
			p.SetAddress(ann.Address)
		}

		h.tracker.Announce(ann.ModelID, p.ID(), p.Address(), ann.ChunksHeld)
		slog.Debug("peer announced chunks", "peerId", p.ID(), "modelId", ann.ModelID, "count", len(ann.ChunksHeld))

		ack, _ := json.Marshal(map[string]string{
			"type":    "announced",
			"modelId": ann.ModelID,
		})
		p.Send(ack)
		return nil

	case "query":
		var q QueryMessage
		if err := json.Unmarshal(raw, &q); err != nil || q.ModelID == "" {
			h.sendError(p, "invalid query payload: modelId is required")
			return fmt.Errorf("invalid query payload: %w", err)
		}

		seeders := h.tracker.Query(q.ModelID)
		resp := QueryResponse{
			Type:    "seeders",
			ModelID: q.ModelID,
			Seeders: seeders,
		}

		respBytes, err := json.Marshal(resp)
		if err != nil {
			h.sendError(p, "failed to serialize query response")
			return err
		}
		p.Send(respBytes)
		return nil

	case "offer", "answer", "ice-candidate":
		if p.ID() == "" {
			h.sendError(p, "unregistered peer cannot send signaling messages")
			return errors.New("unregistered signaling")
		}

		if err := h.relay.Forward(p.ID(), raw); err != nil {
			if errors.Is(err, signal.ErrPeerNotFound) {
				var env signal.Envelope
				_ = json.Unmarshal(raw, &env)
				h.sendError(p, fmt.Sprintf("peer not found: %s", env.To))
			} else {
				h.sendError(p, err.Error())
			}
			return err
		}
		return nil

	default:
		h.sendError(p, fmt.Sprintf("unknown message type: %s", base.Type))
		return fmt.Errorf("unknown message type: %s", base.Type)
	}
}

func (h *Hub) sendError(p *Peer, msg string) {
	errResp, _ := json.Marshal(signal.ErrorResponse{
		Type:    "error",
		Message: msg,
	})
	p.Send(errResp)
}

// ServeWS upgrades the HTTP request to WebSocket and attaches it to the Hub.
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("websocket upgrade failed", "err", err)
		return
	}

	peer := NewPeer(h, conn)
	go peer.WritePump()
	go peer.ReadPump()
}
