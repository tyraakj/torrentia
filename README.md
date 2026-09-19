# Torrentia

> **Decentralized P2P AI Model Distribution — Fast, swarm-powered weight streaming with atomic on-chain incentives on Monad.**

Torrentia distributes AI model weights directly between browsers. Creators upload a model, Torrentia chunks and hashes it, pins a lightweight manifest to IPFS, and registers the model on Monad. Downloaders discover peers through a Go signaling tracker, receive chunks over WebRTC, and pay the serving peer per chunk. `SplitPayment.sol` atomically sends the creator royalty and seeder incentive in the same transaction.

[![Monad Testnet](https://img.shields.io/badge/Monad-Testnet-836EF9)](https://testnet.monadscan.com)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636)](contracts/)
[![Go](https://img.shields.io/badge/Go-1.27-00ADD8)](signaling/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](frontend/)
[![WebRTC](https://img.shields.io/badge/Transport-WebRTC-333333)](frontend/src/services/peer-connection.ts)

**Live demo:** configure the Vercel deployment URL here after publishing it.  
**Demo video:** add a Loom or YouTube URL here when recorded.

## Architecture

```mermaid
flowchart LR
    Creator[Creator browser] -->|chunk + SHA-256| IPFS[IPFS manifest]
    Creator -->|registerModel| Registry[ModelRegistry]
    Creator -->|seed chunks| Swarm[Browser P2P swarm]
    Downloader[Downloader browser] -->|WebSocket discovery| Go[Go signaling + tracker]
    Downloader -->|WebRTC data channel| Swarm
    Downloader -->|payForChunk + MON| Split[SplitPayment]
    Split -->|creator share| Creator
    Split -->|seeder share| Swarm
    Indexer[Optional Node/TS indexer] -->|events| Registry
    Indexer -->|events| Split
```

## How It Works

1. **Upload and chunk.** The creator selects an `.onnx`, `.safetensors`, `.bin`, or similar model file. The browser streams it into 1 MB chunks and computes a SHA-256 hash for each chunk.
2. **Pin the manifest.** The small `ChunkManifest` JSON is pinned to IPFS. The large model weights remain in the peer swarm rather than on a centralized file host.
3. **Register on Monad.** The creator writes the model ID, IPFS URI, uniform chunk price, chunk count, and creator share to `ModelRegistry.sol`.
4. **Discover seeders.** A downloader connects to the Go WebSocket service and queries which peers hold each model's chunks.
5. **Connect peer-to-peer.** The browsers establish a WebRTC data channel. The Go service only relays SDP/ICE signaling and tracks ephemeral availability.
6. **Request payment.** The downloader requests a chunk. The seeder responds with a `payment-required` message containing the model ID, chunk index, price, and seeder address. This is the WebRTC equivalent of the x402 payment gate.
7. **Split payment atomically.** The downloader calls `SplitPayment.payForChunk(modelId, seederAddress)` with native MON. The contract reads the model terms from `ModelRegistry` and sends both shares in one transaction:

   ```text
   creatorAmount = msg.value * creatorShareBps / 10000
   seederAmount  = msg.value - creatorAmount
   ```

8. **Verify and stream.** The seeder verifies the transaction receipt and `PaymentSplit` event on-chain. Only then does it stream the chunk. The downloader verifies the SHA-256 hash and stores the chunk in IndexedDB.

## Smart Contracts and Monad

Both contracts are deployed on Monad Testnet, chain ID `10143`.

| Contract | Address | Explorer |
|---|---|---|
| `ModelRegistry` | `0xe2cEDee4817B11716728aed3C3d7AD0438813340` | [View contract](https://testnet.monadscan.com/address/0xe2cEDee4817B11716728aed3C3d7AD0438813340) |
| `SplitPayment` | `0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa` | [View contract](https://testnet.monadscan.com/address/0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa) |

The payment contract is connected to the registry through its immutable constructor reference. `SplitPayment` reads the creator, price, and split configuration from `ModelRegistry`; the registry does not depend on the payment contract.

Deployment transactions:

- [Deploy `ModelRegistry`](https://testnet.monadscan.com/tx/0xfcd07827ea5ce838ceb65edaa2c9d2d8cfc5ba252ba52d50f3e020c3ce2f51d4)
- [Deploy `SplitPayment`](https://testnet.monadscan.com/tx/0xfac22b8e270a2075775020a6a6f86457774bcf7d100711198ea5ed70a1b86a21)
- [Register demo model](https://testnet.monadscan.com/tx/0x874dd5db24c3243fd57d6d4c68f33481001c74238eb771f8134205353b757282)

Monad-specific considerations:

- Contract calls use explicit, tight gas limits because Monad charges based on the gas limit.
- Fast confirmation makes per-chunk native MON settlement practical for a live streaming demo.
- The creator share is set at registration and the chunk price is uniform across all seeders.

The Foundry suite contains **28 passing tests** covering registration validation, deactivation, exact payment amounts, split rounding, events, and multiple sequential payments.

## Honest Status

| Feature | Status | Notes |
|---|---|---|
| Smart contracts | ✅ Deployed and tested | 28 Foundry tests pass; contracts are live on Monad Testnet. |
| Go signaling and tracker | ✅ Implemented and tested | Thread-safe tracker, heartbeat eviction, WebSocket relay, graceful shutdown. |
| Browser WebRTC transfer | ✅ Implemented | Data-channel chunk streaming, backpressure, IndexedDB storage, hash checks. |
| On-chain payment flow | ✅ Wired | Real `payForChunk` calls, receipt confirmation, and `PaymentSplit` verification. |
| Upload pipeline | ✅ Implemented | Client chunking, SHA-256 hashing, manifest pinning, and registration UI. |
| Split visualization | ✅ Implemented | Live creator/seeder visualization and Monadscan transaction links. |
| Indexer | ⏳ Optional MVP work | The frontend currently supports fallback/demo data; a Node/TS event indexer is the next marketplace infrastructure step. |
| Production hosting | ⏳ Deployment configuration ready | Go is configured for Render and the SPA for Vercel; production URLs and environment variables must be supplied. |

## Repository Layout

```text
contracts/     Solidity contracts, Foundry tests, deployment scripts
frontend/      React + TypeScript + Vite application
signaling/     Go WebSocket signaling server and seeder tracker
context/       Product, architecture, and implementation specifications
render.yaml    Render service configuration
```

## Local Development

### Prerequisites

- Node.js and npm
- Go 1.27+
- Foundry
- A Monad-compatible browser wallet for live transactions
- Optional: Pinata JWT for IPFS manifest pinning

### Smart contracts

```bash
cd contracts
forge test -vv
forge build
```

The deployed addresses are recorded in [`contracts/deployments/monad-testnet.json`](contracts/deployments/monad-testnet.json). Never commit a deployer private key; use `DEPLOYER_PRIVATE_KEY` only in your local environment when deploying.

### Signaling server

```bash
cd signaling
go test ./...
go run ./cmd/signaling --port 8081
```

Health check: `http://localhost:8081/health`  
WebSocket endpoint: `ws://localhost:8081/ws`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend environment variables:

```env
VITE_MODEL_REGISTRY_ADDRESS=0xe2cEDee4817B11716728aed3C3d7AD0438813340
VITE_SPLIT_PAYMENT_ADDRESS=0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa
VITE_SIGNALING_URL=ws://localhost:8081/ws
VITE_PINATA_JWT=your_pinata_jwt
```

### Two-browser demo

1. Start the Go signaling server and frontend.
2. In Browser A, connect a wallet, upload a small model, and start seeding it.
3. In Browser B, open the model page and connect a funded Monad Testnet wallet.
4. Start the download.
5. Approve the per-chunk MON payment.
6. Open the Monadscan transaction link and show the atomic creator/seeder split.
7. Browser B verifies and reassembles the downloaded file, then can start seeding it.

For a reliable presentation, use a small model with 3–5 chunks. The registered demo model is useful for verifying the contract event, but its placeholder IPFS URI does not contain browser-seedable model chunks.

## Judge Defense

### Why Monad instead of Ethereum L1?

Torrentia settles a payment per transferred chunk. Fast confirmation and low transaction costs are important because a slow or expensive settlement would interrupt the streaming loop.

### Why not store the weights directly on IPFS?

Torrentia uses IPFS for the lightweight, content-addressed manifest. The large model weights are transferred browser-to-browser through the swarm, reducing dependence on centralized bandwidth hosting.

### Can a seeder set an arbitrary price?

No. The model's uniform chunk price is stored in `ModelRegistry`. The downloader checks the payment challenge, and `SplitPayment` reverts unless `msg.value` exactly matches the registered price.

### What happens if a seeder fails after payment?

The downloader's loss is limited to the individual chunk payment. The client can abandon that peer and request the chunk from another active seeder. A production version could add stronger dispute or delivery guarantees, but those are outside the MVP scope.

### Is Torrentia a piracy-prevention system?

No. Out-of-band sharing is outside the scope. Torrentia focuses on decentralized distribution and aligning creator royalties with peer bandwidth contribution.

## Scope Boundaries

Torrentia's MVP intentionally does not include staking, reputation scores, DAO governance, dynamic or per-seeder pricing, escrow, or centralized model hosting. The chain is the source of truth for model terms and payment events; the Go tracker is ephemeral availability coordination only.
