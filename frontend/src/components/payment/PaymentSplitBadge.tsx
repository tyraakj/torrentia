import React from 'react'
import { Zap } from 'lucide-react'

export interface PaymentSplitBadgeProps {
  creatorShareBps: number
  size?: 'sm' | 'md'
  showIcon?: boolean
  style?: React.CSSProperties
}

export const PaymentSplitBadge: React.FC<PaymentSplitBadgeProps> = ({
  creatorShareBps,
  size = 'md',
  showIcon = true,
  style,
}) => {
  const creatorPercent = Math.round(creatorShareBps / 100)
  const seederPercent = 100 - creatorPercent

  const isSmall = size === 'sm'

  return (
    <div
      title={`Monad Split Settlement: ${creatorPercent}% Creator Royalty, ${seederPercent}% Host Incentive`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: isSmall ? '0.15rem 0.45rem' : '0.25rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        background: 'rgba(28, 25, 23, 0.05)',
        border: '1px solid rgba(28, 25, 23, 0.09)',
        fontSize: isSmall ? 'var(--text-xs)' : 'var(--text-sm)',
        fontFamily: 'var(--font-mono)',
        userSelect: 'none',
        ...style,
      }}
    >
      {showIcon && <Zap size={isSmall ? 11 : 13} color="#6366f1" />}
      <span
        style={{
          color: 'var(--color-creator-share)',
          fontWeight: 700,
        }}
      >
        {creatorPercent}%
      </span>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>/</span>
      <span
        style={{
          color: 'var(--color-seeder-share)',
          fontWeight: 700,
        }}
      >
        {seederPercent}%
      </span>
      <span
        style={{
          fontSize: '0.75em',
          color: 'var(--color-text-muted)',
          marginLeft: '0.1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Split
      </span>
    </div>
  )
}
