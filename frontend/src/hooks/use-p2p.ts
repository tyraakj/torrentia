/**
 * React hooks for WebRTC P2P networking in Torrentia.
 * Exposes useSignaling, useSeeding, and useDownload hooks with reactive state
 * and automatic lifecycle cleanup using useSyncExternalStore.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import type { ChunkManifest, DownloadState } from '../lib/types'
import { Downloader, downloadBlob, type PaymentProvider } from '../services/downloader'
import { getHeldChunks } from '../services/chunk-store'
import { Seeder, type PaymentVerifier } from '../services/seeder'
import { SignalingClient, type SignalingStatus } from '../services/signaling-client'
import { createOnChainPaymentProvider, createOnChainPaymentVerifier } from '../services/payment'

// Module-level singleton signaling client instance to avoid multiple socket connections
let globalSignalingClient: SignalingClient | null = null

// Module-level active seeder registry: modelId -> Seeder
// Keeps seeders alive across page navigation so chunk announces survive unmount.
const globalActiveSeedersByModel = new Map<string, Seeder>()
let globalSignalingRegisteredUnsub: (() => void) | null = null

function ensureGlobalRegisteredListener(): void {
  if (globalSignalingRegisteredUnsub) return
  const client = getGlobalSignalingClient()
  globalSignalingRegisteredUnsub = client.on('registered', () => {
    for (const seeder of globalActiveSeedersByModel.values()) {
      void seeder.reannounce().catch(() => {})
    }
  })
}

export function getGlobalSignalingClient(address?: string): SignalingClient {
  if (!globalSignalingClient) {
    globalSignalingClient = new SignalingClient(undefined, address)
  } else if (address && globalSignalingClient.address !== address) {
    globalSignalingClient.setAddress(address)
  }
  return globalSignalingClient
}

/**
 * Hook to manage SignalingClient connection and connection status using useSyncExternalStore.
 */
export function useSignaling(address?: string) {
  const client = getGlobalSignalingClient(address)
  const { data: walletClient } = useWalletClient({ chainId: 10143 })

  useEffect(() => {
    let cancelled = false

    const connect = async () => {
      if (address && walletClient) {
        try {
          await client.authenticate(address, async (message) => {
            return walletClient.signMessage({ message })
          })
          if (!cancelled) client.connect()
        } catch (error) {
          if (!cancelled) {
            client.disconnect()
            console.warn('Signaling authentication failed:', error)
          }
        }
      } else if (!address && !import.meta.env.PROD) {
        // Local development can run with AUTH_REQUIRED=false. In production,
        // wait for the wallet-backed session instead of opening an anonymous
        // socket that can race the authenticated shared client.
        client.setAddress('0x0000000000000000000000000000000000000000')
        client.connect()
      }
    }

    void connect()
    return () => {
      cancelled = true
    }
  }, [client, address, walletClient])

  const status = useSyncExternalStore<SignalingStatus>(
    (onStoreChange) => client.on('status', onStoreChange),
    () => client.currentStatus
  )

  const connect = useCallback(() => {
    client.connect()
  }, [client])

  const disconnect = useCallback(() => {
    client.disconnect()
  }, [client])

  return {
    client,
    status,
    peerId: client.peerId,
    connect,
    disconnect,
  }
}

/**
 * Hook to manage Seeder lifecycle for a specific model.
 */
export function useSeeding(
  modelId?: string,
  seederAddress?: string,
  chunkPrice?: string,
  verifier?: PaymentVerifier
) {
  const { client, status: signalingStatus } = useSignaling(seederAddress)
  const publicClient = usePublicClient({ chainId: 10143 })
  const onChainVerifier = useMemo(
    () => (publicClient ? createOnChainPaymentVerifier(publicClient) : undefined),
    [publicClient],
  )
  const [isSeeding, setIsSeeding] = useState(false)
  const [heldChunks, setHeldChunks] = useState<number[]>([])
  const [activePeers, setActivePeers] = useState(0)
  const seederRef = useRef<Seeder | null>(null)

  // Refresh held chunks on model change
  const refreshHeldChunks = useCallback(async () => {
    if (!modelId) {
      setHeldChunks([])
      return []
    }
    const held = await getHeldChunks(modelId, seederAddress)
    setHeldChunks(held)
    return held
  }, [modelId, seederAddress])

  useEffect(() => {
    let isMounted = true
    if (modelId) {
      void getHeldChunks(modelId, seederAddress).then((held) => {
        if (isMounted) {
          setHeldChunks(held)
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [modelId, seederAddress])

  const startSeeding = useCallback(async () => {
    if (!modelId || !seederAddress || isSeeding) return

    const effectiveVerifier = verifier || onChainVerifier
    if (!effectiveVerifier) {
      throw new Error('On-chain payment verification is unavailable')
    }

    // Re-use existing global seeder for this model if already active
    const existingGlobal = globalActiveSeedersByModel.get(modelId)
    if (existingGlobal) {
      seederRef.current = existingGlobal
      setIsSeeding(true)
      const held = await refreshHeldChunks()
      setActivePeers(existingGlobal.activePeers)
      return held
    }

    const seeder = new Seeder(modelId, client, seederAddress, chunkPrice, effectiveVerifier)
    seederRef.current = seeder

    await seeder.startSeeding()

    // Register in global map so announces survive page navigation
    globalActiveSeedersByModel.set(modelId, seeder)
    ensureGlobalRegisteredListener()

    setIsSeeding(true)
    const held = await refreshHeldChunks()
    setActivePeers(seeder.activePeers)
    return held
  }, [modelId, seederAddress, isSeeding, client, chunkPrice, verifier, onChainVerifier, refreshHeldChunks])

  const stopSeeding = useCallback(() => {
    if (seederRef.current) {
      seederRef.current.stopSeeding()
      seederRef.current = null
    }
    if (modelId) {
      globalActiveSeedersByModel.delete(modelId)
    }
    setIsSeeding(false)
    setActivePeers(0)
  }, [modelId])

  // Sync local isSeeding state with global registry on mount
  // (e.g. when navigating back to a model page whose seeder is still active globally)
  useEffect(() => {
    if (modelId && globalActiveSeedersByModel.has(modelId)) {
      const globalSeeder = globalActiveSeedersByModel.get(modelId)!
      seederRef.current = globalSeeder
      setIsSeeding(true)
    }
  }, [modelId])

  // On unmount: do NOT stop the seeder — it survives in globalActiveSeedersByModel.
  // Only clear the local ref so we don't double-stop on remount.
  useEffect(() => {
    return () => {
      seederRef.current = null
    }
  }, [])

  return {
    isSeeding,
    activePeers,
    heldChunks,
    signalingStatus,
    startSeeding,
    stopSeeding,
    refreshHeldChunks,
  }
}

function createInitialDownloadState(modelId?: string, manifest?: ChunkManifest): DownloadState {
  return {
    modelId: modelId || '',
    totalChunks: manifest?.chunks.length || 0,
    downloadedChunks: 0,
    currentChunkIndex: 0,
    status: 'idle',
    payments: [],
  }
}

/**
 * Hook to manage Downloader lifecycle for a specific model.
 */
export function useDownload(
  modelId?: string,
  manifest?: ChunkManifest,
  paymentProvider?: PaymentProvider,
  creatorAddress?: string,
  creatorShareBps?: number
) {
  const { address } = useAccount()
  const { client } = useSignaling(address)
  const publicClient = usePublicClient({ chainId: 10143 })
  const { data: walletClient } = useWalletClient({ chainId: 10143 })
  const onChainPaymentProvider = useMemo(
    () => (walletClient && publicClient ? createOnChainPaymentProvider(walletClient, publicClient) : undefined),
    [walletClient, publicClient],
  )
  const [downloadState, setDownloadState] = useState<DownloadState>(() =>
    createInitialDownloadState(modelId, manifest)
  )
  const [downloadedBlob, setDownloadedBlob] = useState<Blob | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const downloaderRef = useRef<Downloader | null>(null)

  const startDownload = useCallback(async (): Promise<Blob | null> => {
    if (!modelId || !manifest || isDownloading) return null

    setIsDownloading(true)
    setDownloadedBlob(null)
    setDownloadState(createInitialDownloadState(modelId, manifest))

    const effectivePaymentProvider = paymentProvider || onChainPaymentProvider
    if (!effectivePaymentProvider) {
      const error = 'Connect a Monad wallet before starting a paid download'
      setDownloadState((current) => ({ ...current, status: 'error', error }))
      setIsDownloading(false)
      return null
    }

    const downloader = new Downloader(
      modelId,
      manifest,
      client,
      effectivePaymentProvider,
      creatorAddress,
      creatorShareBps,
      address
    )
    downloaderRef.current = downloader

    downloader.onProgress((state) => {
      setDownloadState(state)
    })

    downloader.onComplete((blob) => {
      setDownloadedBlob(blob)
      setIsDownloading(false)
    })

    downloader.onError(() => {
      setIsDownloading(false)
    })

    const result = await downloader.start()
    setIsDownloading(false)
    return result
  }, [modelId, manifest, isDownloading, client, paymentProvider, onChainPaymentProvider, creatorAddress, creatorShareBps, address])

  const cancelDownload = useCallback(() => {
    if (downloaderRef.current) {
      downloaderRef.current.cancel()
      downloaderRef.current = null
    }
    setIsDownloading(false)
  }, [])

  const saveFile = useCallback(
    (filename?: string) => {
      if (downloadedBlob) {
        const name = filename || manifest?.modelName || 'model.bin'
        downloadBlob(downloadedBlob, name)
      }
    },
    [downloadedBlob, manifest]
  )

  useEffect(() => {
    return () => {
      if (downloaderRef.current) {
        downloaderRef.current.cleanup()
      }
    }
  }, [])

  return {
    downloadState,
    downloadedBlob,
    isDownloading,
    startDownload,
    cancelDownload,
    saveFile,
  }
}
