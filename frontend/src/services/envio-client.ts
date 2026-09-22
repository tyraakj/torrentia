/**
 * Envio HyperIndex GraphQL Client for Torrentia.
 * Connects to Envio Cloud or local HyperIndex instance to query indexed
 * models, payment splits, and swarm network metrics on Monad Testnet (Chain ID 10143).
 * Adheres to Spec 20.
 */

import type { IndexedModel, PaymentSplitEvent } from '../lib/types'
import type { SwarmStats } from './api-client'
import { formatEther } from 'viem'

export const ENVIO_GRAPHQL_URL = (
  String(import.meta.env.VITE_ENVIO_GRAPHQL_URL || '').trim()
)

const QUERY_CACHE_TTL_MS = 15_000
const responseCache = new Map<string, { expiresAt: number; data: unknown }>()
const inFlightQueries = new Map<string, Promise<unknown>>()

/**
 * Checks if the Envio GraphQL endpoint is configured in the environment.
 */
export function isEnvioConfigured(): boolean {
  return Boolean(ENVIO_GRAPHQL_URL && ENVIO_GRAPHQL_URL.length > 0)
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string; locations?: unknown; path?: unknown }>
}

/**
 * Executes a GraphQL query against the Envio endpoint with an abort timeout.
 */
export async function queryEnvio<T>(
  query: string,
  variables: Record<string, unknown> = {},
  timeoutMs = 3000,
): Promise<T> {
  if (!isEnvioConfigured()) {
    throw new Error('Envio GraphQL endpoint is not configured')
  }

  const cacheKey = JSON.stringify([query, variables])
  const cached = responseCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data as T

  const inFlight = inFlightQueries.get(cacheKey)
  if (inFlight) return inFlight as Promise<T>

  const request = (async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(ENVIO_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Envio HTTP ${response.status}: ${response.statusText}`)
      }

      const json = (await response.json()) as GraphQLResponse<T>
      if (json.errors && json.errors.length > 0) {
        throw new Error(`Envio GraphQL: ${json.errors[0].message}`)
      }

      if (!json.data) {
        throw new Error('Envio GraphQL response did not contain data')
      }

      responseCache.set(cacheKey, { expiresAt: Date.now() + QUERY_CACHE_TTL_MS, data: json.data })
      return json.data
    } finally {
      clearTimeout(timeoutId)
    }
  })()

  inFlightQueries.set(cacheKey, request)
  try {
    return await request as T
  } finally {
    inFlightQueries.delete(cacheKey)
  }
}

// ---------------------------------------------------------------------------
// GraphQL Query Definitions
// ---------------------------------------------------------------------------

export const GET_MARKETPLACE_MODELS_QUERY = /* GraphQL */ `
  query GetMarketplaceModels($limit: Int, $offset: Int, $where: Model_bool_exp) {
    Model(
      limit: $limit
      offset: $offset
      order_by: { registeredAtTimestamp: desc }
      where: $where
    ) {
      id
      creator
      metadataURI
      chunkPrice
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
    }
  }
`

export const GET_MODEL_DETAIL_QUERY = /* GraphQL */ `
  query GetModelDetail($modelId: ID!) {
    Model_by_pk(id: $modelId) {
      id
      creator
      metadataURI
      chunkPrice
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
      lastPaymentTimestamp
    }
  }
`

export const GET_PAYMENTS_FOR_MODEL_QUERY = /* GraphQL */ `
  query GetPaymentsForModel($modelId: ID!, $limit: Int) {
    PaymentSplitEvent(
      where: { model_id: { _eq: $modelId } }
      order_by: { blockTimestamp: desc }
      limit: $limit
    ) {
      id
      seeder
      creator
      seederAmount
      creatorAmount
      totalAmount
      blockNumber
      blockTimestamp
      txHash
    }
  }
`

export const GET_NETWORK_OVERVIEW_QUERY = /* GraphQL */ `
  query GetNetworkOverview {
    NetworkOverview_by_pk(id: "global") {
      totalModelsRegistered
      totalActiveModels
      totalPaymentsSettled
      totalVolumeMon
      totalUniqueCreators
      totalUniqueSeeders
      lastIndexedBlock
    }
  }
`

export const GET_CREATOR_DASHBOARD_QUERY = /* GraphQL */ `
  query GetCreatorDashboard($creator: ID!) {
    CreatorStat_by_pk(id: $creator) {
      id
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
      creator
      metadataURI
      chunkPrice
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
    }
  }
`

// ---------------------------------------------------------------------------
// Response Shapes & Transformation
// ---------------------------------------------------------------------------

export interface RawEnvioModel {
  id: string
  creator: string
  metadataURI: string
  chunkPrice: string | number
  chunkCount: number
  totalSize?: string | number
  creatorShareBps: number
  active: boolean
  registeredAtBlock: number
  registeredAtTimestamp: number
  txHash: string
  totalPaidChunks?: string | number
  totalVolumeMon?: string | number
  totalCreatorEarningsMon?: string | number
  totalSeederEarningsMon?: string | number
  uniqueSeedersCount?: number
  lastPaymentTimestamp?: number
}

export interface RawEnvioPaymentSplit {
  id: string
  seeder: string
  creator: string
  seederAmount: string | number
  creatorAmount: string | number
  totalAmount: string | number
  blockNumber: number
  blockTimestamp: number
  txHash: string
}

export interface RawEnvioNetworkOverview {
  totalModelsRegistered: number
  totalActiveModels: number
  totalPaymentsSettled: string | number
  totalVolumeMon: string | number
  totalUniqueCreators: number
  totalUniqueSeeders: number
  lastIndexedBlock: number
}

export interface RawEnvioCreatorStat {
  id: string
  totalModelsRegistered: number
  activeModelsCount: number
  totalRoyaltiesEarnedMon: string | number
  totalChunksDelivered: string | number
}

/**
 * Transforms a raw Envio GraphQL model record into Torrentia's IndexedModel domain shape.
 */
export function transformEnvioModel(raw: RawEnvioModel): IndexedModel {
  const chunkCount = Number(raw.chunkCount) || 1
  const priceWei = BigInt(raw.chunkPrice || 0)
  const paidChunks = Number(raw.totalPaidChunks || 0)

  // Derive model name and format from metadataURI or ID
  const shortId = raw.id.length > 10 ? `${raw.id.slice(0, 6)}...${raw.id.slice(-4)}` : raw.id
  const modelName = `Model ${shortId}`

  return {
    modelId: raw.id,
    originalCreator: raw.creator,
    metadataURI: raw.metadataURI,
    chunkPrice: priceWei,
    creatorShareBps: Number(raw.creatorShareBps),
    chunkCount,
    active: Boolean(raw.active),
    seederCount: Math.max(1, Number(raw.uniqueSeedersCount || 1)),
    totalDownloads: Math.floor(paidChunks / chunkCount),
    registeredAt: Number(raw.registeredAtTimestamp) * 1000,
    modelName,
    category: 'Vision',
    format: 'ONNX',
    totalSize: Number(raw.totalSize) || chunkCount * 1048576,
    isDemo: false,
  }
}

/**
 * Transforms raw Envio payment split records into domain PaymentSplitEvents.
 */
export function transformEnvioPayment(raw: RawEnvioPaymentSplit, modelId: string): PaymentSplitEvent {
  return {
    modelId,
    seeder: raw.seeder,
    creator: raw.creator,
    seederAmount: BigInt(raw.seederAmount || 0),
    creatorAmount: BigInt(raw.creatorAmount || 0),
    totalPaid: BigInt(raw.totalAmount || 0),
    txHash: raw.txHash,
    blockNumber: Number(raw.blockNumber),
    blockTimestamp: Number(raw.blockTimestamp) * 1000,
  }
}

// ---------------------------------------------------------------------------
// High-Level Service Functions
// ---------------------------------------------------------------------------

/**
 * Fetches models from Envio HyperIndex.
 */
export async function fetchEnvioModels(params?: {
  creator?: string
  activeOnly?: boolean
  limit?: number
  offset?: number
}): Promise<IndexedModel[]> {
  const whereClause: Record<string, unknown> = {}
  if (params?.creator) {
    whereClause.creator = { _eq: params.creator.toLowerCase() }
  }
  if (params?.activeOnly !== false) {
    whereClause.active = { _eq: true }
  }

  const result = await queryEnvio<{ Model: RawEnvioModel[] }>(
    GET_MARKETPLACE_MODELS_QUERY,
    {
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    },
  )

  return (result.Model || []).map(transformEnvioModel)
}

/**
 * Fetches a single model by ID from Envio.
 */
export async function fetchEnvioModel(modelId: string): Promise<IndexedModel | null> {
  const result = await queryEnvio<{ Model_by_pk: RawEnvioModel | null }>(
    GET_MODEL_DETAIL_QUERY,
    { modelId },
  )

  if (!result.Model_by_pk) {
    return null
  }

  return transformEnvioModel(result.Model_by_pk)
}

/**
 * Fetches payment split events for a given model from Envio.
 */
export async function fetchEnvioPayments(
  modelId: string,
  limit = 50,
): Promise<PaymentSplitEvent[]> {
  const result = await queryEnvio<{ PaymentSplitEvent: RawEnvioPaymentSplit[] }>(
    GET_PAYMENTS_FOR_MODEL_QUERY,
    { modelId, limit },
  )

  return (result.PaymentSplitEvent || []).map((raw) => transformEnvioPayment(raw, modelId))
}

/**
 * Fetches global platform swarm statistics from Envio.
 */
export async function fetchEnvioStats(): Promise<SwarmStats | null> {
  const result = await queryEnvio<{ NetworkOverview_by_pk: RawEnvioNetworkOverview | null }>(
    GET_NETWORK_OVERVIEW_QUERY,
  )

  const overview = result.NetworkOverview_by_pk
  if (!overview) {
    return null
  }

  const totalVolumeWei = BigInt(overview.totalVolumeMon || 0)
  const formattedMon = parseFloat(formatEther(totalVolumeWei)).toFixed(2)

  return {
    totalModels: Number(overview.totalModelsRegistered || 0),
    totalDownloads: Number(overview.totalPaymentsSettled || 0),
    totalVolumeMon: formattedMon,
  }
}

/**
 * Fetches creator statistics from Envio.
 */
export async function fetchEnvioCreatorStats(creator: string): Promise<{
  stat: RawEnvioCreatorStat | null
  models: IndexedModel[]
}> {
  const result = await queryEnvio<{
    CreatorStat_by_pk: RawEnvioCreatorStat | null
    Model: RawEnvioModel[]
  }>(GET_CREATOR_DASHBOARD_QUERY, { creator: creator.toLowerCase() })

  return {
    stat: result.CreatorStat_by_pk,
    models: (result.Model || []).map(transformEnvioModel),
  }
}
