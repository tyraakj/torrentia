import { ChunkManifest } from '../lib/types'
import { computeManifestHash, buildUploadIntent, submitToUploadBroker } from './broker-client'
import { allowMockFallbacks } from '../lib/app-mode'

const IPFS_TIMEOUT_MS = 30000

// In-memory / local storage cache for instant offline & demo retrieval
const localManifestCache = new Map<string, ChunkManifest>()

/**
 * Pins a ChunkManifest JSON to IPFS via the Go Upload Broker microservice.
 * Eliminates client-side IPFS secrets while enforcing cryptographic provenance.
 */
export async function pinManifest(
  manifest: ChunkManifest,
  signerParams?: {
    creator: `0x${string}`
    signature: `0x${string}`
  }
): Promise<string> {
  const rawJSON = JSON.stringify(manifest)

  if (signerParams) {
    try {
      const manifestHash = await computeManifestHash(rawJSON)
      const intent = buildUploadIntent({
        creator: signerParams.creator,
        modelId: manifest.modelId as `0x${string}`,
        totalSize: manifest.totalSize,
        chunkCount: manifest.chunks.length,
        manifestHash,
      })

      const result = await submitToUploadBroker(intent, signerParams.signature, manifest)
      localManifestCache.set(result.cid, manifest)
      try {
        localStorage.setItem(`ipfs_${result.cid}`, rawJSON)
      } catch {
        // ignore
      }
      return result.cid
    } catch (err) {
      if (!allowMockFallbacks()) {
        throw new Error(
          `Failed to pin model passport to IPFS via upload broker: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
      console.warn('Broker manifest pinning error, falling back to local demo storage:', err)
      const fallbackCid = `bafkreifallback${manifest.modelId.replace('0x', '').slice(0, 32)}`
      localManifestCache.set(fallbackCid, manifest)
      try {
        localStorage.setItem(`ipfs_${fallbackCid}`, rawJSON)
      } catch {
        // ignore
      }
      return fallbackCid
    }
  }

  // Offline / demo fallback CID if no signature provided
  const localCid = `bafyreib${manifest.modelId.replace('0x', '').slice(0, 32)}demo`
  localManifestCache.set(localCid, manifest)
  try {
    localStorage.setItem(`ipfs_${localCid}`, rawJSON)
  } catch {
    // ignore
  }
  return localCid
}

/**
 * Fetches a ChunkManifest from IPFS with 30s timeout and single retry.
 */
export async function fetchManifest(cid: string): Promise<ChunkManifest> {
  // 1. Check in-memory cache
  if (localManifestCache.has(cid)) {
    return localManifestCache.get(cid)!
  }

  // 2. Check localStorage
  const cachedJson = localStorage.getItem(`ipfs_${cid}`)
  if (cachedJson) {
    try {
      const manifest = JSON.parse(cachedJson) as ChunkManifest
      localManifestCache.set(cid, manifest)
      return manifest
    } catch {
      // invalid JSON, continue to network
    }
  }

  // 3. Network fetch with 30s timeout and 1 retry
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ]

  let lastError: unknown

  for (const gatewayUrl of gateways) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS)

        const response = await fetch(gatewayUrl, {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const manifest = (await response.json()) as ChunkManifest
          localManifestCache.set(cid, manifest)
          return manifest
        }
      } catch (err) {
        lastError = err
      }
    }
  }

  throw new Error(`Failed to fetch manifest for CID ${cid}: ${String(lastError || 'Unknown gateway error')}`)
}
