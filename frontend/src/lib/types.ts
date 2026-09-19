/**
 * Shared domain types for Torrentia P2P Model Marketplace.
 * Defined in 00-product-map.md and 04-shared-types-and-contract-hooks.md.
 */

export interface ChunkInfo {
  index: number
  hash: string // SHA-256 hex string
  size: number // bytes
}

export interface ChunkManifest {
  modelId: string // bytes32 hex
  modelName: string
  totalSize: number // bytes
  chunkSize: number // bytes (typically 1MB)
  chunks: ChunkInfo[]
  modelCard: string // markdown description
  createdAt: number // unix timestamp ms
}

export interface IndexedModel {
  modelId: string
  originalCreator: string
  metadataURI: string
  chunkPrice: bigint
  creatorShareBps: number // 100 to 9900 (basis points)
  chunkCount: number
  active: boolean
  seederCount: number
  totalDownloads: number
  registeredAt: number
  modelName?: string
  category?: 'Vision' | 'NLP' | 'Audio' | 'LoRA' | 'Multimodal' | string
  format?: 'ONNX' | 'Safetensors' | 'GGUF' | 'PyTorch' | string
  totalSize?: number // bytes
}

export interface SeederRecord {
  modelId: string
  seederAddress: string
  peerId: string
  chunksHeld: number[]
  lastHeartbeat: number
}

export interface PaymentSplitEvent {
  modelId: string
  seeder: string
  creator: string
  seederAmount: bigint
  creatorAmount: bigint
  totalPaid: bigint
  txHash: string
  blockNumber: number
}

export interface UploadFormData {
  name: string
  file: File | null
  chunkPrice: string // MON amount string
  creatorShareBps: number // e.g. 7000 for 70%
}

export type DownloadStatus =
  | 'idle'
  | 'discovering'
  | 'downloading'
  | 'paying'
  | 'verifying'
  | 'reassembling'
  | 'complete'
  | 'error'

export interface DownloadState {
  modelId: string
  totalChunks: number
  downloadedChunks: number
  currentChunkIndex: number
  status: DownloadStatus
  payments: PaymentSplitEvent[]
  error?: string
}
