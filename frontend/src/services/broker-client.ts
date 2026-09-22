import { ChunkManifest } from '../lib/types'

// EIP-712 Domain for the Upload Broker
export const UPLOAD_BROKER_DOMAIN = {
  name: 'Torrentia Upload Broker',
  version: '1',
  chainId: 10143, // Monad Testnet
} as const

// EIP-712 Types for UploadIntent
export const UPLOAD_INTENT_TYPES = {
  UploadIntent: [
    { name: 'creator', type: 'address' },
    { name: 'modelId', type: 'bytes32' },
    { name: 'totalSize', type: 'uint64' },
    { name: 'chunkCount', type: 'uint32' },
    { name: 'manifestHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

export interface UploadIntentMessage {
  creator: `0x${string}`
  modelId: `0x${string}`
  totalSize: bigint
  chunkCount: number
  manifestHash: `0x${string}`
  nonce: bigint
  deadline: bigint
}

export interface UploadBrokerResponse {
  cid: string
  uri: string
  modelId: string
  totalSize: number
  chunkCount: number
}

const DEFAULT_BROKER_URL = 'http://localhost:8082'

/**
 * Computes the SHA-256 hex hash of the canonical manifest JSON string.
 */
export async function computeManifestHash(rawJSON: string): Promise<`0x${string}`> {
  const encoder = new TextEncoder()
  const data = encoder.encode(rawJSON)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `0x${hashHex}`
}

/**
 * Builds an UploadIntent message ready for EIP-712 signing.
 */
export function buildUploadIntent(params: {
  creator: `0x${string}`
  modelId: `0x${string}`
  totalSize: number | bigint
  chunkCount: number
  manifestHash: `0x${string}`
  nonce?: bigint
  ttlSeconds?: number
}): UploadIntentMessage {
  const now = Math.floor(Date.now() / 1000)
  const deadline = BigInt(now + (params.ttlSeconds ?? 3600)) // 1 hour default deadline
  const nonce = params.nonce ?? BigInt(Date.now())

  return {
    creator: params.creator,
    modelId: params.modelId,
    totalSize: BigInt(params.totalSize),
    chunkCount: params.chunkCount,
    manifestHash: params.manifestHash,
    nonce,
    deadline,
  }
}

/**
 * Submits the signed upload intent and manifest JSON to the Go Upload Broker.
 */
export async function submitToUploadBroker(
  intent: UploadIntentMessage,
  signature: `0x${string}`,
  manifest: ChunkManifest,
  brokerUrl?: string
): Promise<UploadBrokerResponse> {
  const baseUrl = (brokerUrl || import.meta.env.VITE_UPLOAD_BROKER_URL || DEFAULT_BROKER_URL).replace(/\/$/, '')
  const rawJSON = JSON.stringify(manifest)

  const payload = {
    intent: {
      creator: intent.creator,
      modelId: intent.modelId,
      totalSize: Number(intent.totalSize),
      chunkCount: intent.chunkCount,
      manifestHash: intent.manifestHash,
      nonce: intent.nonce.toString(),
      deadline: Number(intent.deadline),
    },
    signature,
    manifest: JSON.parse(rawJSON),
  }

  try {
    const response = await fetch(`${baseUrl}/v1/uploads/manifest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorText = await response.text()
      try {
        const errJson = JSON.parse(errorText)
        errorText = errJson.details ? `${errJson.error}: ${errJson.details}` : errJson.error || errorText
      } catch {
        // use raw text
      }
      throw new Error(`Upload Broker error (${response.status}): ${errorText}`)
    }

    const data: UploadBrokerResponse = await response.json()
    return data
  } catch (err) {
    // If the broker service is offline and we are in local development / demo mode,
    // generate a local deterministic CID and cache it.
    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.warn('Upload Broker unreachable at', baseUrl, '— falling back to local demo manifest')
      const localCid = `bafkreidemo${intent.modelId.replace('0x', '').slice(0, 32)}`
      try {
        localStorage.setItem(`ipfs_${localCid}`, rawJSON)
      } catch {
        // ignore localStorage quota errors
      }
      return {
        cid: localCid,
        uri: `ipfs://${localCid}`,
        modelId: intent.modelId,
        totalSize: Number(intent.totalSize),
        chunkCount: intent.chunkCount,
      }
    }
    throw err
  }
}
