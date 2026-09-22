# Progress Tracker — Torrentia
## Current Phase
**Phase 10 — Spec 13: Navigation, Toasts & UI Polish**

## Completed Work
- [x] Project context documents created (project-overview, architecture, ui, code-standards, workflow-rules)
- [x] Architecture decision: creator-configurable split (basis points, default 70/30)
- [x] Full specs suite created (00–15)
- [x] **Spec 01 Executed**: Smart contracts (`ModelRegistry.sol`, `SplitPayment.sol`, `ReentrancyGuard.sol`, deploy/register scripts) with 28 comprehensive Foundry unit tests passing (100% pass rate, zero failures).
- [x] **Spec 03 Executed**: Vite React-TS frontend scaffold with strict TypeScript, Wagmi & Viem configured for Monad Testnet (Chain ID 10143), full dark-mode design system (`index.css`), 7 UI primitives (`Button`, `Card`, `Badge`, `Input`, `Skeleton`, `AddressDisplay`, `MonAmount`), responsive glassmorphism `Navbar`, and routing across `/`, `/model/:id`, `/upload`, and `/dashboard`. `npm run build` passes cleanly.
- [x] **Spec 04 Executed**: Shared TypeScript types (`types.ts`), mathematical & formatting utilities (`utils.ts`), contract chain configuration (`contracts.ts`), typed ABI const assertions (`ModelRegistryABI.ts`, `SplitPaymentABI.ts`), and typed wagmi contract hooks (`use-contracts.ts`).
- [x] **Spec 05 Executed**: Client-side streaming chunker and SHA-256 hasher (`chunker.ts`), native IndexedDB chunk storage (`chunk-store.ts`), Pinata IPFS manifest pinning (`ipfs.ts`), upload subcomponents (`FileDropZone.tsx`, `ShareSlider.tsx`, `UploadProgress.tsx`), and complete multi-step Upload page (`Upload.tsx`).
- [x] **Spec 06 Executed**: Go signaling server and seeder tracker (`torrentia/signaling`). Implemented thread-safe in-memory Seeder Tracker (`internal/tracker`) with automatic heartbeat timeout eviction, safe WebSocket connection Hub (`internal/ws`) with per-peer write queues, WebRTC signaling relay (`internal/signal`) for verbatim SDP offer/answer/ICE routing, and HTTP server (`cmd/signaling/main.go`) with `/ws`, `/health`, open CORS, and graceful shutdown. Unit and end-to-end integration tests passing 100%.
- [x] **Spec 07 Executed**: Browser-side WebRTC P2P transfer layer. Implemented `SignalingClient` (`signaling-client.ts`) with auto-reconnection and 30s heartbeats, `PeerConnection` (`peer-connection.ts`) with ordered data channel, 16 KB slice segmentation, and 1 MB `bufferedAmount` backpressure control, `Seeder` (`seeder.ts`) serving IndexedDB chunks with pluggable payment verification, `Downloader` (`downloader.ts`) orchestrating sequential chunk fetching, SHA-256 hash verification against manifests, IndexedDB storage, and Blob reassembly, and reactive React hooks (`use-p2p.ts` via `useSyncExternalStore`).
- [x] **Spec 10 Executed**: Marketplace page (`/`) with real-time aggregate `StatsBar` (animated count-up metrics for models, chunks streamed, and volume), responsive glassmorphism `ModelCard`s with live seeder indicators and 70/30 split bars, task category filtering (Vision, NLP, Audio, LoRA), debounced search, skeleton loading states, and resilient `api-client.ts` with local IndexedDB model synchronization.
- [x] **Specs 11 & 14 Executed**: Model Detail Page (`/model/:id`) and Hero Animated Split Visualization (`SplitVisualization.tsx`). Implemented `TransactionLink` (Monadscan links), `PaymentSplitBadge` (compact inline split pills), `SplitVisualization` (animated violet/green split bar with Web Audio chimes and pulse glow), `LivePaymentFeed` (real-time stream of verified chunk payments), `ModelHeader` (specs badges, creator address, verification), `FileInfoPanel` (specifications and economics grid), `SeederPanel` (live WebSocket polling of active swarm seeders from Go server), `ModelCardViewer` (dependency-free markdown renderer for READMEs), `PaymentLog` (historical on-chain splits), and `DownloadSection` (orchestrating WebRTC streaming, SHA-256 hashing, blob reassembly, and organic swarm growth "Start Seeding" toggle). Zero lint warnings, clean build.
- [x] **Spec 12 Executed**: Creator Dashboard (`/dashboard`). Implemented wallet-gated creator view, `useCreatorModels` and `useCreatorEarnings` hooks, `EarningsSummary` hero card with cumulative MON royalties, `CreatorModelCard` displaying per-model downloads, royalties, and active seeders, on-chain model deactivation via `useDeactivateModel`, and zero-model upload CTA state. Clean production build and 0 lint warnings.
- [x] **Landing Page Executed**: Full editorial landing page with sticky blur navbar (`LandingNavbar.tsx`), single-line Apfel Grotezk hero headline, established pastel secondary and mint accent colors, full-width edge-to-edge illustration (`HeroSection.tsx`), 1MB puzzle chunk architecture overview (`PuzzleFeatureSection.tsx`), 3-column centralized vs P2P comparison (`ComparisonSection.tsx`), capabilities carousel (`FeatureStreamCarousel.tsx`), interactive creator/seeder Mon split and AWS S3 cost savings calculator (`WorkflowAndCalculator.tsx`), FAQ accordion (`FaqSection.tsx`), and charcoal skyline footer (`SkylineFooter.tsx`). Built cleanly with 0 TypeScript/lint errors.
- [x] **Spec 16 Executed**: Deployment & DevOps architecture for Vercel (Frontend) + Render (Go WebSocket backend) + Monad Testnet (Contracts). Created multi-stage Dockerfile, `render.yaml` blueprint, `frontend/vercel.json` SPA rewrite rules, and updated Go `main.go` to support `$PORT` environment variable.
- [x] **Spec 02 Executed**: Smart contracts deployed to Monad Testnet (Chain ID 10143) via Foundry broadcast script with deployer wallet `0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90`. `ModelRegistry` deployed at `0xe2cEDee4817B11716728aed3C3d7AD0438813340` (tx: `0xfcd07827ea5ce838ceb65edaa2c9d2d8cfc5ba252ba52d50f3e020c3ce2f51d4`), `SplitPayment` deployed at `0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa` (tx: `0xfac22b8e270a2075775020a6a6f86457774bcf7d100711198ea5ed70a1b86a21`). Both verified on Sourcify/Blockvision explorer. Initial test model registered (`0xf082cc3628013d117f58e868c44fcedf3ed5716157359c17c4a210ca7c430b2f`, tx: `0x874dd5db24c3243fd57d6d4c68f33481001c74238eb771f8134205353b757282`). ABIs exported to `frontend/src/lib/abis/` and `frontend/.env` wired.
- [x] **Swarm Seeder Distribution & Split Bugfix**: Resolved single-wallet payout bug in downloader. Implemented prioritized candidate seeder selection in `downloader.ts` (`getCandidateSeedersForChunk`), balancing requests across 3rd-party swarm seeders (excluding self and creator) and falling back gracefully to creator/other seeders on failure. Fixed `seederAddress` parameter passing in `useSeeding` and `useDownload` (`use-p2p.ts`), and wired wallet address into `announce` payloads in both `signaling-client.ts` and Go signaling server (`hub.go`). Clean build and all unit tests passing.
- [x] **Mechanical Suppression Gate Installed**: Created `scripts/check-suppressions.sh` and `scripts/check-suppressions.mjs` pre-commit verification gates. Configured Git hooks via `.husky/pre-commit` and `.git/hooks/pre-commit` (`core.hooksPath = .husky`). Audited codebase and eliminated all `as any` suppressions in `signaling-client.ts`, achieving 100% clean suppression gate pass.
- [x] **Spec 17 Executed**: Persistent CLI Seeder (`torrentia-seeder`) implemented in Go (`signaling/cmd/seeder/main.go` and `signaling/internal/seeder/`). Built content-addressed chunk store with atomic SHA-256 verification (`store.go`), IPFS manifest fetcher and schema validator (`manifest.go`), Monad JSON-RPC payment verifier decoding `PaymentSplit` events with replay protection (`verifier.go`), persistent WebSocket signaling client (`signaling_client.go`), dual-transport HTTP chunk server with 402 challenge flow (`http_server.go`), core daemon engine and catalog coordinator (`engine.go`), and system diagnostics runbook (`doctor.go`). Comprehensive unit and end-to-end integration test suite passing 100% (11/11 tests passing).
- [x] **Spec 18 Executed**: Upload Broker & Manifest Provenance microservice in Go (`signaling/cmd/broker/` and `signaling/internal/broker/`). Eliminates P0 client-side credential exposure (`VITE_PINATA_JWT`). Implemented EIP-712 cryptographic upload intent recovery (`auth.go`), manifest schema & chunk math validator (`validator.go`), thread-safe replay protection nonce store (`store.go`), multi-provider IPFS pinning client (`pinner.go`), and HTTP REST server (`server.go`) with CORS and `/health`. Updated frontend upload flow (`Upload.tsx`, `broker-client.ts`, `ipfs.ts`) to sign EIP-712 intents with connected wallet. 100% unit and integration test coverage across all broker packages, clean production frontend build, and zero suppression violations.
- [x] **Spec 26 Executed**: Mera-Powered Passkey UX & Frictionless Swarm Streaming ($2,500 Monad Metropolis Bounty). Implemented dual-wallet architecture combining WebAuthn PRF-derived Monad EOAs with fallback for injected wallets (MetaMask/Rabby). Created `MeraAuthService` (`frontend/src/services/auth/mera-auth.ts`) utilizing `@category-labs/mera` for PRF entropy generation, deterministic BIP-39 24-word / BIP-44 key derivation (`m/44'/60'/0'/0/0`), and in-memory secp256k1 signing sessions. Created custom Wagmi v3 connector `meraPasskey()` (`frontend/src/lib/mera-connector.ts`) providing standard EIP-1193 JSON-RPC communication. Built `MeraSessionSigner` (`frontend/src/services/mera-session-signer.ts`) enabling zero-prompt EIP-712 micro-voucher streaming for high-throughput P2P chunk downloads. Designed and integrated premium UI components: `PasskeyAuthModal`, `PasskeyNavbarBadge`, `ExportKeyModal`, and `PasskeyHeroCallout`. Automated unit test suite (`frontend/scripts/test-mera-auth.mjs`) passing 100%, clean production build (`tsc -b && vite build`), and zero mechanical suppression violations.
- [x] **Spec 25 Executed**: Unified Product Flow, Download State Machine & Fallback Governance. Implemented 10-state deterministic download state machine (`useDownloadStateMachine`) with contextual recovery actions for wallet connection, Monad network switching, faucet funding, peer discovery retries, and local blob storage. Enforced Three Orthogonal Statuses on Model Detail (`ModelStatusBadges`) across Verified Passport integrity, Swarm Availability (online seeders), and On-Chain Settlement. Reorganized Upload into a 5-step guided wizard with sticky summary card. Enforced strict mode governance (`app-mode.ts`) hard-blocking synthetic fallback CIDs and fake txs in `testnet`/`mainnet`. Automated test suite (`test-download-state-machine.mjs`) passing 100%, clean build, and zero suppression violations.

## Specs Status
| # | Spec | Status | Priority |
|---|------|--------|----------|
| 00 | Product Map | ✅ Written | — |
| 01 | Smart Contracts (Registry + SplitPayment) | ✅ Implemented & Tested (28/28 tests) | P0 |
| 02 | Contract Deployment + ABI Export | ✅ Deployed & Verified (Monad Testnet) | P0 |
| 03 | Frontend Scaffold + Design System | ✅ Implemented & Built | P1 |
| 04 | Shared Types + Contract Hooks | ✅ Implemented & Typed | P1 |
| 05 | Upload Flow | ✅ Implemented & Built | P2 |
| 06 | Go Signaling Server | ✅ Implemented & Tested | P3 |
| 07 | WebRTC P2P Transfer | ✅ Implemented & Built | P3 |
| 10 | Marketplace Page | ✅ Implemented & Built | P4 |
| 11 | Model Detail + Download | ✅ Implemented & Built | P5 |
| 14 | Split Visualization | ✅ Implemented & Built | P5 |
| 12 | Creator Dashboard | ✅ Implemented & Built | P6 |
| 13 | Navigation + Polish | ✅ Implemented & Polished | P6 |
| 08 | Payment-Gated Transfer (Live Wire) | ⏸️ Deferred to Live Integration | P7 |
| 09 | Indexer Service | ⏸️ Upgraded by Spec 20 (Envio) | P7 |
| 15 | README, Pitch & Judge Defense | ⏳ Backlog | P8 |
| 16 | Deployment & DevOps (Vercel + Render) | ✅ Written & Configured | P8 |
| 17 | Persistent CLI Seeder (`torrentia-seeder`) | ✅ Implemented & Tested (11/11 tests) | P8 |
| 18 | Upload Broker & Manifest Provenance | ✅ Implemented & Tested (12/12 tests) | P0 |
| 19 | Authenticated Signaling & Distributed Presence | ✅ Written | P0/P1 |
| 20 | Envio HyperIndex Event Indexer | ✅ Written | P0/P1 |
| 21 | Download Sessions & Batched Payment Authorization | ✅ Written | P1 |
| 22 | Nansen Swarm Intelligence Console | ✅ Written | Bounty |
| 23 | Developer SDK & Local Model Runner | ✅ Written | Roadmap |
| 24 | Model Passport & Lineage Provenance | ✅ Written | P1/P2 |
| 25 | Unified Product Flow & Fallback Governance | ✅ Implemented & Tested | UX/Polish |
| 26 | Mera-Powered Passkey UX & Swarm Streaming | ✅ Implemented & Tested | Bounty |

## Build Order (Implementation)
1. [x] Phase 1: Spec 01 — Smart contracts (`ModelRegistry` + `SplitPayment` + 28 tests passing)
2. [x] Phase 2: Spec 03 — Frontend scaffold + design system + UI primitives + routing
3. [x] Phase 3: Spec 04 — Shared types, ABI exports & contract hooks
4. [x] Phase 4: Spec 05 — Upload flow (chunk, hash, pin, register, IndexedDB)
5. [x] Phase 5: Spec 06 — Go signaling server + tracker
6. [x] Phase 6: Spec 07 — WebRTC P2P transfer (mock payment)
7. [x] Phase 7: Spec 10 — Marketplace Page (cards, search, stats, demo catalog)
8. [x] Phase 8: Specs 11 & 14 — Model Detail, Download & Animated Split Visualization
9. [x] Phase 9: Spec 12 — Creator Dashboard
10. [x] Phase 10: Spec 13 & 25 — Unified Product Flow, Navigation & Fallback Governance
11. [ ] Phase 11: Specs 02, 08, 20 — On-Chain & Envio HyperIndex Integration (Monad testnet deployment, live payment-gated transfer, Envio GraphQL service)
12. [ ] Phase 12: Spec 15 — README, pitch deck & judge defense doc
13. [x] Phase 13: Spec 17 — Persistent CLI Seeder (`torrentia-seeder` standalone Go node with local disk chunk store, dual HTTP/WebRTC transports, Monad RPC payment receipt verifier)
14. [ ] Phase 14: Specs 18 & 19 — Production Security & Signaling Scale (Upload broker server-side pinning, authenticated challenge-response WebSocket, Redis presence)
15. [ ] Phase 15: Spec 21 — Download Sessions & Batched Settlement (`SplitPaymentV2` session channel, off-chain EIP-712 chunk claim vouchers)
16. [ ] Phase 16: Spec 22 — Nansen Swarm Intelligence Console (Contributor profiling, swarm health indicator heuristics, decentralization HHI)
17. [ ] Phase 17: Specs 23 & 24 — Developer SDK, Local Runner & Model Passport (`@torrentia/sdk`, `torrentia run`, `manifestVersion: 2`)
18. [x] Phase 18: Spec 26 — Mera-Powered Passkey UX (Mera auth service, custom Wagmi connector, zero-prompt swarm streaming signer, biometrically gated export modal)

## Open Questions & Dependencies
- [x] Monad testnet faucet — deployed with funded wallet `0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90` (Spec 02)
- [x] OpenZeppelin dependency for ReentrancyGuard — Approved & integrated
- [x] IPFS Pinata integration — Added to `.env.example`
- [x] gorilla/websocket dependency for Go signaling — Approved & integrated
- [ ] Gas limit handling — Monad charges on gas_limit not gas used; SplitPayment contract calls need explicit tight gas limits in frontend
- [ ] `useSendTransactionSync` — evaluate for chunk payment flow to get instant receipts
- [x] Contract verification — verified with Sourcify/Blockvision on Monad testnet (Chain ID 10143)
- [x] `.monskills` metadata file — created with `built-with=monskills` and `chain=monad-testnet`

## Key Decisions Made
- **Split model**: Creator-configurable via `creatorShareBps` (basis points), default 7000 (70%)
- **Framing**: P2P Innovation framing ("Decentralized P2P AI Model Distribution — Fast, swarm-powered weight streaming with atomic on-chain incentives on Monad")
- **Spec format**: Numbered, dependency-ordered, each with Implementation → Scope Limits → Notes → Check When Done
