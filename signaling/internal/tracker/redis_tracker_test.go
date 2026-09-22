package tracker_test

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync"
	"testing"

	"torrentia/signaling/internal/tracker"

	"github.com/redis/go-redis/v9"
)

func TestRedisTracker_BadURL(t *testing.T) {
	_, err := tracker.NewRedisTracker("::invalid-url::")
	if err == nil {
		t.Fatal("expected error on malformed redis url")
	}

	// Non-existent server should fail on Ping
	_, err = tracker.NewRedisTracker("redis://127.0.0.1:54321")
	if err == nil {
		t.Fatal("expected error connecting to non-existent redis instance")
	}
}

// mockTrackerRedisServer emulates Redis RESP protocol for testing RedisTracker pipelines.
type mockTrackerRedisServer struct {
	ln       net.Listener
	mu       sync.Mutex
	strings  map[string]string
	sets     map[string]map[string]bool
	zsets    map[string]map[string]float64
	conns    []net.Conn
	closed   bool
}

func startMockTrackerRedis(t *testing.T) *mockTrackerRedisServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen failed: %v", err)
	}

	s := &mockTrackerRedisServer{
		ln:      ln,
		strings: make(map[string]string),
		sets:    make(map[string]map[string]bool),
		zsets:   make(map[string]map[string]float64),
	}

	go s.acceptLoop()
	t.Cleanup(s.close)
	return s
}

func (s *mockTrackerRedisServer) Addr() string {
	return s.ln.Addr().String()
}

func (s *mockTrackerRedisServer) close() {
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

func (s *mockTrackerRedisServer) acceptLoop() {
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

func (s *mockTrackerRedisServer) handleConn(conn net.Conn) {
	defer conn.Close()
	r := bufio.NewReader(conn)

	for {
		cmd, err := readTrackerRESP(r)
		if err != nil {
			return
		}
		if len(cmd) == 0 {
			continue
		}

		op := strings.ToUpper(cmd[0])
		s.mu.Lock()

		switch op {
		case "HELLO":
			_, _ = conn.Write([]byte("-ERR unknown command 'HELLO'\r\n"))

		case "PING":
			_, _ = conn.Write([]byte("+PONG\r\n"))

		case "SET":
			if len(cmd) >= 3 {
				s.strings[cmd[1]] = cmd[2]
			}
			_, _ = conn.Write([]byte("+OK\r\n"))

		case "GET":
			if len(cmd) >= 2 {
				if val, ok := s.strings[cmd[1]]; ok {
					resp := fmt.Sprintf("$%d\r\n%s\r\n", len(val), val)
					_, _ = conn.Write([]byte(resp))
				} else {
					_, _ = conn.Write([]byte("$-1\r\n"))
				}
			}

		case "DEL":
			if len(cmd) >= 2 {
				delete(s.strings, cmd[1])
				delete(s.sets, cmd[1])
				delete(s.zsets, cmd[1])
			}
			_, _ = conn.Write([]byte(":1\r\n"))

		case "EXPIRE":
			_, _ = conn.Write([]byte(":1\r\n"))

		case "SADD":
			if len(cmd) >= 3 {
				key := cmd[1]
				if s.sets[key] == nil {
					s.sets[key] = make(map[string]bool)
				}
				for _, member := range cmd[2:] {
					s.sets[key][member] = true
				}
			}
			_, _ = conn.Write([]byte(":1\r\n"))

		case "SMEMBERS":
			if len(cmd) >= 2 {
				key := cmd[1]
				members := s.sets[key]
				var b strings.Builder
				b.WriteString(fmt.Sprintf("*%d\r\n", len(members)))
				for m := range members {
					b.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(m), m))
				}
				_, _ = conn.Write([]byte(b.String()))
			}

		case "ZADD":
			if len(cmd) >= 4 {
				key := cmd[1]
				score, _ := strconv.ParseFloat(cmd[2], 64)
				member := cmd[3]
				if s.zsets[key] == nil {
					s.zsets[key] = make(map[string]float64)
				}
				s.zsets[key][member] = score
			}
			_, _ = conn.Write([]byte(":1\r\n"))

		case "ZREM":
			if len(cmd) >= 3 {
				key := cmd[1]
				if s.zsets[key] != nil {
					delete(s.zsets[key], cmd[2])
				}
			}
			_, _ = conn.Write([]byte(":1\r\n"))

		case "ZRANGEBYSCORE":
			if len(cmd) >= 4 {
				key := cmd[1]
				minScore, _ := strconv.ParseFloat(cmd[2], 64)
				z := s.zsets[key]
				var matched []string
				for m, score := range z {
					if score >= minScore {
						matched = append(matched, m)
					}
				}
				var b strings.Builder
				b.WriteString(fmt.Sprintf("*%d\r\n", len(matched)))
				for _, m := range matched {
					b.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(m), m))
				}
				_, _ = conn.Write([]byte(b.String()))
			}

		case "SCAN":
			// Simple scan implementation: return cursor 0 and all zset keys
			var keys []string
			for k := range s.zsets {
				keys = append(keys, k)
			}
			var b strings.Builder
			b.WriteString("*2\r\n$1\r\n0\r\n") // cursor 0
			b.WriteString(fmt.Sprintf("*%d\r\n", len(keys)))
			for _, k := range keys {
				b.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(k), k))
			}
			_, _ = conn.Write([]byte(b.String()))

		default:
			_, _ = conn.Write([]byte("+OK\r\n"))
		}

		s.mu.Unlock()
	}
}

func readTrackerRESP(r *bufio.Reader) ([]string, error) {
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

func TestRedisTracker_Operations(t *testing.T) {
	mockServer := startMockTrackerRedis(t)

	rdb := redis.NewClient(&redis.Options{
		Addr:     mockServer.Addr(),
		Protocol: 2,
	})
	t.Cleanup(func() { _ = rdb.Close() })

	tr := tracker.NewRedisTrackerWithClient(rdb)
	t.Cleanup(func() { _ = tr.Close() })

	modelID := "model-alpha-123"
	peerID := "peer-seeder-1"
	address := "0x1111111111111111111111111111111111111111"
	chunks := []uint32{0, 1, 2, 5, 9}

	// 1. Announce seeder
	tr.Announce(modelID, peerID, address, chunks)

	// 2. Query model
	seeders := tr.Query(modelID)
	if len(seeders) != 1 {
		t.Fatalf("expected 1 seeder, got %d", len(seeders))
	}
	s := seeders[0]
	if s.PeerID != peerID || s.Address != address {
		t.Fatalf("unexpected seeder dto: %+v", s)
	}
	if len(s.ChunksHeld) != len(chunks) {
		t.Fatalf("expected %d chunks, got %d", len(chunks), len(s.ChunksHeld))
	}

	// 3. Heartbeat
	tr.Heartbeat(peerID)

	// 4. Stats
	models, uniqueSeeders := tr.Stats()
	if models != 1 || uniqueSeeders != 1 {
		t.Fatalf("expected 1 model and 1 unique seeder, got %d models, %d seeders", models, uniqueSeeders)
	}

	// 5. Remove peer
	tr.RemovePeer(peerID)

	seedersAfter := tr.Query(modelID)
	if len(seedersAfter) != 0 {
		t.Fatalf("expected 0 seeders after removal, got %d", len(seedersAfter))
	}
}
