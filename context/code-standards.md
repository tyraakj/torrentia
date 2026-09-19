# Code Standards — Torrentia

## Language & Runtime
- **Frontend**: TypeScript (strict), React 18+
- **Smart Contracts**: Solidity 0.8.x, Foundry toolchain
- **Signaling Server**: Go 1.21+
- **Indexer**: Node/TS
- **Package Manager**: npm (frontend/indexer), Go modules (signaling)

## Project Structure
```
torrentia/
├── contracts/           # Foundry project — Solidity contracts + tests
│   ├── src/
│   ├── test/
│   ├── script/
│   └── foundry.toml
├── frontend/            # React/TS Vite app
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/         # utils, contract ABIs, constants
│   │   ├── pages/
│   │   └── services/    # p2p, payment, ipfs
│   ├── public/
│   └── index.html
├── signaling/           # Go signaling + tracker server
│   ├── cmd/
│   ├── internal/
│   └── go.mod
├── indexer/             # Node/TS event indexer
│   ├── src/
│   └── package.json
└── context/             # Project context docs (this directory)
```

## TypeScript Conventions
- `strict: true` in tsconfig — no exceptions
- No `any` casts, no `@ts-ignore`, no `eslint-disable`
- Prefer `interface` over `type` for object shapes
- Use `const` assertions for contract ABIs
- Name files: `kebab-case.ts` for modules, `PascalCase.tsx` for components

## Solidity Conventions
- Solidity 0.8.24+ (Monad compatible)
- Foundry v1.8+ required — includes first-class Monad execution (`network = "monad"` in `foundry.toml`)
- NatSpec comments on all public functions
- Events for every state change (critical for indexer)
- No `selfdestruct`, no `delegatecall` to untrusted
- Tests in Foundry (`forge test`) — runs with Monad gas model, opcode pricing, and 128 KB contract size limit

## Go Conventions
- Standard library preferred over third-party
- `internal/` package for non-exported code
- Context propagation for cancellation
- Structured logging (slog)
- `gorilla/websocket` or `nhooyr.io/websocket` for WS (flag before adding)

## Component Boundaries (Enforced)
- Go service: signaling + tracker ONLY. No chain calls.
- TS indexer: event listening + caching ONLY. No file storage.
- Frontend: wallet ops, contract calls, IPFS, chunking, WebRTC peer logic.

## Testing
- Contracts: Foundry tests (forge test), 100% coverage on payment paths
- Frontend: Vitest for unit, Playwright for e2e if time allows
- Go: standard `go test`
- Indexer: Vitest

## Environment
- Monad testnet (Chain ID 10143, RPC: https://testnet-rpc.monad.xyz)
- Monad mainnet (Chain ID 143, RPC: https://rpc.monad.xyz) — for production
- IPFS via public gateway or Pinata for pinning
- WebRTC via browser native APIs
- Block explorer: testnet.monadscan.com (testnet), monadscan.com (mainnet)

## Monad Gas Rules (Critical)
- Monad charges on `gas_limit`, NOT gas used — tight gas limits save users real money
- For known-cost operations (e.g. native MON transfers = 21,000 gas), hardcode the gas limit
- Never rely solely on `eth_estimateGas` — add at most 10% buffer
- Use `useSendTransactionSync` where possible for instant receipt in same RPC call

## Contract Verification
- Use the Monad verification API (`https://agents.devnads.com/v1/verify`) to verify on all 3 explorers (MonadVision, Socialscan, Monadscan) with one call
- Fallback: `forge verify-contract` with Sourcify (`https://sourcify-api-monad.blockvision.org/`)
- Chain IDs: testnet = 10143, mainnet = 143
