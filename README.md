# Torrentia

> **Torrentia solves the horizontal-scaling problem behind AI distribution.**

When an AI model becomes popular, a centralized host must keep adding servers, bandwidth, storage, and load-balancing capacity. Every new download increases the creator’s infrastructure bill, while a single provider outage can make the model unavailable.

Torrentia turns that centralized infrastructure problem into a distributed AI network. Creators publish complete, verified model packages—including weights, tokenizers, configurations, documentation, licenses, and lineage information. Users discover, download, and use those packages, while independent providers help deliver them directly and earn automatic rewards.

As demand grows, the network gains more delivery capacity instead of sending every request through one host.

## What users can do

- **Explore** verified AI model packages.
- **Download** packages from available providers.
- **Publish** a package with a price and earnings split.
- **Share** packages with others and earn provider rewards.

The suggested default split is **70% creator / 30% provider**. Creators can choose any 1%–99% split for each package.

## Smart contracts

Monad Testnet, chain ID `10143`:

| Contract | Address |
|---|---|
| `ModelRegistry` | [`0xe2cEDee4817B11716728aed3C3d7AD0438813340`](https://testnet.monadscan.com/address/0xe2cEDee4817B11716728aed3C3d7AD0438813340) |
| `SplitPayment` | [`0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa`](https://testnet.monadscan.com/address/0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa) |

`SplitPaymentV2` is implemented and locally tested, but still needs deployment before session-based batched payments are live.

## Quick setup

Requirements: Node.js, Go 1.27+, Foundry, and a Monad-compatible wallet with testnet MON.

```bash
cd contracts && forge test
cd ../signaling && go test ./... && go run ./cmd/signaling --port 8081
cd ../frontend && npm install && npm run dev
```

Create `frontend/.env.local`:

```env
VITE_MODEL_REGISTRY_ADDRESS=0xe2cEDee4817B11716728aed3C3d7AD0438813340
VITE_SPLIT_PAYMENT_ADDRESS=0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa
VITE_SIGNALING_URL=ws://localhost:8081/ws
VITE_ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql
VITE_UPLOAD_BROKER_URL=http://localhost:8082
```

Keep `PINATA_JWT` server-side. Never expose it through a `VITE_*` variable.

Open the frontend, connect a funded Monad Testnet wallet, publish or open a small package, and use another browser profile to download it. A laptop can run the provider; a VPS is optional.

## More context

See the [architecture context](context/architecture-context.md) and the [product specifications](context/specs/00-product-map.md).

## License

MIT
