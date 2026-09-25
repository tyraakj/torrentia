package ws

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"torrentia/signaling/internal/auth"
	"torrentia/signaling/internal/signal"
	"torrentia/signaling/internal/tracker"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

const (
	// MaxChunksPerAnnouncement bounds the number of chunks a peer can advertise.
	MaxChunksPerAnnouncement = 500_000
	// MaxSignalingPayloadBytes bounds the maximum size for SDP and ICE messages (64 KB).
	MaxSignalingPayloadBytes = 64 * 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 1024,
	WriteBufferSize: 1024 * 1024,
}

// HubConfig configures origins, authentication, connection limits, and distributed relay.
type HubConfig struct {
	Origins      map[string]bool
	AuthRequired bool
	AuthSecret   []byte
	IPLimit      int
	IPWindow     time.Duration
	RedisClient  *redis.Client
}

// Hub manages active WebSocket peers and dispatches signaling/tracking operations.
type Hub struct {
	mu           sync.RWMutex
	peers        map[string]*Peer
	tracker      tracker.SeederTracker
	relay        *signal.Relay
	origins      map[string]bool
	authRequired bool
	authSecret   []byte
	ipLimiter    *IPRateLimiter
	redisClient  *redis.Client
	pubsub       *redis.PubSub
	stopPubSub   context.CancelFunc
}

// NewHub constructs a Hub connected to a tracker and a signaling relay.
func NewHub(tr tracker.SeederTracker) *Hub {
	return NewHubWithConfig(tr, HubConfig{})
}

// NewHubWithOrigins constructs a Hub with an optional WebSocket origin allowlist.
// A nil allowlist preserves the permissive behavior used by local development.
func NewHubWithOrigins(tr tracker.SeederTracker, origins map[string]bool) *Hub {
	return NewHubWithConfig(tr, HubConfig{Origins: origins})
}

// NewHubWithConfig constructs a Hub with full security and rate-limiting configuration.
func NewHubWithConfig(tr tracker.SeederTracker, cfg HubConfig) *Hub {
	ipLimit := cfg.IPLimit
	if ipLimit <= 0 {
		ipLimit = 10
	}
	ipWindow := cfg.IPWindow
	if ipWindow <= 0 {
		ipWindow = time.Minute
	}

	h := &Hub{
		peers:        make(map[string]*Peer),
		tracker:      tr,
		origins:      cfg.Origins,
		authRequired: cfg.AuthRequired,
		authSecret:   cfg.AuthSecret,
		ipLimiter:    NewIPRateLimiter(ipLimit, ipWindow),
	}
	h.relay = signal.NewRelay(h)

	if cfg.RedisClient != nil {
		h.redisClient = cfg.RedisClient
		ctx, cancel := context.WithCancel(context.Background())
		h.stopPubSub = cancel
		h.pubsub = cfg.RedisClient.PSubscribe(ctx, "signaling:relay:*")
		go h.listenRedisRelay(ctx, h.pubsub)
	}

	return h
}

// Close gracefully terminates pubsub subscriptions and cleanups.
func (h *Hub) Close() error {
	if h.stopPubSub != nil {
		h.stopPubSub()
	}
	if h.pubsub != nil {
		_ = h.pubsub.Close()
	}
	return nil
}

func (h *Hub) listenRedisRelay(ctx context.Context, ps *redis.PubSub) {
	ch := ps.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			targetID := strings.TrimPrefix(msg.Channel, "signaling:relay:")
			h.mu.RLock()
			peer, found := h.peers[targetID]
			h.mu.RUnlock()
			if found {
				peer.Send([]byte(msg.Payload))
			}
		}
	}
}

// SendToPeer sends raw data to a peer identified by peerID (implements signal.PeerSender).
func (h *Hub) SendToPeer(peerID string, data []byte) error {
	h.mu.RLock()
	peer, ok := h.peers[peerID]
	h.mu.RUnlock()

	if ok {
		if !peer.Send(data) {
			return errors.New("peer send buffer full")
		}
		return nil
	}

	// If peer not found locally and Redis is configured, publish to distributed relay channel
	if h.redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		channel := fmt.Sprintf("signaling:relay:%s", peerID)
		if err := h.redisClient.Publish(ctx, channel, data).Err(); err != nil {
			return fmt.Errorf("redis publish relay: %w", err)
		}
		return nil
	}

	return signal.ErrPeerNotFound
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
	// 1. Enforce per-peer message throughput limit (max 50 msg/sec)
	if !p.AllowMessage() {
		h.sendError(p, "rate limit exceeded")
		return errors.New("rate limit exceeded")
	}

	var base BaseMessage
	if err := json.Unmarshal(raw, &base); err != nil {
		h.sendError(p, "invalid json payload")
		return fmt.Errorf("unmarshal base message: %w", err)
	}

	// 2. Enforce signaling payload size limit (max 64 KB)
	if (base.Type == "offer" || base.Type == "answer" || base.Type == "ice-candidate") && len(raw) > MaxSignalingPayloadBytes {
		h.sendError(p, "signaling payload exceeds 64KB limit")
		return errors.New("signaling payload too large")
	}

	switch base.Type {
	case "register":
		var reg RegisterMessage
		if err := json.Unmarshal(raw, &reg); err != nil || reg.PeerID == "" {
			h.sendError(p, "invalid register payload: peerId is required")
			return fmt.Errorf("invalid register payload: %w", err)
		}

		oldID := p.ID()
		if oldID != "" && oldID != reg.PeerID {
			h.sendError(p, "peer cannot change identity on an existing connection")
			return errors.New("peer identity change rejected")
		}
		// A wallet switch keeps the same browser peer ID. Remove old
		// announcements before accepting the new address.
		if oldID != "" {
			h.tracker.RemovePeer(oldID)
		}
		h.mu.Lock()

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

		// Enforce maximum chunk count per announcement
		if len(ann.ChunksHeld) > MaxChunksPerAnnouncement {
			h.sendError(p, "chunk count exceeds quota (max 500000)")
			return errors.New("quota exceeded")
		}

		// Cryptographically bound identity: If peer authenticated via token, enforce authenticated address
		if p.Address() != "" {
			ann.Address = p.Address()
		} else if ann.Address != "" {
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
	if h.origins != nil && !h.origins[r.Header.Get("Origin")] {
		http.Error(w, "origin not allowed", http.StatusForbidden)
		return
	}

	if h.ipLimiter != nil && !h.ipLimiter.Allow(r) {
		http.Error(w, "too many connection attempts", http.StatusTooManyRequests)
		return
	}

	// Extract session token from query param or Authorization header
	token := r.URL.Query().Get("token")
	if token == "" {
		if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	var authClaims *auth.SessionClaims
	if token != "" {
		claims, err := auth.VerifySessionToken(token, h.authSecret)
		if err != nil {
			http.Error(w, fmt.Sprintf("invalid session token: %v", err), http.StatusUnauthorized)
			return
		}
		authClaims = claims
	} else if h.authRequired {
		http.Error(w, "unauthorized: session token required", http.StatusUnauthorized)
		return
	}

	requestUpgrader := upgrader
	requestUpgrader.CheckOrigin = func(*http.Request) bool { return true }
	conn, err := requestUpgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("websocket upgrade failed", "err", err)
		return
	}

	peer := NewPeer(h, conn)

	// If authenticated via token, pre-register the peer immediately
	if authClaims != nil {
		peer.SetID(authClaims.PeerID)
		peer.SetAddress(authClaims.Address)

		h.mu.Lock()
		if existing, ok := h.peers[authClaims.PeerID]; ok && existing != peer {
			existing.Close()
			delete(h.peers, authClaims.PeerID)
		}
		h.peers[authClaims.PeerID] = peer
		h.mu.Unlock()

		slog.Info("peer connected via session token", "peerId", authClaims.PeerID, "address", authClaims.Address)

		ack, _ := json.Marshal(map[string]string{
			"type":    "registered",
			"peerId":  authClaims.PeerID,
			"address": authClaims.Address,
		})
		peer.Send(ack)
	}

	go peer.WritePump()
	go peer.ReadPump()
}
