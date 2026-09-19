/**
 * WebSocket client for the Go Signaling Server and Seeder Tracker.
 * Implements peer registration, WebRTC SDP/ICE relay, chunk announcements,
 * seeder querying, 30s heartbeat interval, and exponential backoff reconnection.
 */

import type { SeederRecord } from '../lib/types'

export type SignalingStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SignalingOfferMessage {
  type: 'offer'
  from: string
  to: string
  payload: RTCSessionDescriptionInit
}

export interface SignalingAnswerMessage {
  type: 'answer'
  from: string
  to: string
  payload: RTCSessionDescriptionInit
}

export interface SignalingIceCandidateMessage {
  type: 'ice-candidate'
  from: string
  to: string
  payload: RTCIceCandidateInit
}

export interface SignalingErrorMessage {
  type: 'error'
  message: string
}

export interface SignalingSeedersResponse {
  type: 'seeders'
  modelId: string
  seeders: Array<{
    peerId: string
    address: string
    chunksHeld: number[]
  }>
}

type EventMap = {
  offer: (from: string, sdp: RTCSessionDescriptionInit) => void
  answer: (from: string, sdp: RTCSessionDescriptionInit) => void
  iceCandidate: (from: string, candidate: RTCIceCandidateInit) => void
  status: (status: SignalingStatus) => void
  error: (err: string) => void
}

export class SignalingClient {
  public readonly peerId: string
  public address: string
  private url: string
  private ws: WebSocket | null = null
  private status: SignalingStatus = 'disconnected'
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectDelay = 30000
  private isExplicitlyClosed = false
  private pendingQueries = new Map<string, (seeders: SeederRecord[]) => void>()

  private listeners: { [K in keyof EventMap]?: Set<EventMap[K]> } = {}

  constructor(url?: string, address?: string) {
    this.peerId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `peer-${Math.random().toString(36).substring(2, 11)}`
    this.address = address || '0x0000000000000000000000000000000000000000'
    this.url =
      url ||
      (import.meta.env.VITE_SIGNALING_URL as string) ||
      (import.meta.env.PROD
        ? 'wss://torrentia-signaling.onrender.com/ws'
        : 'ws://localhost:8081/ws')
  }

  public get currentStatus(): SignalingStatus {
    return this.status
  }

  public get isConnected(): boolean {
    return this.status === 'connected'
  }

  public on<K extends keyof EventMap>(event: K, handler: EventMap[K]): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any
    }
    this.listeners[event]!.add(handler as any)
    return () => {
      this.listeners[event]?.delete(handler as any)
    }
  }

  private emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    const handlers = this.listeners[event]
    if (handlers) {
      for (const fn of handlers) {
        ;(fn as any)(...args)
      }
    }
  }

  private setStatus(newStatus: SignalingStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus
      this.emit('status', newStatus)
    }
  }

  public setAddress(addr: string): void {
    this.address = addr
    if (this.status === 'connected') {
      this.sendRegister()
    }
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.isExplicitlyClosed = false
    this.setStatus('connecting')

    try {
      this.ws = new WebSocket(this.url)
    } catch (err) {
      this.setStatus('error')
      this.emit('error', err instanceof Error ? err.message : String(err))
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('connected')
      this.sendRegister()
      this.startHeartbeat()
    }

    this.ws.onmessage = (event: MessageEvent<string>) => {
      this.handleIncomingMessage(event.data)
    }

    this.ws.onerror = (e) => {
      this.emit('error', `WebSocket error: ${JSON.stringify(e)}`)
    }

    this.ws.onclose = () => {
      this.cleanupSocket()
      this.setStatus('disconnected')
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect()
      }
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.cleanupSocket()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  private cleanupSocket(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || this.reconnectTimer) return

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private sendRegister(): void {
    this.sendRaw({
      type: 'register',
      peerId: this.peerId,
      address: this.address,
    })
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, 30000) // 30 seconds interval, well within the 60s server eviction timeout
  }

  public sendHeartbeat(): void {
    this.sendRaw({ type: 'heartbeat' })
  }

  public sendOffer(to: string, sdp: RTCSessionDescriptionInit): void {
    this.sendRaw({
      type: 'offer',
      to,
      payload: sdp,
    })
  }

  public sendAnswer(to: string, sdp: RTCSessionDescriptionInit): void {
    this.sendRaw({
      type: 'answer',
      to,
      payload: sdp,
    })
  }

  public sendIceCandidate(to: string, candidate: RTCIceCandidateInit): void {
    this.sendRaw({
      type: 'ice-candidate',
      to,
      payload: candidate,
    })
  }

  public announceChunks(modelId: string, chunksHeld: number[]): void {
    this.sendRaw({
      type: 'announce',
      modelId,
      chunksHeld,
    })
  }

  public querySeeders(modelId: string): Promise<SeederRecord[]> {
    return new Promise((resolve) => {
      this.pendingQueries.set(modelId, resolve)
      this.sendRaw({
        type: 'query',
        modelId,
      })

      // Timeout safety: if no response in 5s, return empty array
      setTimeout(() => {
        if (this.pendingQueries.has(modelId)) {
          this.pendingQueries.delete(modelId)
          resolve([])
        }
      }, 5000)
    })
  }

  private sendRaw(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private handleIncomingMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw)
      switch (msg.type) {
        case 'registered':
          break

        case 'announced':
          break

        case 'seeders': {
          const resp = msg as SignalingSeedersResponse
          const resolver = this.pendingQueries.get(resp.modelId)
          if (resolver) {
            this.pendingQueries.delete(resp.modelId)
            const mapped: SeederRecord[] = (resp.seeders || []).map((s) => ({
              modelId: resp.modelId,
              seederAddress: s.address,
              peerId: s.peerId,
              chunksHeld: s.chunksHeld,
              lastHeartbeat: Date.now(),
            }))
            resolver(mapped)
          }
          break
        }

        case 'offer': {
          const offer = msg as SignalingOfferMessage
          this.emit('offer', offer.from, offer.payload)
          break
        }

        case 'answer': {
          const answer = msg as SignalingAnswerMessage
          this.emit('answer', answer.from, answer.payload)
          break
        }

        case 'ice-candidate': {
          const ice = msg as SignalingIceCandidateMessage
          this.emit('iceCandidate', ice.from, ice.payload)
          break
        }

        case 'error': {
          const err = msg as SignalingErrorMessage
          this.emit('error', err.message)
          break
        }

        default:
          break
      }
    } catch {
      // Ignore unparseable frames
    }
  }
}
