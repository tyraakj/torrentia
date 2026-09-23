import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const canvasPath = path.resolve('frontend/src/components/landing/hero/NetworkHeroCanvas.tsx')
assert(fs.existsSync(canvasPath), 'NetworkHeroCanvas.tsx must exist')

const content = fs.readFileSync(canvasPath, 'utf8')
assert(content.includes('requestAnimationFrame'), 'Must use requestAnimationFrame loop')
assert(content.includes('devicePixelRatio'), 'Must support HiDPI / Retina displays')
assert(content.includes('prefers-reduced-motion'), 'Must support reduced motion')
assert(content.includes('NetworkHeroCanvas'), 'Must export NetworkHeroCanvas')

console.log('Task 2 verification passed: NetworkHeroCanvas contract verified.')
