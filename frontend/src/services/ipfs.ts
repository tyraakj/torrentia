import { ChunkManifest } from '../lib/types'

const IPFS_TIMEOUT_MS = 30000

// In-memory / local storage cache for instant offline & demo retrieval
const localManifestCache = new Map<string, ChunkManifest>()

/**
 * Pins a ChunkManifest JSON to IPFS via Pinata.
 * Requires VITE_PINATA_JWT to be set in .env.
 */
export async function pinManifest(manifest: ChunkManifest): Promise<string> {
  const pinataJwt = import.meta.env.VITE_PINATA_JWT

  if (!pinataJwt) {
    // Offline / demo fallback CID
    const localCid = `bafyreib${manifest.modelId.replace('0x', '').slice(0, 32)}demo`
    localManifestCache.set(localCid, manifest)
    try {
      localStorage.setItem(`ipfs_${localCid}`, JSON.stringify(manifest))
    } catch {
      // ignore
    }
    return localCid
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: JSON.stringify({
        pinataContent: manifest,
        pinataMetadata: {
          name: `${manifest.modelName}-manifest.json`,
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const cid = data.IpfsHash as string
    localManifestCache.set(cid, manifest)
    try {
      localStorage.setItem(`ipfs_${cid}`, JSON.stringify(manifest))
    } catch {
      // ignore
    }
    return cid
  } catch (err) {
    clearTimeout(timeoutId)
    // Fallback to local CID if network or API error occurs
    const localCid = `bafyreib${manifest.modelId.replace('0x', '').slice(0, 32)}fallback`
    localManifestCache.set(localCid, manifest)
    try {
      localStorage.setItem(`ipfs_${localCid}`, JSON.stringify(manifest))
    } catch {
      // ignore
    }
    console.warn(`Pinata pinning failed (${err instanceof Error ? err.message : String(err)}), saved manifest locally with CID ${localCid}`)
    return localCid
  }
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
