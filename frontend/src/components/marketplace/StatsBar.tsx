import React, { useEffect, useState } from 'react'
import { Cpu, Activity, Zap } from 'lucide-react'
import type { SwarmStats } from '../../services/api-client'

interface StatsBarProps {
  stats?: SwarmStats
  isLoading?: boolean
}

function useCountUp(target: number, durationMs = 800): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let frameId: number
    const startTime = performance.now()
    const startVal = 0

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(startVal + (target - startVal) * ease))

      if (progress < 1) {
        frameId = requestAnimationFrame(update)
      }
    }

    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [target, durationMs])

  return count
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, isLoading }) => {
  const totalModels = stats?.totalModels ?? 5
  const totalDownloads = stats?.totalDownloads ?? 2882
  const animatedModels = useCountUp(totalModels)
  const animatedDownloads = useCountUp(totalDownloads)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-4)',
        maxWidth: '860px',
        margin: '0 auto var(--space-8)',
        width: '100%',
      }}
    >
      {/* Stat 1: Models Listed */}
      <div
        className="glass-panel"
        style={{
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid hsla(265, 90%, 65%, 0.18)',
          background: 'hsla(230, 20%, 12%, 0.7)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'hsla(265, 90%, 65%, 0.15)',
            color: 'var(--color-accent-bright)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Cpu size={22} />
        </div>
        <div>
          <div
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              lineHeight: 1.1,
            }}
          >
            {isLoading ? '...' : animatedModels}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Models In Swarm
          </div>
        </div>
      </div>

      {/* Stat 2: Total Chunks Streamed */}
      <div
        className="glass-panel"
        style={{
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid hsla(155, 75%, 55%, 0.18)',
          background: 'hsla(230, 20%, 12%, 0.7)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'hsla(155, 75%, 55%, 0.15)',
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Activity size={22} />
        </div>
        <div>
          <div
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              lineHeight: 1.1,
            }}
          >
            {isLoading ? '...' : animatedDownloads.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Chunks Streamed
          </div>
        </div>
      </div>

      {/* Stat 3: Volume Traded */}
      <div
        className="glass-panel"
        style={{
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid hsla(200, 85%, 60%, 0.18)',
          background: 'hsla(230, 20%, 12%, 0.7)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'hsla(200, 85%, 60%, 0.15)',
            color: 'var(--color-info)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Zap size={22} />
        </div>
        <div>
          <div
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              lineHeight: 1.1,
            }}
          >
            {isLoading ? '...' : `${stats?.totalVolumeMon || '2.45'} MON`}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Volume Distributed
          </div>
        </div>
      </div>
    </div>
  )
}
