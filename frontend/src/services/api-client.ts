/**
 * API client for querying the Torrentia Indexer service and managing
 * the model catalog with offline-resilient fallbacks.
 * Adheres to Spec 10 & Spec 09 with standardized /v1 routes.
 */

import { createPublicClient, http, type Address } from 'viem'
import type { IndexedModel, PaymentSplitEvent } from '../lib/types'
import { MODEL_REGISTRY_ABI } from '../lib/abis/ModelRegistryABI'
import { MODEL_REGISTRY_ADDRESS } from '../lib/contracts'
import { monadTestnet } from '../lib/wagmi'
import { allowMockFallbacks } from '../lib/app-mode'
import {
  isEnvioConfigured,
  fetchEnvioModels,
  fetchEnvioModel,
  fetchEnvioStats,
  fetchEnvioPayments,
} from './envio-client'

const INDEXER_BASE_URL = String(import.meta.env.VITE_INDEXER_URL || '').trim()

const chainClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
})

const MODEL_REGISTRY_DEPLOYMENT_BLOCK = BigInt(
  import.meta.env.VITE_MODEL_REGISTRY_DEPLOYMENT_BLOCK || '0x3ce5c19',
)

async function fetchOnChainModels(creator?: string): Promise<IndexedModel[]> {
  const latestBlock = await chainClient.getBlockNumber()
  const rangeSize = 10_000n
  const logs = []

  for (
    let fromBlock = MODEL_REGISTRY_DEPLOYMENT_BLOCK;
    fromBlock <= latestBlock;
    fromBlock += rangeSize
  ) {
    const toBlock = fromBlock + rangeSize - 1n < latestBlock
      ? fromBlock + rangeSize - 1n
      : latestBlock

    const rangeLogs = await chainClient.getContractEvents({
      address: MODEL_REGISTRY_ADDRESS,
      abi: MODEL_REGISTRY_ABI,
      eventName: 'ModelRegistered',
      fromBlock,
      toBlock,
      args: creator ? { creator: creator as Address } : undefined,
    })
    logs.push(...rangeLogs)
  }

  return logs.flatMap((log) => {
    const args = log.args
    if (
      !args.modelId ||
      !args.creator ||
      args.metadataURI === undefined ||
      args.chunkPrice === undefined ||
      args.creatorShareBps === undefined ||
      args.chunkCount === undefined
    ) {
      return []
    }

    return {
      modelId: args.modelId,
      originalCreator: args.creator,
      metadataURI: args.metadataURI,
      chunkPrice: args.chunkPrice,
      creatorShareBps: Number(args.creatorShareBps),
      chunkCount: Number(args.chunkCount),
      active: true,
      seederCount: 0,
      totalDownloads: 0,
      registeredAt: 0,
      modelName: 'On-chain registered model',
      category: 'Vision',
      format: 'ONNX',
      totalSize: Number(args.chunkCount) * 1048576,
    }
  })
}

export interface SwarmStats {
  totalModels: number
  totalDownloads: number
  totalVolumeMon: string
}

export const FALLBACK_MODELS: IndexedModel[] = [
  {
    modelId: 'llama-3-8b',
    modelName: 'Llama-3-8B-Instruct.Q4_K_M.gguf',
    originalCreator: '0x71C83897F43a31c552E4F9f75f928f58b0933e4b',
    metadataURI: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    chunkPrice: 100000000000000n, // 0.0001 MON
    creatorShareBps: 7000, // 70% Creator / 30% Seeder
    chunkCount: 4,
    totalSize: 4194304, // 4 MB demo partition
    active: true,
    seederCount: 3,
    totalDownloads: 482,
    registeredAt: Date.now() - 86400000 * 3,
    category: 'NLP',
    format: 'GGUF',
    isDemo: true,
  },
]


/**
 * Reads any locally registered models from browser localStorage (e.g. from /upload flow)
 */
function getLocalUploadedModels(): IndexedModel[] {
  try {
    const raw = localStorage.getItem('torrentia_local_models')
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
    return parsed.map((item) => ({
      modelId: String(item.modelId || ''),
      modelName: String(item.modelName || 'Custom Uploaded Model'),
      originalCreator: String(item.originalCreator || ''),
      metadataURI: String(item.metadataURI || ''),
      chunkPrice: BigInt(String(item.chunkPrice || '100000000000000')),
      creatorShareBps: Number(item.creatorShareBps || 7000),
      chunkCount: Number(item.chunkCount || 1),
      totalSize: Number(item.totalSize || 1048576),
      active: true,
      seederCount: 1, // The local browser seeds it
      totalDownloads: 0,
      registeredAt: Number(item.registeredAt || Date.now()),
      category: (item.category as string) || 'Vision',
      format: (item.format as string) || 'ONNX',
      isDemo: Boolean(item.isDemo),
    }))
  } catch {
    return []
  }
}

/**
 * Save a newly registered model locally so it instantly reflects in the Marketplace.
 */
export function saveLocalUploadedModel(model: IndexedModel): void {
  try {
    const existing = getLocalUploadedModels().filter((m) => m.modelId !== model.modelId)
    const serializable = [
      {
        ...model,
        chunkPrice: model.chunkPrice.toString(),
      },
      ...existing.map((m) => ({ ...m, chunkPrice: m.chunkPrice.toString() })),
    ]
    localStorage.setItem('torrentia_local_models', JSON.stringify(serializable))
  } catch (err) {
    console.error('Failed to save local model to storage:', err)
  }
}

/**
 * Fetches all models from the indexer API with fallback catalog merge.
 */
export async function fetchModels(params?: {
  search?: string
  category?: string
  creator?: string
}): Promise<IndexedModel[]> {
  const localModels = getLocalUploadedModels()
  let models: IndexedModel[] = [...localModels]

  // Strictly govern fallback mock catalog: only inject in demo mode (Spec 25)
  if (allowMockFallbacks()) {
    const localIds = new Set(localModels.map((m) => m.modelId))
    models = [...models, ...FALLBACK_MODELS.filter((m) => !localIds.has(m.modelId))]
  }

  // 1. Prioritize Envio HyperIndex GraphQL Service (Spec 20)
  let envioLoaded = false
  if (isEnvioConfigured()) {
    try {
      const envioModels = await fetchEnvioModels({
        creator: params?.creator,
        limit: 100,
      })
      if (envioModels.length > 0) {
        const envioIds = new Set(envioModels.map((m) => m.modelId.toLowerCase()))
        models = [
          ...envioModels,
          ...models.filter((m) => !envioIds.has(m.modelId.toLowerCase())),
        ]
        envioLoaded = true
      }
    } catch {
      // Fall through to direct chain/indexer query on Envio error
    }
  }

  // 2. Direct on-chain event scan fallback if Envio is not configured or returned zero records
  if (!envioLoaded) {
    try {
      const onChainModels = await fetchOnChainModels(params?.creator)
      const onChainIds = new Set(onChainModels.map((m) => m.modelId.toLowerCase()))
      models = [
        ...onChainModels,
        ...models.filter((m) => !onChainIds.has(m.modelId.toLowerCase())),
      ]
    } catch {
      // Keep local/demo fallback if the public RPC is unavailable.
    }
  }

  // Try live indexer query if available
  if (INDEXER_BASE_URL) try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.category && params.category !== 'All') query.set('category', params.category)
    if (params?.creator) query.set('creator', params.creator)

    const url = `${INDEXER_BASE_URL}/v1/models${query.toString() ? `?${query.toString()}` : ''}`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = (await res.json()) as Array<{
        modelId: string
        originalCreator: string
        metadataURI: string
        chunkPrice: string
        creatorShareBps: number
        chunkCount: number
        active: boolean
        seederCount: number
        totalDownloads: number
        registeredAt: number
        modelName?: string
        category?: string
        format?: string
        totalSize?: number
      }>

      if (Array.isArray(data) && data.length > 0) {
        const liveModels: IndexedModel[] = data.map((d) => ({
          ...d,
          chunkPrice: BigInt(d.chunkPrice),
        }))
        // Merge live models with local models
        const liveIds = new Set(liveModels.map((m) => m.modelId))
        models = [...liveModels, ...models.filter((m) => !liveIds.has(m.modelId))]
      }
    }
  } catch {
    // Graceful fallback to cached/sample catalog on network failure
  }

  // Apply client-side search and category filtering
  let filtered = models
  if (params?.category && params.category !== 'All') {
    filtered = filtered.filter((m) => m.category?.toLowerCase() === params.category?.toLowerCase())
  }

  if (params?.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase()
    filtered = filtered.filter(
      (m) =>
        m.modelName?.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.originalCreator.toLowerCase().includes(q) ||
        m.format?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q)
    )
  }

  return filtered
}

/**
 * Fetches a single model by its modelId.
 */
export async function fetchModel(modelId: string): Promise<IndexedModel | null> {
  // 1. Query Envio HyperIndex GraphQL service first if configured (Spec 20)
  if (isEnvioConfigured()) {
    try {
      const envioModel = await fetchEnvioModel(modelId)
      if (envioModel) return envioModel
    } catch {
      // Fall through to local and chain lookup
    }
  }

  const all = await fetchModels()
  const found = all.find((m) => m.modelId.toLowerCase() === modelId.toLowerCase())
  if (found) return found

  // Direct chain lookup keeps a newly registered model openable before the
  // optional indexer has been deployed or indexed the registration event.
  if (!/^0x[0-9a-fA-F]{64}$/.test(modelId)) return null

  try {
    const onChainModel = await chainClient.readContract({
      address: MODEL_REGISTRY_ADDRESS,
      abi: MODEL_REGISTRY_ABI,
      functionName: 'getModel',
      args: [modelId as `0x${string}`],
    })

    if (onChainModel.originalCreator === '0x0000000000000000000000000000000000000000') {
      return null
    }

    return {
      modelId,
      originalCreator: onChainModel.originalCreator,
      metadataURI: onChainModel.metadataURI,
      chunkPrice: onChainModel.chunkPrice,
      creatorShareBps: Number(onChainModel.creatorShareBps),
      chunkCount: Number(onChainModel.chunkCount),
      active: onChainModel.active,
      seederCount: 0,
      totalDownloads: 0,
      registeredAt: 0,
      modelName: 'On-chain registered model',
      category: 'Vision',
      format: 'ONNX',
      totalSize: Number(onChainModel.chunkCount) * 1048576,
    }
  } catch {
    return null
  }
}

/**
 * Fetches platform-wide swarm metrics.
 */
export async function fetchStats(): Promise<SwarmStats> {
  // 1. Query Envio NetworkOverview first if configured (Spec 20)
  if (isEnvioConfigured()) {
    try {
      const envioStats = await fetchEnvioStats()
      if (envioStats) return envioStats
    } catch {
      // Fall through to local metrics calculation
    }
  }

  const models = await fetchModels()
  const totalModels = models.length
  const totalDownloads = models.reduce((acc, m) => acc + m.totalDownloads, 0)

  // Calculate volume in MON
  let totalVolumeWei = 0n
  for (const m of models) {
    totalVolumeWei += m.chunkPrice * BigInt(m.chunkCount) * BigInt(m.totalDownloads)
  }

  // Convert wei to MON formatted string
  const totalVolumeMon = (Number(totalVolumeWei / 1000000000000000n) / 1000).toFixed(2)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(`${INDEXER_BASE_URL}/v1/stats`, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = (await res.json()) as {
        totalModels?: number
        totalDownloads?: number
        totalVolumeMon?: string
      }
      return {
        totalModels: data.totalModels ?? totalModels,
        totalDownloads: data.totalDownloads ?? totalDownloads,
        totalVolumeMon: data.totalVolumeMon ?? totalVolumeMon,
      }
    }
  } catch {
    // Fallback to locally aggregated metrics
  }

  return {
    totalModels,
    totalDownloads,
    totalVolumeMon,
  }
}

/**
 * Fetches recent payments for a model.
 */
export async function fetchPayments(modelId: string): Promise<PaymentSplitEvent[]> {
  // 1. Query Envio PaymentSplitEvents first if configured (Spec 20)
  if (isEnvioConfigured()) {
    try {
      const envioPayments = await fetchEnvioPayments(modelId, 50)
      if (envioPayments.length > 0) return envioPayments
    } catch {
      // Fall through to REST indexer or empty fallback
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(`${INDEXER_BASE_URL}/v1/models/${modelId}/payments`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = (await res.json()) as Array<{
        modelId: string
        seeder: string
        creator: string
        seederAmount: string
        creatorAmount: string
        totalPaid: string
        txHash: string
        blockNumber: number
      }>
      return data.map((d) => ({
        ...d,
        seederAmount: BigInt(d.seederAmount),
        creatorAmount: BigInt(d.creatorAmount),
        totalPaid: BigInt(d.totalPaid),
      }))
    }
  } catch {
    // Fallback
  }
  return []
}
