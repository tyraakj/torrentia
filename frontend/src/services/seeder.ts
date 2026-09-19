/**
 * Seeding service for serving model chunks to WebRTC peers.
 * Announces chunk availability to the tracker, responds to request-chunk
 * with 402 payment-required, validates payment proofs via the chain verifier,
 * and streams chunk data with backpressure.
 */

import { getChunk, getHeldChunks } from './chunk-store'
import { PeerConnection } from './peer-connection'
import type { SignalingClient } from './signaling-client'

export interface PaymentVerifier {
  verifyPayment(
    modelId: string,
    chunkIndex: number,
    txHash: string,
    chunkPrice: string,
    seederAddress: string
  ): Promise<boolean>
}

export class Seeder {
  public readonly modelId: string
  public readonly seederAddress: string
  public readonly chunkPrice: string
  private signaling: SignalingClient
  private verifier: PaymentVerifier

  private peerConnections = new Map<string, PeerConnection>()
  private pendingChunkRequests = new Map<string, { chunkIndex: number; data: ArrayBuffer }>()
  private isSeedingActive = false
  private unsubscribers: (() => void)[] = []

  constructor(
    modelId: string,
    signaling: SignalingClient,
    seederAddress: string,
    chunkPrice = '100000000000000', // Default 0.0001 MON in wei
    verifier: PaymentVerifier
  ) {
    this.modelId = modelId
    this.signaling = signaling
    this.seederAddress = seederAddress
    this.chunkPrice = chunkPrice
    this.verifier = verifier
  }

  public get isActive(): boolean {
    return this.isSeedingActive
  }

  public get activePeers(): number {
    return this.peerConnections.size
  }

  public async startSeeding(): Promise<void> {
    if (this.isSeedingActive) return
    this.isSeedingActive = true

    // 1. Announce initial chunks held in IndexedDB
    await this.reannounce()

    // 2. Listen for incoming WebRTC offers targeted to this seeder
    const unsubOffer = this.signaling.on('offer', async (from, sdp) => {
      await this.handleIncomingOffer(from, sdp)
    })
    this.unsubscribers.push(unsubOffer)

    // 3. Listen for ICE candidates
    const unsubIce = this.signaling.on('iceCandidate', async (from, candidate) => {
      const pc = this.peerConnections.get(from)
      if (pc) {
        await pc.addIceCandidate(candidate)
      }
    })
    this.unsubscribers.push(unsubIce)
  }

  public async reannounce(): Promise<number[]> {
    const held = await getHeldChunks(this.modelId)
    this.signaling.announceChunks(this.modelId, held)
    return held
  }

  private async handleIncomingOffer(fromPeerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    let pc = this.peerConnections.get(fromPeerId)
    if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      pc = new PeerConnection(fromPeerId, this.signaling, false)
      this.peerConnections.set(fromPeerId, pc)
      this.attachPeerEvents(fromPeerId, pc)
    }

    await pc.handleRemoteOffer(sdp)
  }

  private attachPeerEvents(fromPeerId: string, pc: PeerConnection): void {
    pc.onClose(() => {
      this.peerConnections.delete(fromPeerId)
      this.pendingChunkRequests.delete(fromPeerId)
    })

    pc.onMessage(async (msg) => {
      switch (msg.type) {
        case 'request-chunk': {
          if (msg.modelId !== this.modelId) {
            pc.send({
              type: 'error',
              message: `Model ID mismatch: expected ${this.modelId}, got ${msg.modelId}`,
            })
            return
          }

          const chunkData = await getChunk(this.modelId, msg.chunkIndex)
          if (!chunkData) {
            pc.send({
              type: 'error',
              message: `Chunk index ${msg.chunkIndex} not found in seeder storage`,
            })
            return
          }

          // Cache pending request awaiting payment proof
          this.pendingChunkRequests.set(fromPeerId, {
            chunkIndex: msg.chunkIndex,
            data: chunkData,
          })

          // Respond with 402 Payment Required
          pc.send({
            type: 'payment-required',
            modelId: this.modelId,
            chunkIndex: msg.chunkIndex,
            chunkPrice: this.chunkPrice,
            seederAddress: this.seederAddress,
          })
          break
        }

        case 'payment-proof': {
          const pending = this.pendingChunkRequests.get(fromPeerId)
          if (!pending) {
            pc.send({
              type: 'error',
              message: 'No pending chunk request awaiting payment proof',
            })
            return
          }

          const isValid = await this.verifier.verifyPayment(
            this.modelId,
            pending.chunkIndex,
            msg.txHash,
            this.chunkPrice,
            this.seederAddress
          )

          if (!isValid) {
            pc.send({
              type: 'error',
              message: 'Payment verification failed',
            })
            return
          }

          // Payment verified: stream chunk with backpressure
          this.pendingChunkRequests.delete(fromPeerId)
          try {
            await pc.streamChunk(this.modelId, pending.chunkIndex, pending.data)
          } catch (err) {
            pc.send({
              type: 'error',
              message: `Failed to stream chunk: ${err instanceof Error ? err.message : String(err)}`,
            })
          }
          break
        }

        default:
          break
      }
    })
  }

  public stopSeeding(): void {
    this.isSeedingActive = false
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers = []

    for (const pc of this.peerConnections.values()) {
      pc.close()
    }
    this.peerConnections.clear()
    this.pendingChunkRequests.clear()
  }
}
