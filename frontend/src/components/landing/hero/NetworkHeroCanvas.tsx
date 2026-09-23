import React, { useEffect, useRef } from 'react'
import { NETWORK_NODES, NETWORK_EDGES, NETWORK_LABELS, SpriteArchetype } from './network-data'
import { generateDitheredSprites } from './dither-sprites'

interface Pulse {
  edgeIndex: number
  progress: number // 0 to 1
  speed: number
}

export const NetworkHeroCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Pre-cache all 14 dithered figure sprites offscreen
    const spriteMap = generateDitheredSprites()

    // Reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let prefersReducedMotion = mediaQuery.matches
    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches
    }
    mediaQuery.addEventListener('change', handleMotionChange)

    // Dynamic sizing with devicePixelRatio support
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      const rect = container.getBoundingClientRect()
      width = Math.floor(rect.width)
      height = Math.floor(rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }

    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(container)
    resize()

    // Mouse parallax tracking
    let targetMouseX = 0
    let targetMouseY = 0
    let currentMouseX = 0
    let currentMouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      // Normalized -1 to +1 from canvas center
      targetMouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      targetMouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }

    const handleMouseLeave = () => {
      targetMouseX = 0
      targetMouseY = 0
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    // Active data pulses traveling along edges
    const pulses: Pulse[] = [
      { edgeIndex: 12, progress: 0.1, speed: 0.0035 },
      { edgeIndex: 25, progress: 0.4, speed: 0.004 },
      { edgeIndex: 38, progress: 0.7, speed: 0.003 },
      { edgeIndex: 44, progress: 0.2, speed: 0.0045 },
      { edgeIndex: 56, progress: 0.85, speed: 0.0032 }
    ]

    let animationFrameId = 0
    let startTime = performance.now()

    // Render loop
    const render = (time: number) => {
      const elapsed = (time - startTime) * 0.001 // seconds

      // Smooth mouse easing
      currentMouseX += (targetMouseX - currentMouseX) * 0.05
      currentMouseY += (targetMouseY - currentMouseY) * 0.05

      ctx.save()
      ctx.scale(dpr, dpr)

      // 1. Electric Cobalt Blue Canvas Background (Exact to Reference)
      ctx.fillStyle = '#0038E0'
      ctx.fillRect(0, 0, width, height)

      // 2. Compute dynamic node coordinates with harmonic drift & parallax
      const computedPositions = NETWORK_NODES.map((node, i) => {
        let driftX = 0
        let driftY = 0

        if (!prefersReducedMotion) {
          // Low-frequency harmonic wave (2.5px - 4px amplitude)
          const freqX = 0.55 + (i % 7) * 0.08
          const freqY = 0.45 + (i % 5) * 0.1
          const phase = (i * 1.3) % (Math.PI * 2)

          driftX = Math.sin(elapsed * freqX + phase) * 3.2
          driftY = Math.cos(elapsed * freqY + phase * 0.8) * 2.8
        }

        // Dampened cursor parallax
        const parallaxX = currentMouseX * node.depth * 9
        const parallaxY = currentMouseY * node.depth * 7

        const x = node.x * width + driftX + parallaxX
        const y = node.y * height + driftY + parallaxY

        return { x, y }
      })

      // 3. Draw Connecting Network Edges
      ctx.lineWidth = 1.25
      ctx.lineCap = 'round'

      for (let e = 0; e < NETWORK_EDGES.length; e++) {
        const [aIdx, bIdx] = NETWORK_EDGES[e]
        const posA = computedPositions[aIdx]
        const posB = computedPositions[bIdx]
        if (!posA || !posB) continue

        // Varying alpha based on edge position
        const alpha = e % 3 === 0 ? 0.75 : e % 2 === 0 ? 0.85 : 0.65
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`

        ctx.beginPath()
        ctx.moveTo(posA.x, posA.y)
        ctx.lineTo(posB.x, posB.y)
        ctx.stroke()
      }

      // 4. Draw Traveling Data Pulses (simulating P2P chunk transfer)
      if (!prefersReducedMotion) {
        for (const pulse of pulses) {
          pulse.progress += pulse.speed
          if (pulse.progress > 1) {
            pulse.progress = 0
            // Pick a random edge from the network
            pulse.edgeIndex = Math.floor(Math.random() * NETWORK_EDGES.length)
          }

          const [aIdx, bIdx] = NETWORK_EDGES[pulse.edgeIndex]
          const posA = computedPositions[aIdx]
          const posB = computedPositions[bIdx]
          if (!posA || !posB) continue

          const px = posA.x + (posB.x - posA.x) * pulse.progress
          const py = posA.y + (posB.y - posA.y) * pulse.progress

          // White glowing chunk packet
          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(px, py, 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // 5. Draw Node Figure Cards (Dithered cutouts with white borders)
      NETWORK_NODES.forEach((node, i) => {
        const pos = computedPositions[i]
        const sprite = spriteMap.get(node.archetype as SpriteArchetype)
        if (!sprite || !pos) return

        // Scale factor adapted to screen width
        const baseScale = width < 768 ? 0.75 : width < 1200 ? 0.9 : 1.05
        const finalScale = node.scale * baseScale

        const sw = sprite.width * finalScale
        const sh = sprite.height * finalScale

        const drawX = Math.round(pos.x - sw / 2)
        const drawY = Math.round(pos.y - sh / 2)

        // Draw cached dithered sprite
        ctx.drawImage(sprite, drawX, drawY, sw, sh)

        // Optional micro-tag
        if (node.tag && width >= 900) {
          ctx.fillStyle = '#FFFFFF'
          ctx.font = '500 9px "JetBrains Mono", monospace'
          ctx.fillText(node.tag, drawX + sw + 4, drawY + sh / 2 + 3)
        }
      })

      // 6. Draw Callout Labels: (2) crossing, (3) paths, (4) in
      NETWORK_LABELS.forEach((label) => {
        const lx = label.x * width
        const ly = label.y * height

        // Responsive font size
        const fontSize = Math.max(12, Math.round(label.size * (width / 1440)))
        ctx.font = `500 ${fontSize}px "JetBrains Mono", -apple-system, sans-serif`
        ctx.fillStyle = '#FFFFFF'
        ctx.letterSpacing = '0.02em'
        ctx.fillText(label.text, lx, ly)
      })

      ctx.restore()

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    if (prefersReducedMotion) {
      render(0)
    } else {
      animationFrameId = requestAnimationFrame(render)
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      mediaQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="hero-network-canvas-container"
      aria-label="Torrentia P2P Swarm Network Canvas"
    >
      <canvas ref={canvasRef} className="hero-network-canvas" />
    </div>
  )
}
