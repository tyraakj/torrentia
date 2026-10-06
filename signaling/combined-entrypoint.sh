#!/bin/sh
# Torrentia Combined Backend Entrypoint
# Starts signaling (:8081), broker (:8082), and gateway ($PORT) in one container.
set -eu

GATEWAY_PORT="${PORT:-10000}"
SIGNALING_PORT="8081"
BROKER_PORT="8082"

echo "=== Torrentia Combined Backend ==="
echo "  Gateway  → :${GATEWAY_PORT}"
echo "  Signaling → :${SIGNALING_PORT}"
echo "  Broker   → :${BROKER_PORT}"
echo ""

# Start signaling server on fixed internal port 8081
PORT="${SIGNALING_PORT}" \
AUTH_REQUIRED="${AUTH_REQUIRED:-false}" \
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-*}" \
  torrentia-signaling &
SIGNALING_PID=$!

# Start upload broker on fixed internal port 8082
PORT="${BROKER_PORT}" \
PINATA_JWT="${PINATA_JWT:-}" \
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-*}" \
  torrentia-broker &
BROKER_PID=$!

# Give the two backends 2 seconds to bind before gateway starts routing
sleep 2

# Start the gateway on $PORT — the only port exposed to the internet
torrentia-gateway \
  -port="${GATEWAY_PORT}" \
  -signaling-port="${SIGNALING_PORT}" \
  -broker-port="${BROKER_PORT}" &
GATEWAY_PID=$!

echo "All services started (signaling=${SIGNALING_PID}, broker=${BROKER_PID}, gateway=${GATEWAY_PID})"

cleanup() {
  echo "Shutting down all backend services..."
  kill -TERM "${SIGNALING_PID}" "${BROKER_PID}" "${GATEWAY_PID}" 2>/dev/null || true
  wait "${SIGNALING_PID}" "${BROKER_PID}" "${GATEWAY_PID}" 2>/dev/null || true
  exit 0
}
trap cleanup TERM INT

# Wait for any process to exit; if one dies, kill everything and let Render restart the container
wait -n 2>/dev/null || {
  # wait -n not available in busybox — fall back to polling
  while kill -0 "${SIGNALING_PID}" 2>/dev/null && \
        kill -0 "${BROKER_PID}"    2>/dev/null && \
        kill -0 "${GATEWAY_PID}"   2>/dev/null; do
    sleep 5
  done
}

echo "A backend process exited — shutting down container for Render to restart"
kill "${SIGNALING_PID}" "${BROKER_PID}" "${GATEWAY_PID}" 2>/dev/null || true
exit 1
