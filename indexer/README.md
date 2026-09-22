# Torrentia Envio HyperIndex Event Indexer

High-throughput, real-time event indexing service and GraphQL API for **Torrentia: Decentralized P2P AI Model Marketplace** on **Monad Testnet (Chain ID 10143)**.

Built with [Envio HyperIndex](https://envio.dev) (`v3.0.0-alpha.21`), this service projects on-chain model registrations, deactivations, and atomic 402 payment splits into a low-latency relational GraphQL store.

---

## Architecture & Indexed Contracts

### Network: Monad Testnet (Chain ID `10143`)
- **RPC URL:** `https://testnet-rpc.monad.xyz`
- **Start Block:** `63855640` (Deployment block of Torrentia contracts)

### Contracts & Events
| Contract | Address | Events Indexed |
| :--- | :--- | :--- |
| **ModelRegistry** | `0xe2cEDee4817B11716728aed3C3d7AD0438813340` | `ModelRegistered`, `ModelDeactivated` |
| **SplitPayment** | `0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa` | `PaymentSplit` |

---

## Schema Entities

- **`Model`**: Core model metadata, pricing, creator split bps, active status, plus aggregated real-time metrics (`totalPaidChunks`, `totalVolumeMon`, `totalCreatorEarningsMon`, `totalSeederEarningsMon`, `uniqueSeedersCount`, `lastPaymentTimestamp`).
- **`PaymentSplitEvent`**: Composite-keyed (`${chainId}-${txHash}-${logIndex}`) audit trail of every chunk payment with seeder payout, creator royalty, and transaction hash.
- **`CreatorStat`**: Aggregated performance per creator address (`totalModelsRegistered`, `activeModelsCount`, `totalRoyaltiesEarnedMon`, `totalChunksDelivered`).
- **`SeederStat`**: Performance metrics per seeder node (`totalChunksServed`, `totalEarningsMon`, `uniqueModelsSeeded`, `lastActiveTimestamp`).
- **`NetworkOverview`**: Singleton (`"global"`) platform metrics tracking cumulative volume, settled payments, total active models, and unique swarm contributors.

---

## Deployment to Envio Cloud

Envio Cloud deploys directly from GitHub and provides a managed PostgreSQL + Hasura GraphQL instance.

### Option 1: Via Envio Cloud Web Dashboard (Recommended)
1. Push this repository to GitHub (`https://github.com/tyraakj/torrentia`).
2. Go to [https://envio.dev](https://envio.dev) (or [https://cloud.envio.dev](https://cloud.envio.dev)) and log in with your GitHub account.
3. Click **Add Indexer** / **New Indexer**.
4. Select `tyraakj/torrentia` repository and set directory to `indexer`.
5. Envio Cloud will automatically run `envio codegen`, launch the indexing engine, and provision a public HTTPS GraphQL endpoint.
6. Copy the GraphQL endpoint (e.g. `https://indexer.bigdevenergy.link/<org>/torrentia/v1/graphql`) and set it as `VITE_ENVIO_GRAPHQL_URL` in `frontend/.env`.

### Option 2: Via `envio-cloud` CLI
```bash
npm install -g envio-cloud
envio-cloud login
envio-cloud config set-org <your-org-slug>
envio-cloud indexer add --name torrentia-indexer --repo tyraakj/torrentia
```

Once synced, promote the deployment:
```bash
envio-cloud deployment promote torrentia-indexer <commit-sha>
```

---

## Sample GraphQL Queries

### 1. Marketplace Models & Platform Overview
```graphql
query GetMarketplaceModels($limit: Int = 20, $offset: Int = 0) {
  Model(
    limit: $limit
    offset: $offset
    order_by: { registeredAtTimestamp: desc }
    where: { active: { _eq: true } }
  ) {
    id
    creator
    metadataURI
    pricePerChunk
    chunkCount
    totalSize
    creatorShareBps
    totalVolumeMon
    totalPaidChunks
    uniqueSeedersCount
  }
  NetworkOverview_by_pk(id: "global") {
    totalModelsRegistered
    totalActiveModels
    totalVolumeMon
    totalPaymentsSettled
    totalUniqueSeeders
  }
}
```

### 2. Model Detail & Payment Stream
```graphql
query GetModelDetail($modelId: ID!) {
  Model_by_pk(id: $modelId) {
    id
    creator
    metadataURI
    pricePerChunk
    chunkCount
    totalSize
    creatorShareBps
    active
    registeredAtBlock
    registeredAtTimestamp
    txHash
    totalPaidChunks
    totalVolumeMon
    totalCreatorEarningsMon
    totalSeederEarningsMon
    uniqueSeedersCount
    payments(limit: 50, order_by: { blockTimestamp: desc }) {
      id
      seeder
      creator
      seederAmount
      creatorAmount
      totalAmount
      txHash
      blockNumber
      blockTimestamp
    }
  }
}
```

### 3. Creator Dashboard Analytics
```graphql
query GetCreatorDashboard($creator: String!) {
  CreatorStat_by_pk(id: $creator) {
    totalModelsRegistered
    activeModelsCount
    totalRoyaltiesEarnedMon
    totalChunksDelivered
  }
  Model(
    where: { creator: { _eq: $creator } }
    order_by: { registeredAtTimestamp: desc }
  ) {
    id
    metadataURI
    pricePerChunk
    chunkCount
    creatorShareBps
    active
    totalPaidChunks
    totalVolumeMon
    totalCreatorEarningsMon
  }
}
```
