/*
 * Envio HyperIndex Event Handlers for Torrentia on Monad Testnet (Chain ID 10143)
 * Handles ModelRegistered, ModelDeactivated, and PaymentSplit events.
 */
import {
  ModelRegistry,
  SplitPayment,
  Model,
  PaymentSplitEvent,
  CreatorStat,
  SeederStat,
  NetworkOverview,
} from "generated";

const GLOBAL_ID = "global";

interface NetworkOverviewContext {
  NetworkOverview: {
    get: (id: string) => NetworkOverview | undefined;
    set: (entity: NetworkOverview) => void;
  };
}

function getOrInitNetworkOverview(context: NetworkOverviewContext): NetworkOverview {
  let overview = context.NetworkOverview.get(GLOBAL_ID);
  if (!overview) {
    overview = {
      id: GLOBAL_ID,
      totalModelsRegistered: 0,
      totalActiveModels: 0,
      totalPaymentsSettled: 0n,
      totalVolumeMon: 0n,
      totalUniqueCreators: 0,
      totalUniqueSeeders: 0,
      lastIndexedBlock: 0,
    };
  }
  return overview;
}

ModelRegistry.ModelRegistered.handler(async ({ event, context }) => {
  const modelId = event.params.modelId;
  const creator = event.params.creator.toLowerCase();
  const chunkCount = Number(event.params.chunkCount);
  const totalSize = BigInt(chunkCount) * 1048576n; // 1 MB per chunk

  const model: Model = {
    id: modelId,
    creator,
    metadataURI: event.params.metadataURI,
    pricePerChunk: event.params.chunkPrice,
    chunkCount,
    totalSize,
    creatorShareBps: Number(event.params.creatorShareBps),
    active: true,
    registeredAtBlock: event.block.number,
    registeredAtTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
    totalPaidChunks: 0n,
    totalVolumeMon: 0n,
    totalCreatorEarningsMon: 0n,
    totalSeederEarningsMon: 0n,
    uniqueSeedersCount: 0,
    lastPaymentTimestamp: undefined,
  };

  context.Model.set(model);

  // Update Creator Stats
  let creatorStat = context.CreatorStat.get(creator);
  if (!creatorStat) {
    creatorStat = {
      id: creator,
      totalModelsRegistered: 0,
      activeModelsCount: 0,
      totalRoyaltiesEarnedMon: 0n,
      totalChunksDelivered: 0n,
    };
    const network = getOrInitNetworkOverview(context);
    network.totalUniqueCreators += 1;
    context.NetworkOverview.set(network);
  }
  creatorStat.totalModelsRegistered += 1;
  creatorStat.activeModelsCount += 1;
  context.CreatorStat.set(creatorStat);

  // Update Network Overview
  const network = getOrInitNetworkOverview(context);
  network.totalModelsRegistered += 1;
  network.totalActiveModels += 1;
  network.lastIndexedBlock = event.block.number;
  context.NetworkOverview.set(network);
});

ModelRegistry.ModelDeactivated.handler(async ({ event, context }) => {
  const model = context.Model.get(event.params.modelId);
  if (model && model.active) {
    model.active = false;
    context.Model.set(model);

    const creatorStat = context.CreatorStat.get(model.creator);
    if (creatorStat && creatorStat.activeModelsCount > 0) {
      creatorStat.activeModelsCount -= 1;
      context.CreatorStat.set(creatorStat);
    }

    const network = getOrInitNetworkOverview(context);
    if (network.totalActiveModels > 0) {
      network.totalActiveModels -= 1;
    }
    network.lastIndexedBlock = event.block.number;
    context.NetworkOverview.set(network);
  }
});

SplitPayment.PaymentSplit.handler(async ({ event, context }) => {
  const modelId = event.params.modelId;
  const seeder = event.params.seeder.toLowerCase();
  const creator = event.params.creator.toLowerCase();
  const seederAmount = event.params.seederAmount;
  const creatorAmount = event.params.creatorAmount;
  const totalAmount = event.params.totalPaid;

  const eventId = `${event.chainId}-${event.transaction.hash}-${event.logIndex}`;

  const paymentEvent: PaymentSplitEvent = {
    id: eventId,
    model_id: modelId,
    seeder,
    creator,
    seederAmount,
    creatorAmount,
    totalAmount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  };

  context.PaymentSplitEvent.set(paymentEvent);

  // Update Model Aggregates
  const model = context.Model.get(modelId);
  if (model) {
    model.totalPaidChunks += 1n;
    model.totalVolumeMon += totalAmount;
    model.totalCreatorEarningsMon += creatorAmount;
    model.totalSeederEarningsMon += seederAmount;
    model.lastPaymentTimestamp = event.block.timestamp;
    context.Model.set(model);
  }

  // Update Creator Stats
  const creatorStat = context.CreatorStat.get(creator);
  if (creatorStat) {
    creatorStat.totalRoyaltiesEarnedMon += creatorAmount;
    creatorStat.totalChunksDelivered += 1n;
    context.CreatorStat.set(creatorStat);
  }

  // Update Seeder Stats
  let seederStat = context.SeederStat.get(seeder);
  if (!seederStat) {
    seederStat = {
      id: seeder,
      totalChunksServed: 0n,
      totalEarningsMon: 0n,
      uniqueModelsSeeded: 1,
      lastActiveTimestamp: event.block.timestamp,
    };
    const network = getOrInitNetworkOverview(context);
    network.totalUniqueSeeders += 1;
    context.NetworkOverview.set(network);
  }
  seederStat.totalChunksServed += 1n;
  seederStat.totalEarningsMon += seederAmount;
  seederStat.lastActiveTimestamp = event.block.timestamp;
  context.SeederStat.set(seederStat);

  // Update Network Overview
  const network = getOrInitNetworkOverview(context);
  network.totalPaymentsSettled += 1n;
  network.totalVolumeMon += totalAmount;
  network.lastIndexedBlock = event.block.number;
  context.NetworkOverview.set(network);
});
