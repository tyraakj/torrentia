import React, { useEffect, useRef } from 'react'
import { Radio } from 'lucide-react'
import gsap from 'gsap'

export const StarburstGraphic: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const raysRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!raysRef.current) return

    const tween = gsap.to(raysRef.current, {
      rotation: 360,
      duration: 50,
      repeat: -1,
      ease: 'none',
      transformOrigin: '50% 50%',
    })

    return () => {
      tween.kill()
    }
  }, [])

  // Generate 36 radial rays around 360 degrees
  const raysCount = 36
  const rayLines = Array.from({ length: raysCount }, (_, i) => {
    const angle = (i * 360) / raysCount
    const rad = (angle * Math.PI) / 180
    // Variable length for geometric rhythm
    const isLong = i % 3 === 0
    const isMedium = i % 2 === 0
    const innerR = 48
    const outerR = isLong ? 105 : isMedium ? 88 : 72
    const x1 = 110 + innerR * Math.cos(rad)
    const y1 = 110 + innerR * Math.sin(rad)
    const x2 = 110 + outerR * Math.cos(rad)
    const y2 = 110 + outerR * Math.sin(rad)
    const opacity = isLong ? 0.7 : isMedium ? 0.4 : 0.2

    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="url(#rayGradient)"
        strokeWidth={isLong ? 1.5 : 1}
        strokeOpacity={opacity}
        strokeLinecap="round"
      />
    )
  })

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Background Soft Glow */}
      <div
        style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(16, 185, 129, 0.12) 50%, transparent 75%)',
          filter: 'blur(16px)',
        }}
      />

      {/* Rotating SVG Rays */}
      <svg
        ref={raysRef}
        width="220"
        height="220"
        viewBox="0 0 220 220"
        style={{
          position: 'absolute',
          top: '-20px',
          left: '-20px',
        }}
      >
        <defs>
          <linearGradient id="rayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#181615" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {rayLines}
      </svg>

      {/* Central Charcoal Swarm Emblem Badge */}
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          background: '#181615',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 6px 20px rgba(24, 22, 21, 0.28), 0 0 16px rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 3,
        }}
      >
        <Radio size={22} color="#ffffff" />
      </div>
    </div>
  )
}
