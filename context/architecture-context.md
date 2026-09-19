# Architecture Context

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/TS)                      │
│  Marketplace UI · Upload Flow · Download Flow · Split Viz       │
│  wagmi/viem for wallet + contract calls                         │
└──────────┬──────────────┬──────────────┬───────────────────────┘
           │              │              │
           ▼              ▼              ▼
┌──────────────┐ ┌────────────────┐ ┌──────────────────────────┐
│ Monad Chain  │ │ Go Signaling   │ │ Node/TS Indexer          │
│              │ │ Server         │ │                          │
│ Registry     │ │ WebRTC SDP     │ │ Listens to contract      │
│ Contract     │ │ relay +        │ │ events, caches model     │
│              │ │ Seeder tracker │ │ list + seeder status     │
│ SplitPayment │ │                │ │                          │
│ Contract     │ │ (No chain      │ │ Lightweight Postgres     │
│              │ │  calls here)   │ │ or in-memory store       │
└──────────────┘ └────────────────┘ └──────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  WebRTC Data     │
              │  Channels        │
              │  (browser↔browser│
              │   chunk transfer)│
              └──────────────────┘
```

## Component Boundaries (Hard Rules)

### Go Signaling/Tracker Service — ONLY:
- WebRTC signaling (SDP offer/answer/ICE relay)
- Seeder-availability tracker (who has which chunks for which modelId)
- **Must NOT contain:** chain-event listening, contract calls, manifest/upload logic

### Node/TS Indexer — ONLY:
- Index registry contract events (ModelRegistered, etc.)
- Cache model list + seeder availability for frontend queries
- REST API for frontend reads

### Frontend (React/TS) — handles:
- Wallet connection (wagmi/viem)
- Contract interactions (register model, pay for chunks)
- Client-side chunking + hashing on upload
- IPFS manifest pinning
- WebRTC peer connections for chunk transfer
- x402 payment flow state machine
- UI rendering

## Data Models

### On-Chain (Monad)
```solidity
struct Model {
    bytes32 modelId;
    address originalCreator;   // immutable per modelId
    string  metadataURI;       // IPFS CID → ChunkManifest
    uint256 chunkPrice;        // uniform, never varies by seeder
    uint16  creatorShareBps;   // basis points (e.g. 7000 = 70%), set by creator at registration
    uint32  chunkCount;
    bool    active;
}
// creatorShareBps: creator sets their own share (100–9900 bps).
// Seeder gets the remainder (10000 - creatorShareBps).
// Default: 7000 (70% creator, 30% seeder).
```

### Off-Chain: ChunkManifest (stored at metadataURI on IPFS)
```json
{
    "modelId": "bytes32",
    "chunks": [
        { "index": 0, "hash": "bytes32", "size": 1048576 }
    ],
    "totalSize": 104857600,
    "modelCard": "# My Model\n\nMarkdown description..."
}
```

### Off-Chain: SeederRecord (indexer/tracker, ephemeral)
```json
{
    "modelId": "bytes32",
    "seederAddress": "0x...",
    "chunksHeld": [0, 1, 2, 3],
    "lastSeenAt": "2024-01-01T00:00:00Z"
}
```

## Invariants (Must Never Break)

1. **Uniform chunk price** — price per chunk is identical regardless of which peer serves it. No per-seeder pricing in any code path.
2. **Atomic split** — creator + seeder payment happens in one transaction, never two.
3. **Immutable creator** — `originalCreator` for a `modelId` cannot be changed after registration.
4. **Creator-set split** — `creatorShareBps` is set once at registration by the creator (100–9900 bps range). Same split applies to every seeder for that model.
5. **Content-addressed chunks** — every chunk is verified by its hash regardless of source peer.
6. **No central file hosting** — model data lives in the swarm + IPFS, not on a centralized server.

## Payment Flow (x402)

```
Downloader                    Seeder Peer                   Monad Chain
    │                              │                              │
    │── request chunk N ──────────▶│                              │
    │                              │                              │
    │◀── 402 Payment Required ─────│                              │
    │    (price + seederAddress)   │                              │
    │                              │                              │
    │── payForChunk(modelId, ─────────────────────────────────────▶│
    │   seederAddr) + msg.value   │                              │
    │                              │     split per creatorShareBps ▶│
    │                              │            seeder + creator   │
    │◀─────────────────── tx confirmed ───────────────────────────│
    │                              │                              │
    │── present payment proof ────▶│                              │
    │                              │                              │
    │◀── stream chunk data ────────│                              │
    │                              │                              │
```

## Storage Strategy

| Data | Where | Why |
|------|-------|-----|
| Model registry | Monad chain (testnet 10143 / mainnet 143) | Immutable, censorship-resistant |
| Chunk manifest | IPFS (pinned) | Content-addressed, no one can remove it |
| Model chunks | Peer swarm (WebRTC) | Decentralized distribution |
| Seeder records | Go tracker (ephemeral) | Real-time availability, not source of truth |
| Model index cache | Node/TS indexer | Fast frontend reads without chain queries |

## Monad-Specific Considerations

### Gas Model
Monad charges gas based on `gas_limit`, not gas used. This means:
- Setting unnecessarily high gas limits directly costs users more MON
- Always set explicit gas limits for operations with known fixed costs
- When estimating gas, add at most a 10% buffer — the estimate IS what users pay

### Transaction Sync
Monad supports `eth_sendRawTransactionSync` — get the transaction receipt in the same RPC call.
Use `useSendTransactionSync` in the frontend for instant UI feedback after chunk payments.

### Async Execution
Consensus and execution are decoupled on Monad. Key implications:
- 3-block delayed state view
- Newly funded accounts need ~1.2s before sending transactions
- Block states: Proposed → Voted → Finalized → Verified

### Reserve Balance
Every EOA on Monad must maintain a 10 MON floor. Low-balance accounts are limited to 1 tx per ~1.2s.

### Cold State Access
Cold storage reads (SLOAD, SSTORE) cost 3–4× more on Monad than Ethereum. Our SplitPayment contract touches multiple storage slots per chunk payment — gas estimates from Ethereum tests will be inaccurate. Test gas costs on Monad testnet directly.
