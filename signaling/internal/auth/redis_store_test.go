package auth_test

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"torrentia/signaling/internal/auth"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/redis/go-redis/v9"
)

type mockAuthRedisServer struct {
	ln     net.Listener
	mu     sync.Mutex
	data   map[string]string
	conns  []net.Conn
	closed bool
}

func startMockAuthRedisServer(t *testing.T) *mockAuthRedisServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen failed: %v", err)
	}

	s := &mockAuthRedisServer{
		ln:   ln,
		data: make(map[string]string),
	}

	go s.acceptLoop()
	t.Cleanup(s.close)
	return s
}

func (s *mockAuthRedisServer) Addr() string {
	return s.ln.Addr().String()
}

func (s *mockAuthRedisServer) close() {
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

func (s *mockAuthRedisServer) acceptLoop() {
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

func (s *mockAuthRedisServer) handleConn(conn net.Conn) {
	defer conn.Close()
	r := bufio.NewReader(conn)

	for {
		cmd, err := readRESP(r)
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
		case "SET":
			if len(cmd) >= 3 {
				s.mu.Lock()
				s.data[cmd[1]] = cmd[2]
				s.mu.Unlock()
			}
			_, _ = conn.Write([]byte("+OK\r\n"))
		case "GET":
			if len(cmd) >= 2 {
				s.mu.Lock()
				val, ok := s.data[cmd[1]]
				s.mu.Unlock()
				if ok {
					resp := fmt.Sprintf("$%d\r\n%s\r\n", len(val), val)
					_, _ = conn.Write([]byte(resp))
				} else {
					_, _ = conn.Write([]byte("$-1\r\n"))
				}
			}
		case "EVAL", "EVALSHA":
			// Atomic get-and-delete lua script:
			// KEYS[1] is at index 3 in EVAL script numkeys key1...
			if len(cmd) >= 4 {
				key := cmd[3]
				s.mu.Lock()
				val, ok := s.data[key]
				if ok {
					delete(s.data, key)
				}
				s.mu.Unlock()

				if ok {
					resp := fmt.Sprintf("$%d\r\n%s\r\n", len(val), val)
					_, _ = conn.Write([]byte(resp))
				} else {
					_, _ = conn.Write([]byte("$-1\r\n"))
				}
			}
		default:
			_, _ = conn.Write([]byte("+OK\r\n"))
		}
	}
}

func readRESP(r *bufio.Reader) ([]string, error) {
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

func TestRedisChallengeStore_InvalidAddress(t *testing.T) {
	store := auth.NewRedisChallengeStore(nil)

	if _, err := store.CreateChallenge("invalid"); err == nil {
		t.Fatal("expected error on invalid address for CreateChallenge")
	}
	if _, err := store.GetChallenge("invalid"); err == nil {
		t.Fatal("expected error on invalid address for GetChallenge")
	}
	if _, err := store.ConsumeChallenge("invalid"); err == nil {
		t.Fatal("expected error on invalid address for ConsumeChallenge")
	}
}

func TestRedisChallengeStore_FullLifecycle(t *testing.T) {
	mockRedis := startMockAuthRedisServer(t)

	rdb := redis.NewClient(&redis.Options{
		Addr:     mockRedis.Addr(),
		Protocol: 2,
	})
	t.Cleanup(func() { _ = rdb.Close() })

	store := auth.NewRedisChallengeStore(rdb)

	privKey, _ := crypto.GenerateKey()
	addr := crypto.PubkeyToAddress(privKey.PublicKey).Hex()

	// 1. Create challenge
	ch, err := store.CreateChallenge(addr)
	if err != nil {
		t.Fatalf("failed to create challenge: %v", err)
	}

	if ch.Address != addr {
		t.Fatalf("expected address %s, got %s", addr, ch.Address)
	}
	if len(ch.Nonce) != 64 {
		t.Fatalf("expected 32-byte (64 hex chars) nonce, got %d", len(ch.Nonce))
	}
	if ch.ExpiresAt <= time.Now().Unix() {
		t.Fatalf("expected future expiration timestamp, got %d", ch.ExpiresAt)
	}

	// 2. Get challenge without consuming
	gotCh, err := store.GetChallenge(addr)
	if err != nil {
		t.Fatalf("failed to get challenge: %v", err)
	}
	if gotCh.Nonce != ch.Nonce {
		t.Fatalf("expected nonce %s, got %s", ch.Nonce, gotCh.Nonce)
	}

	// 3. Consume challenge (atomic get and delete)
	consumedCh, err := store.ConsumeChallenge(addr)
	if err != nil {
		t.Fatalf("failed to consume challenge: %v", err)
	}
	if consumedCh.Nonce != ch.Nonce {
		t.Fatalf("expected nonce %s, got %s", ch.Nonce, consumedCh.Nonce)
	}

	// 4. Second consume must fail (replay attack prevented)
	_, err = store.ConsumeChallenge(addr)
	if err == nil {
		t.Fatal("expected second consume to fail with challenge not found")
	}
}
