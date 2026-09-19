# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Cache Go modules
COPY go.mod go.sum* ./
RUN go mod download

# Copy source
COPY . .

# Compile static binary without CGO for minimal footprint
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /signaling ./cmd/signaling

# Minimal Alpine Runtime Stage
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /signaling .

# Expose default port (Render will override via $PORT)
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8081}/health || exit 1

ENTRYPOINT ["./signaling"]
