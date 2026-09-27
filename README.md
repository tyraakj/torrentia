# Torrentia

> **Decentralized, verifiable delivery for open-source AI — rewarding creators and community hosts with sub-second micro-payments on Monad.**

Torrentia solves the infrastructure bottleneck behind open-source AI. Hosting and distributing multi-gigabyte model weights requires expensive centralized cloud bandwidth. A single provider outage or corporate policy decision can make a model unavailable globally.

Torrentia eliminates the central host. Creators publish verified model packages. Independent providers (seeders) deliver them directly to downloaders over WebRTC and earn automatic rewards per chunk delivered — settled atomically on Monad in the same transaction as the creator's royalty.

As demand grows, the swarm gains more delivery capacity instead of routing every request through one server.

---

## Live Deployment

| | |
|---|---|
| **Frontend** | [torrentia.vercel.app](https://torrentia.vercel.app) |
| **Network** | Monad Testnet (Chain ID `10143`) |
| **Signaling Server** | `wss://torrentia-signaling.onrender.com/ws` |
| **Envio GraphQL** | `https://indexer.bigdevenergy.link/<org>/torrentia/v1/graphql` |

**Test credentials:** Connect any MetaMask / Rabby wallet funded with Monad Testnet MON from [faucet.monad.xyz](https://faucet.monad.xyz).

---

## Smart Contracts — Monad Testnet

| Contract | Address | Explorer |
|---|---|---|
| `ModelRegistry` | `0xe2cEDee4817B11716728aed3C3d7AD0438813340` | [Monadscan ↗](https://testnet.monadscan.com/address/0xe2cEDee4817B11716728aed3C3d7AD0438813340) |
| `SplitPayment` | `0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa` | [Monadscan ↗](https://testnet.monadscan.com/address/0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa) |

Both contracts verified on Sourcify. 28/28 Foundry unit tests pass.

---

## System Architecture

```
Browser (Creator)                Browser (Downloader)
      │                                  │
      │ 1. Chunk → SHA-256 → IPFS pin    │
      │ 2. Register on ModelRegistry     │
      │                                  │ 3. Discover peers via
      │                                  │    Go Signaling Tracker
      │◄──────── WebRTC Data Channel ────┤
      │                                  │ 4. Pay per chunk (MON)
      │                    SplitPayment.sol atomically:
      │                    → Creator royalty (configurable %)
      │                    → Seeder reward (remainder)
      │
      │ 5. Seeder verifies on-chain receipt → streams chunk
      │
Envio HyperIndex
      │ Indexes: ModelRegistered, ModelDeactivated, PaymentSplit
      │ Entities: Model, PaymentSplitEvent, CreatorStat, SeederStat, NetworkOverview
      └─► GraphQL API → Frontend marketplace, creator dashboard, seeder leaderboard
```

---

## What Makes This Work on Monad

Micro-payments per 1 MB chunk are only viable because Monad makes them cheap and fast:

| | Ethereum L1 | L2 Rollups | Monad |
|---|---|---|---|
| Block time | 12s | 0.25–2s | **~1s** |
| Fee per chunk payment | ~$5–$25 | ~$0.05–$0.10 | **<$0.001** |
| TPS | 15–30 | 50–150 | **10,000** |

A 50-chunk model download costs ~$0.05 in gas on Ethereum. On Monad it's under $0.05 total. Per-chunk settlement is economically viable.

---

## Core Features

### For Creators
- Upload any model format (`.safetensors`, `.gguf`, `.onnx`, `.bin`)
- Set your own royalty split (1%–99%) at registration — enforced on-chain forever
- Immutable creator attribution — `originalCreator` cannot be changed after registration
- Censorship-resistant — no central operator can de-list your model

### For Downloaders
- Browser-native P2P download with SHA-256 chunk verification
- Pay-as-you-download — no upfront cost, no subscription
- Downloaded chunks immediately become seedable to new peers

### For Seeders / Providers
- Browser seeding: toggle "Start Seeding" after a download completes
- CLI seeding: `torrentia-seeder` daemon for persistent NVMe-backed nodes

---

## Repository Structure

```
torrentia/
├── contracts/          # Solidity — ModelRegistry.sol, SplitPayment.sol
│   └── test/           # 28 Foundry unit tests
├── frontend/           # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/      # Marketplace, ModelDetail, Upload, Dashboard
│       ├── hooks/      # useDownload, useSeeding, useDownloadStateMachine
│       ├── services/   # P2P engine, chunk store, IPFS, payment, Envio client
│       └── lib/        # Wagmi config, ABI exports, contract hooks
├── signaling/          # Go — WebSocket signaling hub + seeder tracker
│   └── cmd/
│       ├── signaling/  # Signaling server (:8081)
│       ├── broker/     # Upload broker with EIP-712 auth (:8082)
│       ├── seeder/     # Persistent CLI seeder daemon
│       └── gateway/    # Unified reverse proxy (:8090)
└── indexer/            # Envio HyperIndex — config.yaml, schema.graphql, EventHandlers.ts
```

---

## Quick Start

**Requirements:** Node.js ≥18, Go 1.22+, Foundry

```bash
# 1. Smart contracts
cd contracts && forge test

# 2. Go backend (signaling + broker)
cd signaling
go test ./...
go run ./cmd/signaling --port 8081 &
go run ./cmd/broker --port 8082 &

# 3. Frontend
cd frontend && npm install && npm run dev
```

Create `frontend/.env.local`:

```env
VITE_MODEL_REGISTRY_ADDRESS=0xe2cEDee4817B11716728aed3C3d7AD0438813340
VITE_SPLIT_PAYMENT_ADDRESS=0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa
VITE_SIGNALING_URL=wss://torrentia-signaling.onrender.com/ws
VITE_ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql
VITE_UPLOAD_BROKER_URL=http://localhost:8082
```

```bash
# 4. Envio indexer (requires Docker)
cd indexer && pnpm install && pnpm codegen && pnpm envio local up
```

> Keep `PINATA_JWT` server-side only. Never expose it via `VITE_*`.

---

## CLI Seeder

For persistent, headless seeding from a server or NVMe-backed node:

```bash
# Install
curl -sSL https://raw.githubusercontent.com/tyraakj/torrentia/main/scripts/install-seeder.sh | sh

# Run
torrentia-seeder \
  --signaling wss://torrentia-signaling.onrender.com/ws \
  --payout 0xYourAddress \
  --rpc https://testnet-rpc.monad.xyz \
  --chunk-dir ./chunks
```

---

## Hackathon Submission

See [`SUBMISSION.md`](SUBMISSION.md) for full track and bounty alignment documentation.

---

## License

MIT
