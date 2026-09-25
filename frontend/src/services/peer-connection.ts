/**
 * WebRTC Peer Connection and Data Channel manager.
 * Handles ICE exchange, connection lifecycle, framed data channel messages,
 * 16 KB binary slice streaming, and bufferedAmount backpressure.
 */

import type { SignalingClient } from './signaling-client'

export const SLICE_SIZE = 16 * 1024 // 16 KB cross-browser safe MTU size
export const BUFFER_HIGH_WATERMARK = 1024 * 1024 // 1 MB
export const BUFFER_LOW_WATERMARK = 256 * 1024 // 256 KB

export type PeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'

export interface RequestChunkMessage {
  type: 'request-chunk'
  modelId: string
  chunkIndex: number
}

export interface PaymentRequiredMessage {
  type: 'payment-required'
  modelId: string
  chunkIndex: number
  chunkPrice: string
  seederAddress: string
}

export interface PaymentProofMessage {
  type: 'payment-proof'
  txHash: string
}

export interface ChunkMetaMessage {
  type: 'chunk-data'
  modelId: string
  chunkIndex: number
  totalSize: number
  totalSlices: number
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type DataChannelMessage =
  | RequestChunkMessage
  | PaymentRequiredMessage
  | PaymentProofMessage
  | ChunkMetaMessage
  | ErrorMessage

export type PeerMessageCallback = (msg: DataChannelMessage) => void
export type ChunkReceivedCallback = (modelId: string, chunkIndex: number, data: ArrayBuffer) => void

export class PeerConnection {
  public readonly remotePeerId: string
  public readonly isInitiator: boolean
  private signaling: SignalingClient
  private pc: RTCPeerConnection
  private dc: RTCDataChannel | null = null

  private pendingCandidates: RTCIceCandidateInit[] = []
  private isRemoteDescriptionSet = false

  // Callbacks
  private onMessageCallbacks: PeerMessageCallback[] = []
  private onChunkCallbacks: ChunkReceivedCallback[] = []
  private onReadyCallbacks: (() => void)[] = []
  private onCloseCallbacks: (() => void)[] = []

  // Binary chunk reassembly state
  private activeChunkMeta: ChunkMetaMessage | null = null
  private incomingSlices: Uint8Array[] = []
  private incomingBytesReceived = 0

  constructor(remotePeerId: string, signaling: SignalingClient, isInitiator: boolean) {
    this.remotePeerId = remotePeerId
    this.signaling = signaling
    this.isInitiator = isInitiator

    const rtcConfig: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    }

    const turnUrl = String(import.meta.env.VITE_TURN_URL || '').trim()
    const turnUsername = String(import.meta.env.VITE_TURN_USERNAME || '').trim()
    const turnCredential = String(import.meta.env.VITE_TURN_CREDENTIAL || '').trim()
    if (turnUrl && turnUsername && turnCredential) {
      rtcConfig.iceServers?.push({
        urls: turnUrl.split(',').map((url) => url.trim()),
        username: turnUsername,
        credential: turnCredential,
      })
    }

    this.pc = new RTCPeerConnection(rtcConfig)
    this.setupPeerConnectionEvents()

    if (this.isInitiator) {
      const channel = this.pc.createDataChannel('chunks', { ordered: true })
      this.setupDataChannel(channel)
    } else {
      this.pc.ondatachannel = (event) => {
        if (event.channel.label === 'chunks') {
          this.setupDataChannel(event.channel)
        }
      }
    }
  }

  public get connectionState(): PeerConnectionState {
    return this.pc.connectionState as PeerConnectionState
  }

  public get isConnected(): boolean {
    return this.dc?.readyState === 'open'
  }

  public onMessage(cb: PeerMessageCallback): () => void {
    this.onMessageCallbacks.push(cb)
    return () => {
      this.onMessageCallbacks = this.onMessageCallbacks.filter((c) => c !== cb)
    }
  }

  public onChunk(cb: ChunkReceivedCallback): () => void {
    this.onChunkCallbacks.push(cb)
    return () => {
      this.onChunkCallbacks = this.onChunkCallbacks.filter((c) => c !== cb)
    }
  }

  public onReady(cb: () => void): () => void {
    if (this.isConnected) {
      cb()
    }
    this.onReadyCallbacks.push(cb)
    return () => {
      this.onReadyCallbacks = this.onReadyCallbacks.filter((c) => c !== cb)
    }
  }

  public onClose(cb: () => void): () => void {
    this.onCloseCallbacks.push(cb)
    return () => {
      this.onCloseCallbacks = this.onCloseCallbacks.filter((c) => c !== cb)
    }
  }

  private setupPeerConnectionEvents(): void {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendIceCandidate(this.remotePeerId, event.candidate.toJSON())
      }
    }

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'failed' || this.pc.iceConnectionState === 'disconnected') {
        this.close()
      }
    }

    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'closed' || this.pc.connectionState === 'failed') {
        this.close()
      }
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dc = channel
    this.dc.binaryType = 'arraybuffer'
    this.dc.bufferedAmountLowThreshold = BUFFER_LOW_WATERMARK

    this.dc.onopen = () => {
      for (const cb of this.onReadyCallbacks) {
        cb()
      }
    }

    this.dc.onclose = () => {
      for (const cb of this.onCloseCallbacks) {
        cb()
      }
    }

    this.dc.onerror = () => {
      this.close()
    }

    this.dc.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data) as DataChannelMessage
          if (msg.type === 'chunk-data') {
            // Prepare binary reassembly
            this.activeChunkMeta = msg
            this.incomingSlices = []
            this.incomingBytesReceived = 0
          }
          for (const cb of this.onMessageCallbacks) {
            cb(msg)
          }
        } catch {
          // Ignore invalid text payload
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.handleBinaryData(event.data)
      }
    }
  }

  private handleBinaryData(buffer: ArrayBuffer): void {
    if (!this.activeChunkMeta) {
      return
    }

    const slice = new Uint8Array(buffer)
    this.incomingSlices.push(slice)
    this.incomingBytesReceived += slice.byteLength

    if (this.incomingBytesReceived >= this.activeChunkMeta.totalSize) {
      // Reassemble complete ArrayBuffer
      const completeBuffer = new Uint8Array(this.activeChunkMeta.totalSize)
      let offset = 0
      for (const s of this.incomingSlices) {
        completeBuffer.set(s, offset)
        offset += s.byteLength
      }

      const meta = this.activeChunkMeta
      this.activeChunkMeta = null
      this.incomingSlices = []
      this.incomingBytesReceived = 0

      for (const cb of this.onChunkCallbacks) {
        cb(meta.modelId, meta.chunkIndex, completeBuffer.buffer)
      }
    }
  }

  public async startOffer(): Promise<void> {
    if (!this.isInitiator) return
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    this.signaling.sendOffer(this.remotePeerId, offer)
  }

  public async handleRemoteOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
    this.isRemoteDescriptionSet = true
    await this.processPendingCandidates()

    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.signaling.sendAnswer(this.remotePeerId, answer)
  }

  public async handleRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer))
    this.isRemoteDescriptionSet = true
    await this.processPendingCandidates()
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.isRemoteDescriptionSet) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        // Ignore candidate addition errors on closed/late peers
      }
    } else {
      this.pendingCandidates.push(candidate)
    }
  }

  private async processPendingCandidates(): Promise<void> {
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift()
      if (candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch {
          // Ignore candidate addition errors
        }
      }
    }
  }

  public send(msg: DataChannelMessage): void {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(msg))
    }
  }

  /**
   * Streams a binary chunk array buffer over the data channel in 16 KB slices,
   * applying backpressure whenever bufferedAmount exceeds 1 MB.
   */
  public async streamChunk(modelId: string, chunkIndex: number, data: ArrayBuffer): Promise<void> {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not open')
    }

    const totalSize = data.byteLength
    const totalSlices = Math.ceil(totalSize / SLICE_SIZE)

    // 1. Send chunk metadata
    const meta: ChunkMetaMessage = {
      type: 'chunk-data',
      modelId,
      chunkIndex,
      totalSize,
      totalSlices,
    }
    this.send(meta)

    // 2. Stream slices with backpressure
    const uint8 = new Uint8Array(data)
    for (let offset = 0; offset < totalSize; offset += SLICE_SIZE) {
      if (this.dc.readyState !== 'open') {
        throw new Error('Data channel closed during transfer')
      }

      // Check backpressure
      if (this.dc.bufferedAmount > BUFFER_HIGH_WATERMARK) {
        await this.waitForBufferLow()
      }

      const sliceEnd = Math.min(offset + SLICE_SIZE, totalSize)
      const slice = uint8.subarray(offset, sliceEnd)
      this.dc.send(slice)
    }
  }

  private waitForBufferLow(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.dc || this.dc.bufferedAmount <= BUFFER_LOW_WATERMARK) {
        resolve()
        return
      }

      const onLow = () => {
        this.dc?.removeEventListener('bufferedamountlow', onLow)
        resolve()
      }
      this.dc.addEventListener('bufferedamountlow', onLow)
    })
  }

  public close(): void {
    if (this.dc) {
      try {
        this.dc.close()
      } catch {
        // Safe ignore
      }
      this.dc = null
    }
    try {
      this.pc.close()
    } catch {
      // Safe ignore
    }
    for (const cb of this.onCloseCallbacks) {
      cb()
    }
  }
}
