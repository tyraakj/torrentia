# Torrentia — P2P AI Model Marketplace

## Product Definition

**Tagline (P2P-first framing):** "Decentralized P2P AI Model Distribution — Fast, swarm-powered weight streaming with atomic on-chain incentives on Monad."

### What It Is
A decentralized peer-to-peer distribution network and marketplace for AI model weights where:
- Distribution is **purely peer-to-peer** (BitTorrent-style chunked transfer over WebRTC data channels), eliminating centralized hosting bottlenecks, server costs, and bandwidth fees.
- Every paid chunk transfer **automatically splits payment** on-chain between the *current seeder* and the *original creator* — settled through Torrentia's custom payment gate and `SplitPayment` contract on Monad.

### Two Core Problems Solved
Every architectural decision must trace back to one of these:

1. **Control** — No central operator can de-list, throttle, or remove a model. Availability is a function of the swarm, not platform policy.
2. **Scaling Cost** — The creator never provisions bandwidth for their own popularity. The swarm absorbs load; the creator gets paid instead of paying.

### Non-Goals (Hard Boundaries)
- No attempt to prevent out-of-band sharing (USB, email). Out of scope.
- No complex royalty-tracking ledger. The split is a single mechanical rule executed atomically — not a separate accounting system.
- **Price per chunk is uniform regardless of who serves it.** This is a hard invariant — if it breaks, the whole incentive to re-seed collapses.

### Pitch Framing
Using **P2P Innovation Framing** consistently across all copy/UI text:
> "Decentralized P2P AI Model Distribution — Fast, swarm-powered weight streaming with atomic on-chain incentives on Monad."

Highlighting the peer-to-peer swarm transfer as the breakthrough innovation: multi-gigabyte models distributed directly browser-to-browser via WebRTC, turning bandwidth consumers into earning seeders.

## Features (Hackathon Scope)

### Must-Have (Demo Critical)
1. Smart contract: model registry + atomic split payment (the pitch)
2. Upload flow: chunk file → hash → pin manifest → write registry
3. WebRTC peer-to-peer chunk transfer between browser tabs
4. 402 payment-gated transfer flow (custom WebRTC payment handshake)
5. Marketplace UI: browse, upload, download
6. Live split visualization on download (Monadscan link)

### Explicitly Out of Scope
- Staking / reputation scores
- DAO governance
- Dynamic pricing / per-seeder pricing
- Piracy prevention claims
- Complex royalty tracking
