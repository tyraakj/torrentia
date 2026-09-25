#!/bin/sh
set -e

# ==============================================================================
# Torrentia Seeder CLI Daemon Installer (macOS & Linux)
#
# LIVE (works now):
#   curl -sSL https://torrentiaa.vercel.app/install.sh | sh
#   curl -sSL https://torrentia-signaling.onrender.com/install.sh | sh
#   curl -sSL https://raw.githubusercontent.com/tyraakj/torrentia/main/scripts/install.sh | sh
#
# FUTURE (when torrentia.io DNS is live):
#   curl -sSL https://torrentia.io/install.sh | sh
# ==============================================================================

echo "=================================================================="
echo " Installing Torrentia Persistent Seeder Daemon (torrentia-seeder)"
echo " Community-powered AI model distribution on Monad"
echo "=================================================================="

# 1. Detect Operating System
OS="$(uname -s)"
case "$OS" in
  Linux*)               PLATFORM="linux" ;;
  Darwin*)              PLATFORM="darwin" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
  *)                    echo "Error: Unsupported OS '$OS'. Please use Docker or build from source."; exit 1 ;;
esac

# 2. Detect Architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)   ARCH_NAME="amd64" ;;
  arm64|aarch64)  ARCH_NAME="arm64" ;;
  *)              echo "Error: Unsupported architecture '$ARCH'."; exit 1 ;;
esac

# 3. Determine Installation Destination
INSTALL_DIR="/usr/local/bin"
if [ ! -w "$INSTALL_DIR" ] || [ "$PLATFORM" = "windows" ]; then
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
fi

BINARY_NAME="torrentia-seeder"
if [ "$PLATFORM" = "windows" ]; then
  BINARY_NAME="torrentia-seeder.exe"
fi
TARGET="$INSTALL_DIR/$BINARY_NAME"

echo "Target destination: $TARGET (${PLATFORM}/${ARCH_NAME})"

# 4. Check if Go is available to compile locally, or download prebuilt release
INSTALLED=0

if command -v go >/dev/null 2>&1; then
  echo "Found Go compiler. Building torrentia-seeder from source..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  REPO_ROOT="$(cd "$SCRIPT_DIR/../.." 2>/dev/null && pwd || pwd)"
  if [ -d "$REPO_ROOT/signaling" ]; then
    if (cd "$REPO_ROOT/signaling" && go build -o "$TARGET" ./cmd/seeder); then
      INSTALLED=1
    fi
  fi
  if [ "$INSTALLED" -eq 0 ]; then
    if GOBIN="$INSTALL_DIR" go install github.com/tyraakj/torrentia/signaling/cmd/seeder@latest 2>/dev/null; then
      INSTALLED=1
    fi
  fi
fi

if [ "$INSTALLED" -eq 0 ]; then
  DOWNLOAD_URL="https://github.com/tyraakj/torrentia/releases/latest/download/torrentia-seeder-${PLATFORM}-${ARCH_NAME}"
  if [ "$PLATFORM" = "windows" ]; then
    DOWNLOAD_URL="${DOWNLOAD_URL}.exe"
  fi
  echo "Downloading pre-compiled binary from $DOWNLOAD_URL..."
  if curl -fsSL "$DOWNLOAD_URL" -o "$TARGET" 2>/dev/null; then
    INSTALLED=1
  else
    echo "Notice: Release asset not yet published on GitHub releases."
    echo "You can build locally with: cd signaling && go build -o $TARGET ./cmd/seeder"
    echo "Or run via Docker: docker run -d -p 9090:9090 torrentia/seeder:latest"
  fi
fi

if [ -f "$TARGET" ]; then
  chmod +x "$TARGET"
  echo "[✓] Executable permissions set."
  
  # Initialize configuration file if not already present
  if command -v "$TARGET" >/dev/null 2>&1 || [ -x "$TARGET" ]; then
    "$TARGET" init || true
  fi

  echo ""
  echo "=================================================================="
  echo " ✓ torrentia-seeder installed successfully to $TARGET"
  echo " Run: torrentia-seeder run"
  echo "=================================================================="
fi
