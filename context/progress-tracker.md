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
| 13 | Navigation + Polish | ⏳ Next Up | P6 |
| 08 | Payment-Gated Transfer (x402 Live Wire) | ⏸️ Deferred to Live Integration | P7 |
| 09 | Indexer Service | ⏸️ Deferred to Live Integration | P7 |
| 15 | README, Pitch & Judge Defense | ⏳ Backlog | P8 |
| 16 | Deployment & DevOps (Vercel + Render) | ✅ Written & Configured | P8 |

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
10. [ ] Phase 10: Spec 13 — Navigation, toasts, and UI polish
11. [ ] Phase 11: Specs 02, 08, 09 — On-Chain Integration (Monad testnet deployment, real x402 payment, indexer service)
12. [ ] Phase 12: Spec 15 — README, pitch deck & judge defense doc

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
