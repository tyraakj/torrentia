import React from 'react'
import { formatEther } from 'viem'
import { History, Layers } from 'lucide-react'
import type { PaymentSplitEvent } from '../../lib/types'
import { TransactionLink } from '../payment/TransactionLink'
import { truncateAddress } from '../../lib/utils'

export interface PaymentLogProps {
  payments: PaymentSplitEvent[]
  creatorShareBps: number
  className?: string
  style?: React.CSSProperties
}

export const PaymentLog: React.FC<PaymentLogProps> = ({
  payments,
  creatorShareBps,
  style,
}) => {
  const creatorPercent = Math.round(creatorShareBps / 100)
  const seederPercent = 100 - creatorPercent

  return (
    <div
      className="glass"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={16} color="var(--color-accent-bright)" />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em' }}>
            On-Chain Payment Log
          </h3>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Monad Testnet Events
        </span>
      </div>

      {payments.length === 0 ? (
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
          No on-chain payment splits recorded for this model yet.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {payments.map((p, idx) => (
            <div
              key={p.txHash + idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid rgba(28, 25, 23, 0.08)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={13} color="var(--color-accent)" />
                <div>
                  <div style={{ fontWeight: 600, color: '#1c1917' }}>
                    {parseFloat(formatEther(p.totalPaid)).toFixed(6)} MON
                  </div>
                  <div style={{ fontSize: '10px', color: '#78716c' }}>
                    Creator: +{parseFloat(formatEther(p.creatorAmount)).toFixed(6)} ({creatorPercent}%) •
                    Seeder ({truncateAddress(p.seeder, 3)}): +{parseFloat(formatEther(p.seederAmount)).toFixed(6)} ({seederPercent}%)
                  </div>
                </div>
              </div>

              <TransactionLink txHash={p.txHash} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
