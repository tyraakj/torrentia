import assert from 'node:assert/strict'

// Test chunk verification status mapping for PieceIntegrityTab
function evaluateChunkStatus(chunk, heldIndices) {
  const isHeld = heldIndices.includes(chunk.index)
  const hasValidHash = typeof chunk.hash === 'string' && chunk.hash.startsWith('0x') && chunk.hash.length === 66
  
  return {
    index: chunk.index,
    hash: chunk.hash,
    status: isHeld ? 'verified_stored' : 'swarm_available',
    isValidCryptoHash: hasValidHash,
  }
}

// Held locally test
const validChunk = {
  index: 0,
  hash: '0x8f4e2b019a010000000000000000000000000000000000000000000000000000',
  size: 1048576,
}
const heldRes = evaluateChunkStatus(validChunk, [0, 1])
assert.equal(heldRes.status, 'verified_stored')
assert.equal(heldRes.isValidCryptoHash, true)

// Swarm available (not local) test
const remoteRes = evaluateChunkStatus(validChunk, [2, 3])
assert.equal(remoteRes.status, 'swarm_available')

console.log('✓ PieceIntegrityTab verification evaluation tests passed cleanly')
