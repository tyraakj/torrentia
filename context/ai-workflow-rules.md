# AI Workflow Rules — Torrentia

## Development Approach
- Follow the build order from the system prompt (section 5)
- Favor a working end-to-end demo over completeness in any single layer
- Every feature must trace back to one of the two core problems: **Control** or **Scaling Cost**

## Build Order (Priority)
1. Registry + SplitPayment contracts → deployed + tested
2. Minimal upload flow → chunk, hash, pin, register
3. Minimal WebRTC transfer → two browser tabs, mocked 402
4. Wire real 402 → contract call → chunk release
5. Frontend polish → marketplace, upload, download, split viz
6. Cut anything not needed for demo beat

## Scoping Rules
- Do NOT add speculative features (staking, reputation, DAO, dynamic pricing)
- Do NOT claim piracy prevention anywhere
- Do NOT introduce per-seeder pricing in any code path
- Do NOT move chain logic into Go — keep it in TS
- Do NOT use centralized storage for manifests — IPFS only

## Delivery Approach
- Each component gets built, tested, and verified before moving to the next
- Contract tests prove atomic split works before any frontend work
- Mock 402 flow for WebRTC testing, then replace with real payment
- Frontend polish comes last — function before beauty (but beauty matters for demo)

## Decision Log
Record key decisions here as they're made:
- **Framing**: P2P Innovation framing — Decentralized P2P AI model distribution network with on-chain chunk payment splits on Monad
- **P2P Transport**: WebRTC data channels (browser-to-browser)
- **Signaling**: Go service (fallback: Node/TS Socket.io)
- **Contract toolchain**: Foundry
- **Frontend framework**: Vite + React
- **Indexer**: Custom Node/TS indexer (not Envio HyperIndex) — we need custom seeder-status caching and real-time WebSocket push, which a generic event indexer doesn't cover
- **Wallet integration**: wagmi + injected connector (MetaMask etc.) — Para (MPC wallets) is a nice-to-have post-hackathon
- **MONSKILLS installed**: Local skills available in `.agents/skills/` — use `monskill` routing skill for Monad-specific guidance
