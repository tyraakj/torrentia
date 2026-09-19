package ws

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"torrentia/signaling/internal/signal"
	"torrentia/signaling/internal/tracker"

	"github.com/gorilla/websocket"
)

func TestHub_ServeAndRegister(t *testing.T) {
	tr := tracker.NewTracker()
	hub := NewHub(tr)

	server := httptest.NewServer(http.HandlerFunc(hub.ServeWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect to ws: %v", err)
	}
	defer ws.Close()

	// 1. Send register
	regMsg := map[string]string{
		"type":    "register",
		"peerId":  "alice",
		"address": "0x1234",
	}
	if err := ws.WriteJSON(regMsg); err != nil {
		t.Fatalf("failed to write register: %v", err)
	}

	var resp map[string]string
	if err := ws.ReadJSON(&resp); err != nil {
		t.Fatalf("failed to read register ack: %v", err)
	}
	if resp["type"] != "registered" || resp["peerId"] != "alice" {
		t.Fatalf("unexpected register ack: %+v", resp)
	}

	if hub.PeerCount() != 1 {
		t.Fatalf("expected 1 peer, got %d", hub.PeerCount())
	}

	// 2. Announce model
	annMsg := map[string]interface{}{
		"type":       "announce",
		"modelId":    "model-xyz",
		"chunksHeld": []uint32{0, 1, 2},
	}
	if err := ws.WriteJSON(annMsg); err != nil {
		t.Fatalf("failed to write announce: %v", err)
	}

	var annAck map[string]string
	if err := ws.ReadJSON(&annAck); err != nil {
		t.Fatalf("failed to read announce ack: %v", err)
	}
	if annAck["type"] != "announced" || annAck["modelId"] != "model-xyz" {
		t.Fatalf("unexpected announce ack: %+v", annAck)
	}

	// 3. Query model
	queryMsg := map[string]string{
		"type":    "query",
		"modelId": "model-xyz",
	}
	if err := ws.WriteJSON(queryMsg); err != nil {
		t.Fatalf("failed to write query: %v", err)
	}

	var qResp QueryResponse
	if err := ws.ReadJSON(&qResp); err != nil {
		t.Fatalf("failed to read query response: %v", err)
	}
	if qResp.Type != "seeders" || qResp.ModelID != "model-xyz" || len(qResp.Seeders) != 1 {
		t.Fatalf("unexpected query response: %+v", qResp)
	}
	if qResp.Seeders[0].PeerID != "alice" || qResp.Seeders[0].Address != "0x1234" {
		t.Errorf("unexpected seeder dto: %+v", qResp.Seeders[0])
	}

	// 4. Send Heartbeat
	if err := ws.WriteJSON(map[string]string{"type": "heartbeat"}); err != nil {
		t.Fatalf("failed to send heartbeat: %v", err)
	}

	// 5. Close connection and verify peer removal
	ws.Close()

	// Wait briefly for unregister deferral
	time.Sleep(50 * time.Millisecond)

	if hub.PeerCount() != 0 {
		t.Fatalf("expected 0 peers after disconnect, got %d", hub.PeerCount())
	}

	// Tracker should also be purged of alice
	seeders := tr.Query("model-xyz")
	if len(seeders) != 0 {
		t.Fatalf("expected 0 seeders in tracker after peer disconnect, got %d", len(seeders))
	}
}

func TestHub_SignalingRelay(t *testing.T) {
	tr := tracker.NewTracker()
	hub := NewHub(tr)

	server := httptest.NewServer(http.HandlerFunc(hub.ServeWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Connect Alice
	wsAlice, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("alice dial: %v", err)
	}
	defer wsAlice.Close()
	_ = wsAlice.WriteJSON(map[string]string{"type": "register", "peerId": "alice", "address": "0xAAA"})
	var ackA map[string]string
	_ = wsAlice.ReadJSON(&ackA)

	// Connect Bob
	wsBob, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("bob dial: %v", err)
	}
	defer wsBob.Close()
	_ = wsBob.WriteJSON(map[string]string{"type": "register", "peerId": "bob", "address": "0xBBB"})
	var ackB map[string]string
	_ = wsBob.ReadJSON(&ackB)

	// Alice sends Offer to Bob
	offerPayload := map[string]string{"type": "offer", "sdp": "v=0\r\no=alice..."}
	offerMsg := map[string]interface{}{
		"type":    "offer",
		"to":      "bob",
		"payload": offerPayload,
	}
	if err := wsAlice.WriteJSON(offerMsg); err != nil {
		t.Fatalf("alice write offer: %v", err)
	}

	// Bob should receive Offer
	var bobReceived signal.Envelope
	if err := wsBob.ReadJSON(&bobReceived); err != nil {
		t.Fatalf("bob read offer: %v", err)
	}
	if bobReceived.Type != "offer" || bobReceived.From != "alice" || bobReceived.To != "bob" {
		t.Fatalf("unexpected offer received by bob: %+v", bobReceived)
	}

	// Bob sends Answer to Alice
	answerPayload := map[string]string{"type": "answer", "sdp": "v=0\r\no=bob..."}
	answerMsg := map[string]interface{}{
		"type":    "answer",
		"to":      "alice",
		"payload": answerPayload,
	}
	if err := wsBob.WriteJSON(answerMsg); err != nil {
		t.Fatalf("bob write answer: %v", err)
	}

	// Alice should receive Answer
	var aliceReceived signal.Envelope
	if err := wsAlice.ReadJSON(&aliceReceived); err != nil {
		t.Fatalf("alice read answer: %v", err)
	}
	if aliceReceived.Type != "answer" || aliceReceived.From != "bob" || aliceReceived.To != "alice" {
		t.Fatalf("unexpected answer received by alice: %+v", aliceReceived)
	}

	// Alice sends ICE candidate to Bob
	iceMsg := map[string]interface{}{
		"type":    "ice-candidate",
		"to":      "bob",
		"payload": map[string]string{"candidate": "candidate:1..."},
	}
	if err := wsAlice.WriteJSON(iceMsg); err != nil {
		t.Fatalf("alice write ice: %v", err)
	}

	var bobIce signal.Envelope
	if err := wsBob.ReadJSON(&bobIce); err != nil {
		t.Fatalf("bob read ice: %v", err)
	}
	if bobIce.Type != "ice-candidate" || bobIce.From != "alice" {
		t.Fatalf("unexpected ice candidate received by bob: %+v", bobIce)
	}

	// Alice sends Offer to unknown peer Charlie -> should receive error
	unknownMsg := map[string]interface{}{
		"type":    "offer",
		"to":      "charlie",
		"payload": offerPayload,
	}
	if err := wsAlice.WriteJSON(unknownMsg); err != nil {
		t.Fatalf("alice write unknown: %v", err)
	}

	var errResp signal.ErrorResponse
	if err := wsAlice.ReadJSON(&errResp); err != nil {
		t.Fatalf("alice read error: %v", err)
	}
	if errResp.Type != "error" || !strings.Contains(errResp.Message, "peer not found") {
		t.Fatalf("unexpected error response: %+v", errResp)
	}
}

func TestHub_UnregisteredOperations(t *testing.T) {
	tr := tracker.NewTracker()
	hub := NewHub(tr)

	server := httptest.NewServer(http.HandlerFunc(hub.ServeWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer ws.Close()

	// Try announcing without registering
	annMsg := map[string]interface{}{
		"type":       "announce",
		"modelId":    "model-xyz",
		"chunksHeld": []uint32{0},
	}
	_ = ws.WriteJSON(annMsg)

	var errResp signal.ErrorResponse
	_ = ws.ReadJSON(&errResp)
	if errResp.Type != "error" || !strings.Contains(errResp.Message, "unregistered") {
		t.Fatalf("expected unregistered error, got %+v", errResp)
	}

	// Try signaling without registering
	_ = ws.WriteJSON(map[string]string{"type": "offer", "to": "bob"})
	_ = ws.ReadJSON(&errResp)
	if errResp.Type != "error" || !strings.Contains(errResp.Message, "unregistered") {
		t.Fatalf("expected unregistered error, got %+v", errResp)
	}

	// Unknown message type
	_ = ws.WriteJSON(map[string]string{"type": "some-random-type"})
	_ = ws.ReadJSON(&errResp)
	if errResp.Type != "error" || !strings.Contains(errResp.Message, "unknown message type") {
		t.Fatalf("expected unknown message type error, got %+v", errResp)
	}
}
