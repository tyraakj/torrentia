#!/bin/sh
set -eu

mkdir -p /etc/torrentia
if [ ! -f /etc/torrentia/seeder.json ]; then
  : "${SEEDER_ADDRESS:?SEEDER_ADDRESS is required when no seeder.json is mounted}"
  printf '%s\n' '{' \
    '  "version": 1,' \
    '  "dataDir": "/var/lib/torrentia-seeder",' \
    "  \"seederAddress\": \"${SEEDER_ADDRESS}\"," \
    "  \"signalingUrl\": \"${SIGNALING_URL:-ws://signaling:8081/ws}\"," \
    "  \"monadRpcUrl\": \"${MONAD_RPC_URL:-https://testnet-rpc.monad.xyz}\"," \
    '  "chainId": 10143,' \
    '  "splitPaymentContract": "0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa",' \
    '  "modelRegistryContract": "0xe2cEDee4817B11716728aed3C3d7AD0438813340",' \
    '  "httpEndpoint": {"enabled": true, "port": 9090, "publicUrl": "http://localhost:9090"},' \
    '  "limits": {"maxStorageBytes": 107374182400, "maxUploadBandwidthBytesPerSec": 20971520, "maxConcurrentPeers": 32},' \
    '  "ipfsGateways": ["https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/"]' \
    '}' > /etc/torrentia/seeder.json
fi

exec /usr/local/bin/torrentia-seeder run --config /etc/torrentia/seeder.json
