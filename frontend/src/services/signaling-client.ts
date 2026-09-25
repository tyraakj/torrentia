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
  registered: () => void
}

export function normalizeSignalingUrl(rawUrl: string): string {
  let url = rawUrl.trim()
  if (!url) return url
  if (url.startsWith('https://')) {
    url = 'wss://' + url.slice('https://'.length)
  } else if (url.startsWith('http://')) {
    url = 'ws://' + url.slice('http://'.length)
  }
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:'
    url = (isHttps ? 'wss://' : 'ws://') + url
  }
  url = url.replace(/\/+$/, '')
  if (!url.endsWith('/ws')) {
    url = `${url}/ws`
  }
  return url
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

  private listeners: {
    offer: Set<EventMap['offer']>
    answer: Set<EventMap['answer']>
    iceCandidate: Set<EventMap['iceCandidate']>
    status: Set<EventMap['status']>
    error: Set<EventMap['error']>
    registered: Set<EventMap['registered']>
  } = {
    offer: new Set(),
    answer: new Set(),
    iceCandidate: new Set(),
    status: new Set(),
    error: new Set(),
    registered: new Set(),
  }

  constructor(url?: string, address?: string) {
    this.peerId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `peer-${Math.random().toString(36).substring(2, 11)}`
    this.address = address || '0x0000000000000000000000000000000000000000'
    const rawUrl =
      url ||
      (import.meta.env.VITE_SIGNALING_URL as string) ||
      (import.meta.env.PROD
        ? 'wss://torrentia-signaling.onrender.com/ws'
        : 'ws://localhost:8081/ws')
    this.url = normalizeSignalingUrl(rawUrl)
  }

  public get currentStatus(): SignalingStatus {
    return this.status
  }

  public get isConnected(): boolean {
    return this.status === 'connected'
  }

  public on<K extends keyof EventMap>(event: K, handler: EventMap[K]): () => void {
    switch (event) {
      case 'offer': {
        const fn = handler as EventMap['offer']
        this.listeners.offer.add(fn)
        return () => { this.listeners.offer.delete(fn) }
      }
      case 'answer': {
        const fn = handler as EventMap['answer']
        this.listeners.answer.add(fn)
        return () => { this.listeners.answer.delete(fn) }
      }
      case 'iceCandidate': {
        const fn = handler as EventMap['iceCandidate']
        this.listeners.iceCandidate.add(fn)
        return () => { this.listeners.iceCandidate.delete(fn) }
      }
      case 'status': {
        const fn = handler as EventMap['status']
        this.listeners.status.add(fn)
        return () => { this.listeners.status.delete(fn) }
      }
      case 'error': {
        const fn = handler as EventMap['error']
        this.listeners.error.add(fn)
        return () => { this.listeners.error.delete(fn) }
      }
      case 'registered': {
        const fn = handler as EventMap['registered']
        this.listeners.registered.add(fn)
        return () => { this.listeners.registered.delete(fn) }
      }
      default:
        return () => {}
    }
  }

  private emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    switch (event) {
      case 'offer':
        for (const fn of this.listeners.offer) {
          const [from, sdp] = args as Parameters<EventMap['offer']>
          fn(from, sdp)
        }
        break
      case 'answer':
        for (const fn of this.listeners.answer) {
          const [from, sdp] = args as Parameters<EventMap['answer']>
          fn(from, sdp)
        }
        break
      case 'iceCandidate':
        for (const fn of this.listeners.iceCandidate) {
          const [from, candidate] = args as Parameters<EventMap['iceCandidate']>
          fn(from, candidate)
        }
        break
      case 'status':
        for (const fn of this.listeners.status) {
          const [st] = args as Parameters<EventMap['status']>
          fn(st)
        }
        break
      case 'error':
        for (const fn of this.listeners.error) {
          const [err] = args as Parameters<EventMap['error']>
          fn(err)
        }
        break
      case 'registered':
        for (const fn of this.listeners.registered) {
          fn()
        }
        break
      default:
        break
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
      address: this.address,
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
          // Server has acknowledged our registration — notify subscribers so
          // seeders can re-announce their chunks (covers wallet switch + reconnect).
          this.emit('registered')
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
