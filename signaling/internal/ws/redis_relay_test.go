package ws_test

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"torrentia/signaling/internal/signal"
	"torrentia/signaling/internal/tracker"
	"torrentia/signaling/internal/ws"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

// mockRedisServer provides a minimal RESP2 server handling PING, PSUBSCRIBE, and PUBLISH for tests.
type mockRedisServer struct {
	ln          net.Listener
	mu          sync.Mutex
	subscribers map[string][]net.Conn
	conns       []net.Conn
	closed      bool
}

func startMockRedisServer(t *testing.T) *mockRedisServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("start mock redis listener: %v", err)
	}

	s := &mockRedisServer{
		ln:          ln,
		subscribers: make(map[string][]net.Conn),
	}

	go s.acceptLoop()
	t.Cleanup(s.close)
	return s
}

func (s *mockRedisServer) Addr() string {
	return s.ln.Addr().String()
}

func (s *mockRedisServer) close() {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return
	}
	s.closed = true
	_ = s.ln.Close()
	for _, c := range s.conns {
		_ = c.Close()
	}
	s.mu.Unlock()
}

func (s *mockRedisServer) acceptLoop() {
	for {
		conn, err := s.ln.Accept()
		if err != nil {
			return
		}
		s.mu.Lock()
		s.conns = append(s.conns, conn)
		s.mu.Unlock()
		go s.handleConn(conn)
	}
}

func (s *mockRedisServer) handleConn(conn net.Conn) {
	defer conn.Close()
	r := bufio.NewReader(conn)

	for {
		cmd, err := readRESPCommand(r)
		if err != nil {
			return
		}
		if len(cmd) == 0 {
			continue
		}

		op := strings.ToUpper(cmd[0])
		switch op {
		case "HELLO":
			_, _ = conn.Write([]byte("-ERR unknown command 'HELLO'\r\n"))

		case "PING":
			_, _ = conn.Write([]byte("+PONG\r\n"))

		case "PSUBSCRIBE":
			if len(cmd) > 1 {
				pattern := cmd[1]
				s.mu.Lock()
				s.subscribers[pattern] = append(s.subscribers[pattern], conn)
				s.mu.Unlock()

				resp := fmt.Sprintf("*3\r\n$10\r\npsubscribe\r\n$%d\r\n%s\r\n:1\r\n", len(pattern), pattern)
				_, _ = conn.Write([]byte(resp))
			}

		case "PUBLISH":
			if len(cmd) > 2 {
				channel := cmd[1]
				payload := cmd[2]

				// Acknowledge publish
				_, _ = conn.Write([]byte(":1\r\n"))

				// Forward pmessage to matching subscribers
				s.mu.Lock()
				for pat, subs := range s.subscribers {
					if matchPattern(pat, channel) {
						pm := fmt.Sprintf("*4\r\n$8\r\npmessage\r\n$%d\r\n%s\r\n$%d\r\n%s\r\n$%d\r\n%s\r\n",
							len(pat), pat, len(channel), channel, len(payload), payload)
						for _, sub := range subs {
							_, _ = sub.Write([]byte(pm))
						}
					}
				}
				s.mu.Unlock()
			}

		default:
			_, _ = conn.Write([]byte("+OK\r\n"))
		}
	}
}

func matchPattern(pattern, channel string) bool {
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(channel, prefix)
	}
	return pattern == channel
}

func readRESPCommand(r *bufio.Reader) ([]string, error) {
	line, err := r.ReadString('\n')
	if err != nil {
		return nil, err
	}
	line = strings.TrimSpace(line)
	if len(line) == 0 || line[0] != '*' {
		return nil, nil
	}

	count, err := strconv.Atoi(line[1:])
	if err != nil || count <= 0 {
		return nil, err
	}

	args := make([]string, 0, count)
	for i := 0; i < count; i++ {
		lenLine, err := r.ReadString('\n')
		if err != nil {
			return nil, err
		}
		lenLine = strings.TrimSpace(lenLine)
		if len(lenLine) == 0 || lenLine[0] != '$' {
			return nil, fmt.Errorf("expected $, got %s", lenLine)
		}

		argLen, err := strconv.Atoi(lenLine[1:])
		if err != nil {
			return nil, err
		}

		buf := make([]byte, argLen+2)
		if _, err := io.ReadFull(r, buf); err != nil {
			return nil, err
		}
		args = append(args, string(buf[:argLen]))
	}

	return args, nil
}

func TestHub_RedisPubSubCrossInstanceRelay(t *testing.T) {
	mockRedis := startMockRedisServer(t)

	// Create Redis client for Node 1
	rdb1 := redis.NewClient(&redis.Options{
		Addr:     mockRedis.Addr(),
		Protocol: 2,
	})
	t.Cleanup(func() { _ = rdb1.Close() })

	// Create Redis client for Node 2
	rdb2 := redis.NewClient(&redis.Options{
		Addr:     mockRedis.Addr(),
		Protocol: 2,
	})
	t.Cleanup(func() { _ = rdb2.Close() })

	// Create Hub 1 (representing Server Replica 1)
	tr1 := tracker.NewTracker()
	hub1 := ws.NewHubWithConfig(tr1, ws.HubConfig{
		RedisClient: rdb1,
	})
	t.Cleanup(func() { _ = hub1.Close() })

	// Create Hub 2 (representing Server Replica 2)
	tr2 := tracker.NewTracker()
	hub2 := ws.NewHubWithConfig(tr2, ws.HubConfig{
		RedisClient: rdb2,
	})
	t.Cleanup(func() { _ = hub2.Close() })

	// Give Redis pubsub subscriptions time to establish
	time.Sleep(50 * time.Millisecond)

	s1 := httptest.NewServer(http.HandlerFunc(hub1.ServeWS))
	t.Cleanup(s1.Close)

	s2 := httptest.NewServer(http.HandlerFunc(hub2.ServeWS))
	t.Cleanup(s2.Close)

	// 1. Connect Peer A to Node 1
	wsURL1 := "ws" + strings.TrimPrefix(s1.URL, "http")
	connA, _, err := websocket.DefaultDialer.Dial(wsURL1, nil)
	if err != nil {
		t.Fatalf("connect peer A failed: %v", err)
	}
	defer connA.Close()

	_ = connA.WriteJSON(map[string]string{
		"type":    "register",
		"peerId":  "peer-a",
		"address": "0x1111111111111111111111111111111111111111",
	})
	var ackA map[string]string
	_ = connA.ReadJSON(&ackA)

	// 2. Connect Peer B to Node 2
	wsURL2 := "ws" + strings.TrimPrefix(s2.URL, "http")
	connB, _, err := websocket.DefaultDialer.Dial(wsURL2, nil)
	if err != nil {
		t.Fatalf("connect peer B failed: %v", err)
	}
	defer connB.Close()

	_ = connB.WriteJSON(map[string]string{
		"type":    "register",
		"peerId":  "peer-b",
		"address": "0x2222222222222222222222222222222222222222",
	})
	var ackB map[string]string
	_ = connB.ReadJSON(&ackB)

	// Verify Peer A is only in Hub 1 and Peer B is only in Hub 2
	if _, ok := hub1.GetPeer("peer-a"); !ok {
		t.Fatalf("peer A should be on hub 1")
	}
	if _, ok := hub1.GetPeer("peer-b"); ok {
		t.Fatalf("peer B should not be on hub 1")
	}
	if _, ok := hub2.GetPeer("peer-b"); !ok {
		t.Fatalf("peer B should be on hub 2")
	}

	// 3. Peer A on Node 1 sends SDP Offer to Peer B on Node 2
	offerPayload := `{"sdp":"v=0\r\no=alice 123...","type":"offer"}`
	err = connA.WriteJSON(map[string]interface{}{
		"type":    "offer",
		"to":      "peer-b",
		"payload": json.RawMessage(offerPayload),
	})
	if err != nil {
		t.Fatalf("peer A send offer failed: %v", err)
	}

	// 4. Peer B on Node 2 receives the relayed Offer from Redis Pub/Sub
	var receivedOffer signal.Envelope
	readDone := make(chan error, 1)
	go func() {
		readDone <- connB.ReadJSON(&receivedOffer)
	}()

	select {
	case err := <-readDone:
		if err != nil {
			t.Fatalf("peer B read relayed offer failed: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("timed out waiting for relayed offer on peer B")
	}

	if receivedOffer.Type != "offer" || receivedOffer.From != "peer-a" || receivedOffer.To != "peer-b" {
		t.Fatalf("unexpected relayed offer: %+v", receivedOffer)
	}
	if string(receivedOffer.Payload) != offerPayload {
		t.Fatalf("expected payload %s, got %s", offerPayload, string(receivedOffer.Payload))
	}

	// 5. Peer B on Node 2 sends SDP Answer back to Peer A on Node 1
	answerPayload := `{"sdp":"v=0\r\no=bob 456...","type":"answer"}`
	err = connB.WriteJSON(map[string]interface{}{
		"type":    "answer",
		"to":      "peer-a",
		"payload": json.RawMessage(answerPayload),
	})
	if err != nil {
		t.Fatalf("peer B send answer failed: %v", err)
	}

	// 6. Peer A on Node 1 receives the relayed Answer
	var receivedAnswer signal.Envelope
	readAnswerDone := make(chan error, 1)
	go func() {
		readAnswerDone <- connA.ReadJSON(&receivedAnswer)
	}()

	select {
	case err := <-readAnswerDone:
		if err != nil {
			t.Fatalf("peer A read relayed answer failed: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("timed out waiting for relayed answer on peer A")
	}

	if receivedAnswer.Type != "answer" || receivedAnswer.From != "peer-b" || receivedAnswer.To != "peer-a" {
		t.Fatalf("unexpected relayed answer: %+v", receivedAnswer)
	}
	if string(receivedAnswer.Payload) != answerPayload {
		t.Fatalf("expected payload %s, got %s", answerPayload, string(receivedAnswer.Payload))
	}
}
