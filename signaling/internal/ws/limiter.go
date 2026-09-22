package ws

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// IPRateLimiter throttles connection attempts per remote IP address.
type IPRateLimiter struct {
	mu       sync.Mutex
	limit    int
	window   time.Duration
	attempts map[string][]time.Time
}

// NewIPRateLimiter creates a rate limiter allowing at most `limit` attempts per `window`.
func NewIPRateLimiter(limit int, window time.Duration) *IPRateLimiter {
	return &IPRateLimiter{
		limit:    limit,
		window:   window,
		attempts: make(map[string][]time.Time),
	}
}

// Allow returns true if the remote IP of the request has not exceeded its connection limit.
func (l *IPRateLimiter) Allow(r *http.Request) bool {
	ip := extractIP(r)
	if ip == "" {
		return true
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-l.window)

	timestamps := l.attempts[ip]
	valid := timestamps[:0]
	for _, t := range timestamps {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= l.limit {
		l.attempts[ip] = valid
		return false
	}

	l.attempts[ip] = append(valid, now)
	return true
}

func extractIP(r *http.Request) string {
	// Check X-Forwarded-For header first (proxies/load balancers)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}

	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// PeerMessageLimiter limits incoming WebSocket message throughput for a single peer.
type PeerMessageLimiter struct {
	mu         sync.Mutex
	rate       float64   // tokens per second
	capacity   float64   // bucket max capacity
	tokens     float64   // current available tokens
	lastRefill time.Time // timestamp of last token refill
}

// NewPeerMessageLimiter constructs a token-bucket limiter (e.g. 50 msg/sec).
func NewPeerMessageLimiter(rate float64) *PeerMessageLimiter {
	return &PeerMessageLimiter{
		rate:       rate,
		capacity:   rate,
		tokens:     rate,
		lastRefill: time.Now(),
	}
}

// Allow consumes 1 token. Returns true if allowed, false if limit exceeded.
func (p *PeerMessageLimiter) Allow() bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(p.lastRefill).Seconds()
	p.lastRefill = now

	p.tokens += elapsed * p.rate
	if p.tokens > p.capacity {
		p.tokens = p.capacity
	}

	if p.tokens >= 1.0 {
		p.tokens -= 1.0
		return true
	}

	return false
}
