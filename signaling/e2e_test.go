package main_test

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"torrentia/signaling/internal/auth"
	"torrentia/signaling/internal/signal"
	"torrentia/signaling/internal/tracker"
	"torrentia/signaling/internal/ws"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gorilla/websocket"
)

func setupAuthenticatedServer(t *testing.T, authSecret []byte) (*httptest.Server, *tracker.Tracker, *ws.Hub, auth.ChallengeStore) {
	t.Helper()

	tr := tracker.NewTracker()
	challengeStore := auth.NewMemoryChallengeStore()
	hub := ws.NewHubWithConfig(tr, ws.HubConfig{
		AuthRequired: true,
		AuthSecret:   authSecret,
	})

	mux := http.NewServeMux()

	mux.HandleFunc("/v1/auth/challenge", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Address string `json:"address"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Address == "" {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}
		ch, err := challengeStore.CreateChallenge(req.Address)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ch)
	})

	mux.HandleFunc("/v1/auth/session", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Address   string `json:"address"`
			Signature string `json:"signature"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Address == "" || req.Signature == "" {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		ch, err := challengeStore.ConsumeChallenge(req.Address)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		if err := auth.VerifySignature(ch.Message, req.Signature, req.Address); err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		token, peerID, expiresAt, err := auth.GenerateSessionToken(req.Address, authSecret)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"token":     token,
			"peerId":    peerID,
			"expiresAt": expiresAt,
		})
	})

	mux.HandleFunc("/ws", hub.ServeWS)

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		uniquePeers, totalSeeders := tr.Stats()
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "ok",
			"peers":   uniquePeers,
			"seeders": totalSeeders,
		})
	})

	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)

	return server, tr, hub, challengeStore
}

func authenticateWallet(t *testing.T, serverURL string, privKey *ecdsa.PrivateKey) (token string, peerID string, address string) {
	t.Helper()
	address = crypto.PubkeyToAddress(privKey.PublicKey).Hex()

	// 1. Request challenge
	body, _ := json.Marshal(map[string]string{"address": address})
	resp, err := http.Post(serverURL+"/v1/auth/challenge", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("challenge request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from challenge, got %d", resp.StatusCode)
	}

	var ch auth.Challenge
	if err := json.NewDecoder(resp.Body).Decode(&ch); err != nil {
		t.Fatalf("decode challenge failed: %v", err)
	}

	// 2. Sign challenge message using EIP-191
	digest := auth.ComputePersonalSignHash(ch.Message)
	sig, err := crypto.Sign(digest, privKey)
	if err != nil {
		t.Fatalf("sign digest failed: %v", err)
	}
	sig[64] += 27 // Ethereum format
	sigHex := "0x" + hex.EncodeToString(sig)

	// 3. Request session
	sessBody, _ := json.Marshal(map[string]string{
		"address":   address,
		"signature": sigHex,
	})
	sessResp, err := http.Post(serverURL+"/v1/auth/session", "application/json", bytes.NewReader(sessBody))
	if err != nil {
		t.Fatalf("session request failed: %v", err)
	}
	defer sessResp.Body.Close()
	if sessResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from session, got %d", sessResp.StatusCode)
	}

	var sess struct {
		Token     string `json:"token"`
		PeerID    string `json:"peerId"`
		ExpiresAt int64  `json:"expiresAt"`
	}
	if err := json.NewDecoder(sessResp.Body).Decode(&sess); err != nil {
		t.Fatalf("decode session response failed: %v", err)
	}

	return sess.Token, sess.PeerID, address
}

func setupTestServer(t *testing.T, heartbeatTimeout time.Duration) (*httptest.Server, *tracker.Tracker, *ws.Hub) {
	t.Helper()

	tr := tracker.NewTracker()
	hub := ws.NewHub(tr)

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	tr.StartEvictionLoop(ctx, heartbeatTimeout, heartbeatTimeout/3)

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", hub.ServeWS)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		uniquePeers, totalSeeders := tr.Stats()
		connectedPeers := hub.PeerCount()
		reportedPeers := connectedPeers
		if uniquePeers > reportedPeers {
			reportedPeers = uniquePeers
		}

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "ok",
			"peers":   reportedPeers,
			"seeders": totalSeeders,
		})
	})

	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)

	return server, tr, hub
}

func dialWS(t *testing.T, serverURL string) *websocket.Conn {
	t.Helper()
	wsURL := "ws" + strings.TrimPrefix(serverURL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect to ws: %v", err)
	}
	return conn
}

func registerPeer(t *testing.T, conn *websocket.Conn, peerID, address string) {
	t.Helper()
	msg := map[string]string{
		"type":    "register",
		"peerId":  peerID,
		"address": address,
	}
	if err := conn.WriteJSON(msg); err != nil {
		t.Fatalf("failed to register peer %s: %v", peerID, err)
	}

	var ack map[string]string
	if err := conn.ReadJSON(&ack); err != nil {
		t.Fatalf("failed to read register ack for %s: %v", peerID, err)
	}
	if ack["type"] != "registered" || ack["peerId"] != peerID {
		t.Fatalf("unexpected register ack for %s: %+v", peerID, ack)
	}
}

func TestE2E_FullWebRTCSignalingAndTrackingFlow(t *testing.T) {
	server, tr, hub := setupTestServer(t, 2*time.Second)

	// Verify initial health check
	resp, err := http.Get(server.URL + "/health")
	if err != nil {
		t.Fatalf("health check failed: %v", err)
	}
	defer resp.Body.Close()

	var health map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&health)
	if health["status"] != "ok" || health["peers"].(float64) != 0 {
		t.Fatalf("unexpected initial health response: %+v", health)
	}

	// 1. Connect Seeder (Alice)
	connAlice := dialWS(t, server.URL)
	defer connAlice.Close()
	registerPeer(t, connAlice, "peer-alice", "0x1111111111111111111111111111111111111111")

	// 2. Alice announces model chunks
	modelID := "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
	chunksHeld := []uint32{0, 1, 2, 3, 4}
	if err := connAlice.WriteJSON(map[string]interface{}{
		"type":       "announce",
		"modelId":    modelID,
		"chunksHeld": chunksHeld,
	}); err != nil {
		t.Fatalf("alice announce failed: %v", err)
	}

	var annAck map[string]string
	if err := connAlice.ReadJSON(&annAck); err != nil {
		t.Fatalf("alice read announce ack: %v", err)
	}
	if annAck["type"] != "announced" || annAck["modelId"] != modelID {
		t.Fatalf("unexpected announce ack: %+v", annAck)
	}

	// 3. Connect Downloader (Bob)
	connBob := dialWS(t, server.URL)
	defer connBob.Close()
	registerPeer(t, connBob, "peer-bob", "0x2222222222222222222222222222222222222222")

	// Verify health check reflects 2 connected peers
	resp2, err := http.Get(server.URL + "/health")
	if err != nil {
		t.Fatalf("second health check failed: %v", err)
	}
	defer resp2.Body.Close()
	var health2 map[string]interface{}
	_ = json.NewDecoder(resp2.Body).Decode(&health2)
	if health2["peers"].(float64) != 2 || health2["seeders"].(float64) != 1 {
		t.Fatalf("unexpected health after peers connected: %+v", health2)
	}

	// 4. Bob queries seeders for modelID
	if err := connBob.WriteJSON(map[string]string{
		"type":    "query",
		"modelId": modelID,
	}); err != nil {
		t.Fatalf("bob query failed: %v", err)
	}

	var qResp ws.QueryResponse
	if err := connBob.ReadJSON(&qResp); err != nil {
		t.Fatalf("bob read query response: %v", err)
	}
	if qResp.Type != "seeders" || qResp.ModelID != modelID || len(qResp.Seeders) != 1 {
		t.Fatalf("unexpected query response: %+v", qResp)
	}
	seeder := qResp.Seeders[0]
	if seeder.PeerID != "peer-alice" || seeder.Address != "0x1111111111111111111111111111111111111111" {
		t.Fatalf("unexpected seeder dto: %+v", seeder)
	}
	if len(seeder.ChunksHeld) != len(chunksHeld) {
		t.Fatalf("expected %d chunks, got %d", len(chunksHeld), len(seeder.ChunksHeld))
	}

	// 5. Bob sends WebRTC SDP Offer to Alice
	sdpOffer := `{"sdp":"v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n","type":"offer"}`
	if err := connBob.WriteJSON(map[string]interface{}{
		"type":    "offer",
		"to":      "peer-alice",
		"payload": json.RawMessage(sdpOffer),
	}); err != nil {
		t.Fatalf("bob send offer failed: %v", err)
	}

	// Alice receives Offer verbatim
	var aliceOffer signal.Envelope
	if err := connAlice.ReadJSON(&aliceOffer); err != nil {
		t.Fatalf("alice read offer failed: %v", err)
	}
	if aliceOffer.Type != "offer" || aliceOffer.From != "peer-bob" || aliceOffer.To != "peer-alice" {
		t.Fatalf("unexpected offer received by alice: %+v", aliceOffer)
	}
	if string(aliceOffer.Payload) != sdpOffer {
		t.Fatalf("sdp payload was altered! expected %s, got %s", sdpOffer, string(aliceOffer.Payload))
	}

	// 6. Alice sends WebRTC SDP Answer to Bob
	sdpAnswer := `{"sdp":"v=0\r\no=- 67890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n","type":"answer"}`
	if err := connAlice.WriteJSON(map[string]interface{}{
		"type":    "answer",
		"to":      "peer-bob",
		"payload": json.RawMessage(sdpAnswer),
	}); err != nil {
		t.Fatalf("alice send answer failed: %v", err)
	}

	// Bob receives Answer verbatim
	var bobAnswer signal.Envelope
	if err := connBob.ReadJSON(&bobAnswer); err != nil {
		t.Fatalf("bob read answer failed: %v", err)
	}
	if bobAnswer.Type != "answer" || bobAnswer.From != "peer-alice" || bobAnswer.To != "peer-bob" {
		t.Fatalf("unexpected answer received by bob: %+v", bobAnswer)
	}
	if string(bobAnswer.Payload) != sdpAnswer {
		t.Fatalf("answer payload was altered! expected %s, got %s", sdpAnswer, string(bobAnswer.Payload))
	}

	// 7. Bob sends ICE candidate to Alice
	iceCandidate := `{"candidate":"candidate:842163049 1 udp 1677729535 192.168.1.2 55555 typ srflx raddr 192.168.1.2 rport 55555","sdpMLineIndex":0,"sdpMid":"0"}`
	if err := connBob.WriteJSON(map[string]interface{}{
		"type":    "ice-candidate",
		"to":      "peer-alice",
		"payload": json.RawMessage(iceCandidate),
	}); err != nil {
		t.Fatalf("bob send ice failed: %v", err)
	}

	var aliceIce signal.Envelope
	if err := connAlice.ReadJSON(&aliceIce); err != nil {
		t.Fatalf("alice read ice failed: %v", err)
	}
	if aliceIce.Type != "ice-candidate" || aliceIce.From != "peer-bob" {
		t.Fatalf("unexpected ice candidate received by alice: %+v", aliceIce)
	}
	if string(aliceIce.Payload) != iceCandidate {
		t.Fatalf("ice candidate payload was altered! expected %s, got %s", iceCandidate, string(aliceIce.Payload))
	}

	// 8. Bob sends message to non-existent peer Charlie -> receives error response
	if err := connBob.WriteJSON(map[string]interface{}{
		"type":    "offer",
		"to":      "peer-charlie",
		"payload": json.RawMessage(`{}`),
	}); err != nil {
		t.Fatalf("bob send unknown failed: %v", err)
	}

	var errResp signal.ErrorResponse
	if err := connBob.ReadJSON(&errResp); err != nil {
		t.Fatalf("bob read error failed: %v", err)
	}
	if errResp.Type != "error" || !strings.Contains(errResp.Message, "peer not found: peer-charlie") {
		t.Fatalf("expected peer not found error, got %+v", errResp)
	}

	// 9. Alice disconnects -> Bob queries again -> seeders should be empty
	_ = connAlice.Close()
	time.Sleep(100 * time.Millisecond)

	if err := connBob.WriteJSON(map[string]string{
		"type":    "query",
		"modelId": modelID,
	}); err != nil {
		t.Fatalf("bob query 2 failed: %v", err)
	}

	var qResp2 ws.QueryResponse
	if err := connBob.ReadJSON(&qResp2); err != nil {
		t.Fatalf("bob read query 2 response: %v", err)
	}
	if len(qResp2.Seeders) != 0 {
		t.Fatalf("expected 0 seeders after alice disconnected, got %d", len(qResp2.Seeders))
	}

	if hub.PeerCount() != 1 {
		t.Fatalf("expected 1 connected peer (bob), got %d", hub.PeerCount())
	}

	_ = tr
}

func TestE2E_HeartbeatTimeoutEviction(t *testing.T) {
	// Set heartbeat timeout to 200ms
	server, tr, _ := setupTestServer(t, 200*time.Millisecond)

	conn := dialWS(t, server.URL)
	defer conn.Close()

	registerPeer(t, conn, "seeder-tim", "0x9999")
	modelID := "model-hb-test"
	_ = conn.WriteJSON(map[string]interface{}{
		"type":       "announce",
		"modelId":    modelID,
		"chunksHeld": []uint32{0},
	})

	var annAck map[string]string
	_ = conn.ReadJSON(&annAck)

	// Keep alive with heartbeat for 200ms
	for i := 0; i < 3; i++ {
		time.Sleep(50 * time.Millisecond)
		_ = conn.WriteJSON(map[string]string{"type": "heartbeat"})
	}

	// Verify seeder is still in tracker
	seeders := tr.Query(modelID)
	if len(seeders) != 1 {
		t.Fatalf("expected seeder to remain active with heartbeats, got %d", len(seeders))
	}

	// Stop sending heartbeat and wait for timeout eviction
	time.Sleep(350 * time.Millisecond)

	seeders = tr.Query(modelID)
	if len(seeders) != 0 {
		t.Fatalf("expected seeder to be evicted after inactivity, got %d", len(seeders))
	}
	fmt.Printf("seeder successfully evicted after heartbeat timeout\n")
}

func TestE2E_AuthenticatedSessionAndSignalingFlow(t *testing.T) {
	authSecret := []byte("torrentia-e2e-testing-secret-key-32b")
	server, _, hub, _ := setupAuthenticatedServer(t, authSecret)

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"

	// 1. Connecting without token must fail with 401
	_, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err == nil || resp == nil || resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized without token, got status: %v, err: %v", resp, err)
	}

	// 2. Connecting with invalid token must fail with 401
	_, resp2, err := websocket.DefaultDialer.Dial(wsURL+"?token=invalid.signature.token", nil)
	if err == nil || resp2 == nil || resp2.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized with invalid token, got status: %v, err: %v", resp2, err)
	}

	// 3. Generate keypair and authenticate Alice
	alicePriv, _ := crypto.GenerateKey()
	aliceToken, alicePeerID, aliceAddr := authenticateWallet(t, server.URL, alicePriv)

	// Verify replay attack fails (cannot use consumed challenge again)
	digest := auth.ComputePersonalSignHash("dummy")
	sig, _ := crypto.Sign(digest, alicePriv)
	sig[64] += 27
	replayBody, _ := json.Marshal(map[string]string{
		"address":   aliceAddr,
		"signature": "0x" + hex.EncodeToString(sig),
	})
	replayResp, _ := http.Post(server.URL+"/v1/auth/session", "application/json", bytes.NewReader(replayBody))
	if replayResp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 on replay attempt, got %d", replayResp.StatusCode)
	}
	replayResp.Body.Close()

	// 4. Alice connects to WebSocket using session token
	connAlice, _, err := websocket.DefaultDialer.Dial(wsURL+"?token="+aliceToken, nil)
	if err != nil {
		t.Fatalf("alice failed to connect via token: %v", err)
	}
	defer connAlice.Close()

	// Alice receives automatic registration confirmation with token claims
	var aliceRegAck map[string]string
	if err := connAlice.ReadJSON(&aliceRegAck); err != nil {
		t.Fatalf("alice read registered ack failed: %v", err)
	}
	if aliceRegAck["type"] != "registered" || aliceRegAck["peerId"] != alicePeerID || aliceRegAck["address"] != aliceAddr {
		t.Fatalf("unexpected registered ack for alice: %+v", aliceRegAck)
	}

	// 5. Attempting manual re-registration must be rejected
	if err := connAlice.WriteJSON(map[string]string{
		"type":   "register",
		"peerId": "spoofed-peer-id",
	}); err != nil {
		t.Fatalf("alice send register failed: %v", err)
	}
	var errResp signal.ErrorResponse
	if err := connAlice.ReadJSON(&errResp); err != nil {
		t.Fatalf("alice read re-registration error failed: %v", err)
	}
	if errResp.Type != "error" || !strings.Contains(errResp.Message, "cannot re-register identity") {
		t.Fatalf("expected already authenticated error, got: %+v", errResp)
	}

	// 6. Alice announces chunks for model, attempting to spoof address
	modelID := "0xauthenticated_model_001"
	chunksHeld := []uint32{0, 1, 2, 3}
	if err := connAlice.WriteJSON(map[string]interface{}{
		"type":       "announce",
		"modelId":    modelID,
		"address":    "0x9999999999999999999999999999999999999999", // Spoofed address
		"chunksHeld": chunksHeld,
	}); err != nil {
		t.Fatalf("alice announce failed: %v", err)
	}
	var annAck map[string]string
	if err := connAlice.ReadJSON(&annAck); err != nil {
		t.Fatalf("alice read announce ack: %v", err)
	}

	// 7. Generate keypair and authenticate Bob
	bobPriv, _ := crypto.GenerateKey()
	bobToken, bobPeerID, _ := authenticateWallet(t, server.URL, bobPriv)

	connBob, _, err := websocket.DefaultDialer.Dial(wsURL+"?token="+bobToken, nil)
	if err != nil {
		t.Fatalf("bob failed to connect via token: %v", err)
	}
	defer connBob.Close()

	var bobRegAck map[string]string
	if err := connBob.ReadJSON(&bobRegAck); err != nil {
		t.Fatalf("bob read registered ack failed: %v", err)
	}
	if bobRegAck["peerId"] != bobPeerID {
		t.Fatalf("unexpected bob peer ID: %s", bobRegAck["peerId"])
	}

	// 8. Bob queries seeders for modelID -> verifies that Alice's verified address was enforced
	if err := connBob.WriteJSON(map[string]string{
		"type":    "query",
		"modelId": modelID,
	}); err != nil {
		t.Fatalf("bob query failed: %v", err)
	}

	var qResp ws.QueryResponse
	if err := connBob.ReadJSON(&qResp); err != nil {
		t.Fatalf("bob read query response: %v", err)
	}
	if len(qResp.Seeders) != 1 {
		t.Fatalf("expected 1 seeder, got %d", len(qResp.Seeders))
	}
	seeder := qResp.Seeders[0]
	if seeder.PeerID != alicePeerID {
		t.Fatalf("expected seeder peerId %s, got %s", alicePeerID, seeder.PeerID)
	}
	if seeder.Address != aliceAddr {
		t.Fatalf("address spoofing not prevented! expected authenticated address %s, got %s", aliceAddr, seeder.Address)
	}

	// 9. Bob sends WebRTC SDP Offer to Alice
	sdpOffer := `{"sdp":"v=0\r\no=bob 111...","type":"offer"}`
	if err := connBob.WriteJSON(map[string]interface{}{
		"type":    "offer",
		"to":      alicePeerID,
		"payload": json.RawMessage(sdpOffer),
	}); err != nil {
		t.Fatalf("bob send offer failed: %v", err)
	}

	var aliceOffer signal.Envelope
	if err := connAlice.ReadJSON(&aliceOffer); err != nil {
		t.Fatalf("alice read offer failed: %v", err)
	}
	if aliceOffer.Type != "offer" || aliceOffer.From != bobPeerID || aliceOffer.To != alicePeerID {
		t.Fatalf("unexpected offer received: %+v", aliceOffer)
	}

	// 10. Alice sends WebRTC SDP Answer to Bob
	sdpAnswer := `{"sdp":"v=0\r\no=alice 222...","type":"answer"}`
	if err := connAlice.WriteJSON(map[string]interface{}{
		"type":    "answer",
		"to":      bobPeerID,
		"payload": json.RawMessage(sdpAnswer),
	}); err != nil {
		t.Fatalf("alice send answer failed: %v", err)
	}

	var bobAnswer signal.Envelope
	if err := connBob.ReadJSON(&bobAnswer); err != nil {
		t.Fatalf("bob read answer failed: %v", err)
	}
	if bobAnswer.Type != "answer" || bobAnswer.From != alicePeerID || bobAnswer.To != bobPeerID {
		t.Fatalf("unexpected answer received: %+v", bobAnswer)
	}

	// 11. Bob sends ICE candidate to Alice
	iceCandidate := `{"candidate":"candidate:1 1 UDP 1 127.0.0.1 5000 typ host","sdpMid":"0"}`
	if err := connBob.WriteJSON(map[string]interface{}{
		"type":    "ice-candidate",
		"to":      alicePeerID,
		"payload": json.RawMessage(iceCandidate),
	}); err != nil {
		t.Fatalf("bob send ice failed: %v", err)
	}

	var aliceIce signal.Envelope
	if err := connAlice.ReadJSON(&aliceIce); err != nil {
		t.Fatalf("alice read ice failed: %v", err)
	}
	if aliceIce.Type != "ice-candidate" || aliceIce.From != bobPeerID {
		t.Fatalf("unexpected ice candidate: %+v", aliceIce)
	}

	// 12. Alice disconnects -> Bob queries again -> seeders should be empty
	_ = connAlice.Close()
	time.Sleep(100 * time.Millisecond)

	if err := connBob.WriteJSON(map[string]string{
		"type":    "query",
		"modelId": modelID,
	}); err != nil {
		t.Fatalf("bob query 2 failed: %v", err)
	}
	var qResp2 ws.QueryResponse
	if err := connBob.ReadJSON(&qResp2); err != nil {
		t.Fatalf("bob read query 2 response: %v", err)
	}
	if len(qResp2.Seeders) != 0 {
		t.Fatalf("expected 0 seeders after alice disconnect, got %d", len(qResp2.Seeders))
	}

	if hub.PeerCount() != 1 {
		t.Fatalf("expected 1 peer remaining (bob), got %d", hub.PeerCount())
	}
}

func TestE2E_QuotasAndLimits(t *testing.T) {
	authSecret := []byte("torrentia-e2e-testing-secret-key-32b")
	server, _, _, _ := setupAuthenticatedServer(t, authSecret)

	alicePriv, _ := crypto.GenerateKey()
	aliceToken, _, _ := authenticateWallet(t, server.URL, alicePriv)

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL+"?token="+aliceToken, nil)
	if err != nil {
		t.Fatalf("connect failed: %v", err)
	}
	defer conn.Close()

	var regAck map[string]string
	_ = conn.ReadJSON(&regAck)

	// 1. Quota check: >500k chunks advertised in announce must be rejected
	oversizedChunks := make([]uint32, 500_001)
	_ = conn.WriteJSON(map[string]interface{}{
		"type":       "announce",
		"modelId":    "model-quota-check",
		"chunksHeld": oversizedChunks,
	})

	var errResp signal.ErrorResponse
	if err := conn.ReadJSON(&errResp); err != nil {
		t.Fatalf("read quota error failed: %v", err)
	}
	if errResp.Type != "error" || !strings.Contains(errResp.Message, "chunk count exceeds quota") {
		t.Fatalf("expected chunk quota error, got: %+v", errResp)
	}

	// 2. Payload size check: >64KB signaling payload must be rejected
	largeSDP := strings.Repeat("a", 65*1024)
	_ = conn.WriteJSON(map[string]interface{}{
		"type":    "offer",
		"to":      "some-peer",
		"payload": json.RawMessage(fmt.Sprintf(`{"sdp":"%s"}`, largeSDP)),
	})

	var errResp2 signal.ErrorResponse
	if err := conn.ReadJSON(&errResp2); err != nil {
		t.Fatalf("read size error failed: %v", err)
	}
	if errResp2.Type != "error" || !strings.Contains(errResp2.Message, "exceeds 64KB limit") {
		t.Fatalf("expected payload size error, got: %+v", errResp2)
	}
}
