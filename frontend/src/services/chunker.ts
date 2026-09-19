import { encodePacked, keccak256 } from 'viem'

export interface ChunkResult {
  index: number
  data: ArrayBuffer
  hash: string // 0x-prefixed hex string of SHA-256
}

export const DEFAULT_CHUNK_SIZE = 1 * 1024 * 1024 // 1 MB

/**
 * Converts an ArrayBuffer to a hex string.
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return '0x' + hex
}

/**
 * Streams chunks of a file one-by-one using file slicing and computes
 * SHA-256 content hashes in the browser without buffering the full file in memory.
 */
export async function* chunkFile(
  file: File,
  chunkSize = DEFAULT_CHUNK_SIZE
): AsyncGenerator<ChunkResult> {
  let offset = 0
  let index = 0

  while (offset < file.size) {
    const chunkBlob = file.slice(offset, offset + chunkSize)
    const arrayBuffer = await chunkBlob.arrayBuffer()

    // SHA-256 hash via browser native Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hash = bufferToHex(hashBuffer)

    yield {
      index,
      data: arrayBuffer,
      hash,
    }

    offset += chunkSize
    index++
  }
}

/**
 * Generates the deterministic modelId bytes32 for a new model:
 * keccak256(abi.encodePacked(creator, name, timestamp))
 */
export function generateModelId(
  creator: string,
  name: string,
  timestamp: number
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'string', 'uint256'],
      [creator as `0x${string}`, name.trim(), BigInt(timestamp)]
    )
  )
}
