import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const networkDataPath = path.resolve('frontend/src/components/landing/hero/network-data.ts')
const ditherSpritesPath = path.resolve('frontend/src/components/landing/hero/dither-sprites.ts')

assert(fs.existsSync(networkDataPath), 'network-data.ts must exist')
assert(fs.existsSync(ditherSpritesPath), 'dither-sprites.ts must exist')

const content = fs.readFileSync(networkDataPath, 'utf8')
assert(content.includes('(2) crossing'), 'Must include (2) crossing label')
assert(content.includes('(3) paths'), 'Must include (3) paths label')
assert(content.includes('(4) in'), 'Must include (4) in label')
assert(content.includes('NETWORK_NODES'), 'Must export NETWORK_NODES')
assert(content.includes('NETWORK_EDGES'), 'Must export NETWORK_EDGES')

console.log('Task 1 verification passed: network data structure valid.')
