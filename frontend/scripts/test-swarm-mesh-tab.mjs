import assert from 'node:assert/strict'

// Test seeder categorization and zero-mock handling for SwarmMeshTab
function parseSeeders(records) {
  const seeders = Array.isArray(records) ? records : []
  const cliSeeders = seeders.filter((s) => s.isHttpSeeder || s.transport === 'persistent_seeder')
  const browserSeeders = seeders.filter((s) => !s.isHttpSeeder && s.transport !== 'persistent_seeder')
  
  return {
    total: seeders.length,
    cliCount: cliSeeders.length,
    browserCount: browserSeeders.length,
    hasActiveSwarm: seeders.length > 0,
  }
}

// Test with 0 seeders (authentic empty state)
const emptySwarm = parseSeeders([])
assert.equal(emptySwarm.total, 0)
assert.equal(emptySwarm.hasActiveSwarm, false)

// Test with mixed peers
const activeSwarm = parseSeeders([
  { peerId: 'peer-1', seederAddress: '0x123', chunksHeld: [0, 1], isHttpSeeder: false },
  { peerId: 'peer-2', seederAddress: '0x456', chunksHeld: [0, 1, 2], isHttpSeeder: true },
])
assert.equal(activeSwarm.total, 2)
assert.equal(activeSwarm.cliCount, 1)
assert.equal(activeSwarm.browserCount, 1)
assert.equal(activeSwarm.hasActiveSwarm, true)

console.log('✓ SwarmMeshTab parser and empty state tests passed cleanly')
