package main

import (
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"
)

func newReverseProxy(target *url.URL) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)
	origDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		origDirector(req)
		req.Host = target.Host
	}
	return proxy
}

func main() {
	port := flag.Int("port", 8090, "Port for the unified gateway")
	signalingPort := flag.Int("signaling-port", 8081, "Port of the signaling service")
	brokerPort := flag.Int("broker-port", 8082, "Port of the broker service")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	signalingTarget, err := url.Parse(fmt.Sprintf("http://127.0.0.1:%d", *signalingPort))
	if err != nil {
		slog.Error("invalid signaling target", "err", err)
		return
	}

	brokerTarget, err := url.Parse(fmt.Sprintf("http://127.0.0.1:%d", *brokerPort))
	if err != nil {
		slog.Error("invalid broker target", "err", err)
		return
	}

	signalingProxy := newReverseProxy(signalingTarget)
	brokerProxy := newReverseProxy(brokerTarget)

	signalingProxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		slog.Error("signaling proxy error", "path", r.URL.Path, "err", err)
		http.Error(w, "Signaling service unavailable", http.StatusBadGateway)
	}

	brokerProxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		slog.Error("broker proxy error", "path", r.URL.Path, "err", err)
		http.Error(w, "Upload broker service unavailable", http.StatusBadGateway)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slog.Info("gateway request", "method", r.Method, "path", r.URL.Path)

		// Upload Broker routes
		if strings.HasPrefix(r.URL.Path, "/v1/uploads") {
			brokerProxy.ServeHTTP(w, r)
			return
		}

		// Broker health check
		if r.URL.Path == "/broker/health" {
			r.URL.Path = "/health"
			brokerProxy.ServeHTTP(w, r)
			return
		}

		// All other routes (/ws, /health, /v1/auth/..., /install.sh, /) route to signaling
		signalingProxy.ServeHTTP(w, r)
	})

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", *port),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	slog.Info("unified Torrentia gateway started",
		"port", *port,
		"signalingPort", *signalingPort,
		"brokerPort", *brokerPort,
	)

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("gateway failed", "err", err)
		return
	}
}
