import { SpriteArchetype } from './network-data'

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
]

interface SpriteConfig {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

/**
 * Procedural silhouette definitions for all 14 archetypes.
 * Each draws grayscale values (0 = black silhouette, 120-200 = clothing shading/highlights, 255 = white background/snow).
 */
const SPRITE_CONFIGS: Record<SpriteArchetype, SpriteConfig> = {
  SOLO_STAND_1: {
    width: 26,
    height: 38,
    draw: (ctx, w) => {
      // Head
      ctx.fillStyle = '#101010'
      ctx.beginPath()
      ctx.arc(w / 2, 8, 4, 0, Math.PI * 2)
      ctx.fill()
      // Body / Jacket
      ctx.fillStyle = '#222222'
      ctx.beginPath()
      ctx.moveTo(w / 2 - 4.5, 12)
      ctx.lineTo(w / 2 + 4.5, 12)
      ctx.lineTo(w / 2 + 5.5, 25)
      ctx.lineTo(w / 2 - 5.5, 25)
      ctx.closePath()
      ctx.fill()
      // Legs
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(w / 2 - 4.5, 25, 3.5, 10)
      ctx.fillRect(w / 2 + 1, 25, 3.5, 10)
    }
  },

  SOLO_STAND_2: {
    width: 28,
    height: 40,
    draw: (ctx, w) => {
      // Head with beanie
      ctx.fillStyle = '#141414'
      ctx.beginPath()
      ctx.ellipse(w / 2, 8, 4, 4.5, 0, 0, Math.PI * 2)
      ctx.fill()
      // Bulky park coat
      ctx.fillStyle = '#303030'
      ctx.beginPath()
      ctx.roundRect(w / 2 - 6, 12, 12, 16, 2)
      ctx.fill()
      // Pants
      ctx.fillStyle = '#111111'
      ctx.fillRect(w / 2 - 5, 28, 4, 9)
      ctx.fillRect(w / 2 + 1, 28, 4, 9)
    }
  },

  PAIR_TALKING: {
    width: 44,
    height: 42,
    draw: (ctx) => {
      // Left person
      ctx.fillStyle = '#121212'
      ctx.beginPath()
      ctx.arc(14, 8, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#262626'
      ctx.fillRect(9, 13, 10, 14)
      ctx.fillStyle = '#080808'
      ctx.fillRect(9.5, 27, 3.8, 11)
      ctx.fillRect(14.5, 27, 3.8, 11)

      // Right person (turned facing left)
      ctx.fillStyle = '#161616'
      ctx.beginPath()
      ctx.arc(30, 8.5, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3a3a3a'
      ctx.fillRect(25, 13.5, 10, 13.5)
      ctx.fillStyle = '#101010'
      ctx.fillRect(25.5, 27, 3.8, 11)
      ctx.fillRect(30.5, 27, 3.8, 11)

      // Small gesture arm
      ctx.strokeStyle = '#222222'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(18, 17)
      ctx.lineTo(23, 20)
      ctx.stroke()
    }
  },

  HUDDLE_GROUP: {
    width: 52,
    height: 44,
    draw: (ctx) => {
      // 4 figures standing together
      const centers = [12, 22, 32, 42]
      centers.forEach((cx, idx) => {
        const headY = 8 + (idx % 2) * 2
        ctx.fillStyle = '#181818'
        ctx.beginPath()
        ctx.arc(cx, headY, 3.8, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = idx === 1 ? '#3a3a3a' : idx === 2 ? '#222222' : '#2c2c2c'
        ctx.fillRect(cx - 4.5, headY + 5, 9, 14)

        ctx.fillStyle = '#0c0c0c'
        ctx.fillRect(cx - 3.8, headY + 19, 3.2, 12)
        ctx.fillRect(cx + 0.6, headY + 19, 3.2, 12)
      })
    }
  },

  SKIER_POLES: {
    width: 32,
    height: 42,
    draw: (ctx) => {
      // Skier angled slightly
      ctx.fillStyle = '#121212'
      ctx.beginPath()
      ctx.arc(15, 8, 4, 0, Math.PI * 2)
      ctx.fill()

      // Ski jacket
      ctx.fillStyle = '#2b2b2b'
      ctx.beginPath()
      ctx.moveTo(10, 13)
      ctx.lineTo(21, 13)
      ctx.lineTo(19, 26)
      ctx.lineTo(9, 26)
      ctx.closePath()
      ctx.fill()

      // Ski pants
      ctx.fillStyle = '#101010'
      ctx.fillRect(10, 26, 4, 10)
      ctx.fillRect(16, 26, 4, 10)

      // Skis on feet
      ctx.fillStyle = '#050505'
      ctx.fillRect(6, 36, 18, 2.5)

      // Ski poles
      ctx.strokeStyle = '#181818'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(8, 16)
      ctx.lineTo(5, 36)
      ctx.moveTo(22, 16)
      ctx.lineTo(26, 36)
      ctx.stroke()
    }
  },

  WALKER_FORWARD: {
    width: 26,
    height: 39,
    draw: (ctx, w) => {
      // Head
      ctx.fillStyle = '#121212'
      ctx.beginPath()
      ctx.arc(w / 2, 7.5, 3.8, 0, Math.PI * 2)
      ctx.fill()

      // Coat
      ctx.fillStyle = '#2e2e2e'
      ctx.fillRect(w / 2 - 5, 12, 10, 15)

      // Walking stride legs
      ctx.fillStyle = '#0e0e0e'
      ctx.beginPath()
      ctx.moveTo(w / 2 - 4, 27)
      ctx.lineTo(w / 2 - 6, 37)
      ctx.lineTo(w / 2 - 2, 37)
      ctx.lineTo(w / 2 - 1, 27)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(w / 2 + 1, 27)
      ctx.lineTo(w / 2 + 5, 37)
      ctx.lineTo(w / 2 + 7, 37)
      ctx.lineTo(w / 2 + 3, 27)
      ctx.closePath()
      ctx.fill()
    }
  },

  DUO_HUDDLE: {
    width: 36,
    height: 40,
    draw: (ctx) => {
      // Two people standing shoulder to shoulder
      ctx.fillStyle = '#141414'
      ctx.beginPath()
      ctx.arc(13, 8, 3.8, 0, Math.PI * 2)
      ctx.arc(23, 9, 3.8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#282828'
      ctx.fillRect(8, 13, 20, 15)

      ctx.fillStyle = '#0e0e0e'
      ctx.fillRect(9, 28, 4, 10)
      ctx.fillRect(14, 28, 4, 10)
      ctx.fillRect(19, 28, 4, 10)
      ctx.fillRect(24, 28, 4, 10)
    }
  },

  DISTANCE_SOLO: {
    width: 20,
    height: 30,
    draw: (ctx, w) => {
      // Small distant figure
      ctx.fillStyle = '#181818'
      ctx.beginPath()
      ctx.arc(w / 2, 5.5, 2.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#262626'
      ctx.fillRect(w / 2 - 3.5, 9, 7, 11)
      ctx.fillStyle = '#101010'
      ctx.fillRect(w / 2 - 3, 20, 2.5, 8)
      ctx.fillRect(w / 2 + 0.5, 20, 2.5, 8)
    }
  },

  TRIO_GATHER: {
    width: 44,
    height: 41,
    draw: (ctx) => {
      const positions = [11, 22, 33]
      positions.forEach((px, i) => {
        ctx.fillStyle = '#151515'
        ctx.beginPath()
        ctx.arc(px, 7.5 + (i === 1 ? 0 : 2), 3.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = i === 1 ? '#343434' : '#222222'
        ctx.fillRect(px - 4, 12 + (i === 1 ? 0 : 2), 8, 14)

        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(px - 3.5, 26 + (i === 1 ? 0 : 2), 3, 10)
        ctx.fillRect(px + 0.5, 26 + (i === 1 ? 0 : 2), 3, 10)
      })
    }
  },

  CROUCH_PAUSE: {
    width: 32,
    height: 34,
    draw: (ctx) => {
      // Crouched or bent over adjusting bindings
      ctx.fillStyle = '#141414'
      ctx.beginPath()
      ctx.arc(12, 10, 3.8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#2d2d2d'
      ctx.beginPath()
      ctx.moveTo(9, 14)
      ctx.lineTo(22, 17)
      ctx.lineTo(20, 26)
      ctx.lineTo(10, 24)
      ctx.closePath()
      ctx.fill()

      // Crouched legs
      ctx.fillStyle = '#0e0e0e'
      ctx.fillRect(10, 24, 12, 6)
      ctx.fillRect(14, 29, 9, 3)
    }
  },

  WALKER_AWAY: {
    width: 26,
    height: 39,
    draw: (ctx, w) => {
      // Figure viewed from behind, backpack
      ctx.fillStyle = '#151515'
      ctx.beginPath()
      ctx.arc(w / 2, 7, 3.8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#383838'
      ctx.fillRect(w / 2 - 5.5, 11, 11, 15)

      // Backpack
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(w / 2 - 3.5, 13, 7, 9)

      ctx.fillStyle = '#0c0c0c'
      ctx.fillRect(w / 2 - 4.5, 26, 3.8, 11)
      ctx.fillRect(w / 2 + 0.8, 26, 3.8, 11)
    }
  },

  LARGE_HUDDLE: {
    width: 72,
    height: 56,
    draw: (ctx) => {
      // Dense huddle of 6-7 people (central highlight on the Left Basin)
      const people = [
        { x: 14, y: 12, scale: 0.9, shade: '#181818', coat: '#222222' },
        { x: 23, y: 9, scale: 1.0, shade: '#141414', coat: '#3a3a3a' },
        { x: 34, y: 11, scale: 1.05, shade: '#101010', coat: '#252525' },
        { x: 44, y: 8, scale: 1.0, shade: '#161616', coat: '#404040' },
        { x: 55, y: 13, scale: 0.95, shade: '#121212', coat: '#2a2a2a' },
        // Front crouching/sitting figures
        { x: 28, y: 22, scale: 0.85, shade: '#0e0e0e', coat: '#1c1c1c' },
        { x: 40, y: 24, scale: 0.85, shade: '#0a0a0a', coat: '#1f1f1f' }
      ]

      people.forEach((p) => {
        // Head
        ctx.fillStyle = p.shade
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4 * p.scale, 0, Math.PI * 2)
        ctx.fill()

        // Torso
        ctx.fillStyle = p.coat
        ctx.fillRect(p.x - 5 * p.scale, p.y + 4.5, 10 * p.scale, 16 * p.scale)

        // Lower body
        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(p.x - 4.5 * p.scale, p.y + 20 * p.scale, 4 * p.scale, 14 * p.scale)
        ctx.fillRect(p.x + 0.5 * p.scale, p.y + 20 * p.scale, 4 * p.scale, 14 * p.scale)
      })
    }
  },

  TRAIL_DUO: {
    width: 38,
    height: 40,
    draw: (ctx) => {
      // One walker slightly leading another
      ctx.fillStyle = '#141414'
      ctx.beginPath()
      ctx.arc(13, 7.5, 3.8, 0, Math.PI * 2)
      ctx.arc(26, 9.5, 3.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#2e2e2e'
      ctx.fillRect(8, 12, 9, 14)
      ctx.fillStyle = '#1c1c1c'
      ctx.fillRect(21, 14, 9, 13)

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(9, 26, 3.5, 11)
      ctx.fillRect(13.5, 26, 3.5, 11)
      ctx.fillRect(22, 27, 3.5, 10)
      ctx.fillRect(26.5, 27, 3.5, 10)
    }
  },

  SUMMIT_WATCH: {
    width: 26,
    height: 42,
    draw: (ctx, w) => {
      // High watcher standing atop a peak
      ctx.fillStyle = '#101010'
      ctx.beginPath()
      ctx.arc(w / 2, 6.5, 3.8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#323232'
      ctx.beginPath()
      ctx.moveTo(w / 2 - 5, 11)
      ctx.lineTo(w / 2 + 5, 11)
      ctx.lineTo(w / 2 + 4, 25)
      ctx.lineTo(w / 2 - 4, 25)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#080808'
      ctx.fillRect(w / 2 - 4, 25, 3.5, 12)
      ctx.fillRect(w / 2 + 0.5, 25, 3.5, 12)
    }
  }
}

/**
 * Apply 4x4 Bayer ordered dithering to grayscale image data.
 * Produces crisp 1-bit monochrome pixel art with genuine retro print texture.
 */
function applyBayerDither(imageData: ImageData): void {
  const { data, width, height } = imageData

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const alpha = data[idx + 3]
      if (alpha === 0) continue

      // Luminance
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const luma = 0.299 * r + 0.587 * g + 0.114 * b

      // Bayer threshold mapped to 0..255
      const threshold = (BAYER_4X4[y % 4][x % 4] / 16) * 255

      // 1-bit thresholding: black or white
      const bit = luma > threshold ? 255 : 18

      data[idx] = bit
      data[idx + 1] = bit
      data[idx + 2] = bit
      data[idx + 3] = 255
    }
  }
}

/**
 * Pre-render all 14 dithered sprite cards into offscreen HTMLCanvasElements.
 * Adds a clean white rectangular Polaroid/cutout border around every figure.
 */
export function generateDitheredSprites(): Map<SpriteArchetype, HTMLCanvasElement> {
  const spriteMap = new Map<SpriteArchetype, HTMLCanvasElement>()

  for (const [key, config] of Object.entries(SPRITE_CONFIGS)) {
    const archetype = key as SpriteArchetype
    const cardPadding = 3
    const totalW = config.width + cardPadding * 2
    const totalH = config.height + cardPadding * 2

    // Offscreen canvas for raw drawing
    const canvas = document.createElement('canvas')
    canvas.width = totalW
    canvas.height = totalH
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    // 1. Fill card background with light gray/white (simulating snow or paper background)
    ctx.fillStyle = '#F4F5F8'
    ctx.fillRect(1, 1, totalW - 2, totalH - 2)

    // 2. Draw figure silhouette
    ctx.save()
    ctx.translate(cardPadding, cardPadding)
    config.draw(ctx, config.width, config.height)
    ctx.restore()

    // 3. Extract and apply 1-bit Bayer matrix dithering to figure
    const imgData = ctx.getImageData(0, 0, totalW, totalH)
    applyBayerDither(imgData)
    ctx.putImageData(imgData, 0, 0)

    // 4. Draw sharp white border with 1px black inner stroke (Polaroid cutout aesthetic)
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1.5
    ctx.strokeRect(0.75, 0.75, totalW - 1.5, totalH - 1.5)

    spriteMap.set(archetype, canvas)
  }

  return spriteMap
}
