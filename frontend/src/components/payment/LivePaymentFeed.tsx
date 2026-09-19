import React from 'react'
import { formatEther } from 'viem'
import { CheckCircle, Zap } from 'lucide-react'
import type { PaymentSplitEvent } from '../../lib/types'
import { TransactionLink } from './TransactionLink'
import { truncateAddress } from '../../lib/utils'

export interface LivePaymentFeedProps {
  payments: PaymentSplitEvent[]
  creatorShareBps: number
  maxItems?: number
  className?: string
  style?: React.CSSProperties
}

export const LivePaymentFeed: React.FC<LivePaymentFeedProps> = ({
  payments,
  creatorShareBps,
  maxItems = 10,
  style,
}) => {
  const creatorPercent = Math.round(creatorShareBps / 100)
  const seederPercent = 100 - creatorPercent

  // Cumulative sums
  const totalPaidWei = payments.reduce((acc, p) => acc + p.totalPaid, 0n)
  const totalCreatorWei = payments.reduce((acc, p) => acc + p.creatorAmount, 0n)
  const totalSeederWei = payments.reduce((acc, p) => acc + p.seederAmount, 0n)

  const displayedPayments = payments.slice(0, maxItems)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        ...style,
      }}
    >
      {/* Feed Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)',
          fontWeight: 600,
          padding: '0 var(--space-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Zap size={13} color="var(--color-accent-bright)" />
          <span>LIVE ON-CHAIN SPLIT STREAM</span>
        </div>
        <span>{payments.length} splits settled</span>
      </div>

      {/* Payment Rows List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {displayedPayments.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(28, 25, 23, 0.04)',
              border: '1px dashed rgba(28, 25, 23, 0.15)',
              color: '#78716c',
              fontSize: 'var(--text-xs)',
            }}
          >
            Payments will stream here live as chunks are transferred from peer seeders.
          </div>
        ) : (
          displayedPayments.map((p, idx) => {
            const isLatest = idx === 0
            const creatorMon = formatEther(p.creatorAmount)
            const seederMon = formatEther(p.seederAmount)

            return (
              <div
                key={p.txHash + idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: isLatest ? 'rgba(124, 58, 237, 0.08)' : 'rgba(255, 255, 255, 0.75)',
                  border: isLatest
                    ? '1px solid rgba(124, 58, 237, 0.25)'
                    : '1px solid rgba(28, 25, 23, 0.08)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Left: Chunk index + Check */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--color-success)" />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Chunk #{payments.length - idx}
                  </span>
                </div>

                {/* Center: Mini Split Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    flex: '1',
                    maxWidth: '180px',
                    margin: '0 0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(28, 25, 23, 0.08)',
                      display: 'flex',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      title={`Creator share: ${parseFloat(creatorMon).toFixed(6)} MON`}
                      style={{
                        width: `${creatorPercent}%`,
                        background: 'var(--color-creator-share)',
                      }}
                    />
                    <div
                      title={`Seeder share: ${parseFloat(seederMon).toFixed(6)} MON`}
                      style={{
                        width: `${seederPercent}%`,
                        background: 'var(--color-seeder-share)',
                      }}
                    />
                  </div>
                </div>

                {/* Right: Seeder Address & Tx Hash */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className="address-mono"
                    style={{ fontSize: '11px', color: '#78716c' }}
                    title={`Paid to seeder ${p.seeder}`}
                  >
                    → {truncateAddress(p.seeder, 3)}
                  </span>
                  <TransactionLink txHash={p.txHash} showCopy={false} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Aggregate Running Totals Footer */}
      {payments.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(28, 25, 23, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ color: '#78716c' }}>Total Settled:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1c1917' }}>
              {parseFloat(formatEther(totalPaidWei)).toFixed(6)} MON
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--color-creator-share)', fontWeight: 600 }}>
              Creator: +{parseFloat(formatEther(totalCreatorWei)).toFixed(6)}
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>•</span>
            <span style={{ color: 'var(--color-seeder-share)', fontWeight: 600 }}>
              Seeders: +{parseFloat(formatEther(totalSeederWei)).toFixed(6)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
