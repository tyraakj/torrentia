/**
 * Downloader service for orchestrating sequential chunk downloads over WebRTC.
 * Discovers seeders via signaling, requests chunks, presents on-chain payment proofs,
 * verifies SHA-256 chunk hashes against the manifest, stores chunks in IndexedDB,
 * and reassembles the complete file into a downloadable Blob.
 */

import type { ChunkManifest, DownloadState, PaymentSplitEvent, SeederRecord } from '../lib/types'
import { bufferToHex } from './chunker'
import { getAllChunks, getHeldChunks, storeChunk } from './chunk-store'
import { PeerConnection } from './peer-connection'
import type { SignalingClient } from './signaling-client'

export interface PaymentProvider {
  makePayment(
    modelId: string,
    chunkIndex: number,
    chunkPrice: string,
    seederAddress: string
  ): Promise<string>
}

export type DownloadProgressCallback = (state: DownloadState) => void
export type ChunkVerifiedCallback = (chunkIndex: number) => void
export type DownloadCompleteCallback = (blob: Blob) => void
export type DownloadErrorCallback = (err: Error) => void

export class Downloader {
  public readonly modelId: string
  public readonly manifest: ChunkManifest
  public readonly creatorAddress: string
  public readonly creatorShareBps: number
  public readonly walletAddress: string
  private signaling: SignalingClient
  private paymentProvider: PaymentProvider

  private isRunning = false
  private isCancelled = false
  private peerConnections = new Map<string, PeerConnection>()
  private peerReadyPromises = new Map<string, Promise<PeerConnection>>()
  private unsubscribers: (() => void)[] = []

  private progressCallbacks: DownloadProgressCallback[] = []
  private chunkVerifiedCallbacks: ChunkVerifiedCallback[] = []
  private completeCallbacks: DownloadCompleteCallback[] = []
  private errorCallbacks: DownloadErrorCallback[] = []

  private state: DownloadState

  constructor(
    modelId: string,
    manifest: ChunkManifest,
    signaling: SignalingClient,
    paymentProvider: PaymentProvider,
    creatorAddress?: string,
    creatorShareBps?: number,
    walletAddress?: string
  ) {
    this.modelId = modelId
    this.manifest = manifest
    this.signaling = signaling
    this.paymentProvider = paymentProvider
    this.creatorAddress = creatorAddress || '0x0000000000000000000000000000000000000000'
    this.creatorShareBps = creatorShareBps ?? 7000
    this.walletAddress = walletAddress || 'anonymous'

    this.state = {
      modelId,
      totalChunks: manifest.chunks.length,
      downloadedChunks: 0,
      currentChunkIndex: 0,
      status: 'idle',
      payments: [],
    }

    this.setupSignalingListeners()
  }

  public get currentState(): DownloadState {
    return { ...this.state }
  }

  public onProgress(cb: DownloadProgressCallback): () => void {
    this.progressCallbacks.push(cb)
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((c) => c !== cb)
    }
  }

  public onChunkVerified(cb: ChunkVerifiedCallback): () => void {
    this.chunkVerifiedCallbacks.push(cb)
    return () => {
      this.chunkVerifiedCallbacks = this.chunkVerifiedCallbacks.filter((c) => c !== cb)
    }
  }

  public onComplete(cb: DownloadCompleteCallback): () => void {
    this.completeCallbacks.push(cb)
    return () => {
      this.completeCallbacks = this.completeCallbacks.filter((c) => c !== cb)
    }
  }

  public onError(cb: DownloadErrorCallback): () => void {
    this.errorCallbacks.push(cb)
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((c) => c !== cb)
    }
  }

  private updateState(updates: Partial<DownloadState>): void {
    this.state = { ...this.state, ...updates }
    for (const cb of this.progressCallbacks) {
      cb(this.state)
    }
  }

  private setupSignalingListeners(): void {
    const unsubAnswer = this.signaling.on('answer', async (from, sdp) => {
      const pc = this.peerConnections.get(from)
      if (pc) {
        await pc.handleRemoteAnswer(sdp)
      }
    })
    this.unsubscribers.push(unsubAnswer)

    const unsubIce = this.signaling.on('iceCandidate', async (from, candidate) => {
      const pc = this.peerConnections.get(from)
      if (pc) {
        await pc.addIceCandidate(candidate)
      }
    })
    this.unsubscribers.push(unsubIce)
  }

  /**
   * Starts sequential chunk download.
   */
  public async start(): Promise<Blob | null> {
    if (this.isRunning) return null
    this.isRunning = true
    this.isCancelled = false

    try {
      // 1. Check existing chunks in IndexedDB (resume capability)
      const heldChunks = await getHeldChunks(this.modelId, this.walletAddress)
      const heldSet = new Set(heldChunks)
      this.updateState({
        downloadedChunks: heldSet.size,
        status: 'discovering',
      })

      if (heldSet.size === this.manifest.chunks.length) {
        // Already fully downloaded
        return await this.reassemble()
      }

      // 2. Query tracker for active seeders
      const seeders = await this.signaling.querySeeders(this.modelId)
      if (seeders.length === 0) {
        throw new Error('No active seeders found for this model in the swarm')
      }

      // 3. Sequentially download missing chunks
      for (let i = 0; i < this.manifest.chunks.length; i++) {
        if (this.isCancelled) {
          this.updateState({ status: 'idle' })
          return null
        }

        if (heldSet.has(i)) {
          continue
        }

        this.updateState({
          currentChunkIndex: i,
          status: 'downloading',
        })

        const seeder = this.findSeederForChunk(seeders, i)
        if (!seeder) {
          throw new Error(`No available seeder currently holds chunk ${i}`)
        }

        await this.downloadChunk(seeder, i)
        heldSet.add(i)
        this.updateState({
          downloadedChunks: heldSet.size,
        })
      }

      // 4. Reassemble file
      return await this.reassemble()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.updateState({ status: 'error', error: error.message })
      for (const cb of this.errorCallbacks) {
        cb(error)
      }
      return null
    } finally {
      this.isRunning = false
    }
  }

  private findSeederForChunk(seeders: SeederRecord[], chunkIndex: number): SeederRecord | undefined {
    return seeders.find((s) => s.chunksHeld.includes(chunkIndex))
  }

  private async getOrCreatePeerConnection(peerId: string): Promise<PeerConnection> {
    const existing = this.peerConnections.get(peerId)
    if (existing && existing.isConnected) {
      return existing
    }

    if (this.peerReadyPromises.has(peerId)) {
      return this.peerReadyPromises.get(peerId)!
    }

    const promise = new Promise<PeerConnection>((resolve, reject) => {
      const pc = new PeerConnection(peerId, this.signaling, true)
      this.peerConnections.set(peerId, pc)

      pc.onReady(() => {
        this.peerReadyPromises.delete(peerId)
        resolve(pc)
      })

      pc.onClose(() => {
        this.peerConnections.delete(peerId)
        this.peerReadyPromises.delete(peerId)
      })

      pc.startOffer().catch(reject)

      // Connection timeout: 15 seconds
      setTimeout(() => {
        if (!pc.isConnected) {
          pc.close()
          this.peerReadyPromises.delete(peerId)
          reject(new Error(`Connection to peer ${peerId} timed out`))
        }
      }, 15000)
    })

    this.peerReadyPromises.set(peerId, promise)
    return promise
  }

  private async downloadChunk(seeder: SeederRecord, chunkIndex: number): Promise<void> {
    const pc = await this.getOrCreatePeerConnection(seeder.peerId)

    return new Promise((resolve, reject) => {
      let isSettled = false

      const cleanup = () => {
        unsubMsg()
        unsubChunk()
      }

      const fail = (err: Error) => {
        if (!isSettled) {
          isSettled = true
          cleanup()
          reject(err)
        }
      }

      const unsubMsg = pc.onMessage(async (msg) => {
        if (msg.type === 'error') {
          fail(new Error(msg.message))
          return
        }

        if (msg.type === 'payment-required' && msg.chunkIndex === chunkIndex) {
          try {
            this.updateState({ status: 'paying' })
            const txHash = await this.paymentProvider.makePayment(
              this.modelId,
              chunkIndex,
              msg.chunkPrice,
              msg.seederAddress
            )

            // Compute atomic split amounts
            let totalPaid = 100000000000000n
            try {
              totalPaid = BigInt(msg.chunkPrice)
            } catch {
              // fallback default
            }
            const creatorAmount = (totalPaid * BigInt(this.creatorShareBps)) / 10000n
            const seederAmount = totalPaid - creatorAmount

            const paymentEvent: PaymentSplitEvent = {
              modelId: this.modelId,
              seeder: msg.seederAddress,
              creator: this.creatorAddress,
              seederAmount,
              creatorAmount,
              totalPaid,
              txHash,
              blockNumber: 0,
            }

            this.updateState({
              status: 'downloading',
              payments: [paymentEvent, ...this.state.payments],
            })

            pc.send({
              type: 'payment-proof',
              txHash,
            })
          } catch (err) {
            fail(err instanceof Error ? err : new Error(String(err)))
          }
        }
      })

      const unsubChunk = pc.onChunk(async (modelId, idx, data) => {
        if (modelId === this.modelId && idx === chunkIndex) {
          try {
            this.updateState({ status: 'verifying' })

            // Verify content hash against manifest
            const expectedHash = this.manifest.chunks[chunkIndex]?.hash
            const hashBuffer = await crypto.subtle.digest('SHA-256', data)
            const computedHash = bufferToHex(hashBuffer)

            if (expectedHash && computedHash.toLowerCase() !== expectedHash.toLowerCase()) {
              throw new Error(
                `Content hash mismatch for chunk ${chunkIndex}! Expected ${expectedHash}, computed ${computedHash}`
              )
            }

            // Save chunk to IndexedDB
            await storeChunk(this.modelId, chunkIndex, data, this.walletAddress)

            for (const cb of this.chunkVerifiedCallbacks) {
              cb(chunkIndex)
            }

            isSettled = true
            cleanup()
            resolve()
          } catch (err) {
            fail(err instanceof Error ? err : new Error(String(err)))
          }
        }
      })

      // Send initial request-chunk
      pc.send({
        type: 'request-chunk',
        modelId: this.modelId,
        chunkIndex,
      })

      // Chunk transfer timeout: 30 seconds
      setTimeout(() => {
        fail(new Error(`Timeout waiting for chunk ${chunkIndex} from peer ${seeder.peerId}`))
      }, 30000)
    })
  }

  private async reassemble(): Promise<Blob> {
    this.updateState({ status: 'reassembling' })
    const allChunks = await getAllChunks(this.modelId, this.manifest.chunks.length, this.walletAddress)
    const blob = new Blob(allChunks, { type: 'application/octet-stream' })

    this.updateState({
      status: 'complete',
      downloadedChunks: this.manifest.chunks.length,
    })

    for (const cb of this.completeCallbacks) {
      cb(blob)
    }

    return blob
  }

  public cancel(): void {
    this.isCancelled = true
    this.isRunning = false
    this.cleanup()
    this.updateState({ status: 'idle' })
  }

  public cleanup(): void {
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers = []

    for (const pc of this.peerConnections.values()) {
      pc.close()
    }
    this.peerConnections.clear()
    this.peerReadyPromises.clear()
  }
}

/**
 * Triggers a browser file download for a reassembled Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
