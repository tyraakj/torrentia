import React from 'react'
import { Sparkles, TrendingUp, Users, HardDrive, ShieldCheck } from 'lucide-react'
import type { CreatorEarningsSummary } from '../../hooks/use-creator-data'

export interface EarningsSummaryProps {
  summary: CreatorEarningsSummary
  className?: string
  style?: React.CSSProperties
}

export const EarningsSummary: React.FC<EarningsSummaryProps> = ({ summary, style }) => {
  return (
    <div
      className="glass glow"
      style={{
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(28, 25, 23, 0.08)',
        background: 'rgba(255, 255, 255, 0.85)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
        ...style,
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, hsla(265, 90%, 65%, 0.25), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Banner Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(124, 58, 237, 0.1)',
              border: '1px solid rgba(124, 58, 237, 0.25)',
            }}
          >
            <Sparkles size={14} color="#7c3aed" />
          </div>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-bright)',
            }}
          >
            Creator Royalty Overview
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: 'hsla(155, 75%, 55%, 0.1)',
            border: '1px solid hsla(155, 75%, 55%, 0.25)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-success)',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={13} />
          <span>Atomic Direct Settlement</span>
        </div>
      </div>

      {/* Hero Numbers Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-6)',
          position: 'relative',
          zIndex: 1,
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Cumulative Earnings */}
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>
            Cumulative Royalties Earned
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span
              className="gradient-text"
              style={{
                fontSize: 'var(--text-4xl)',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.03em',
              }}
            >
              {summary.totalEarningsMon}
            </span>
            <span
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--color-accent-bright)',
              }}
            >
              MON
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Direct to your wallet per chunk
          </div>
        </div>

        {/* Total Downloads */}
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>
            Total Swarm Downloads
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={24} color="var(--color-success)" />
            <span
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-primary)',
              }}
            >
              {summary.totalDownloads}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Full model transfers across network
          </div>
        </div>

        {/* Active Seeders */}
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>
            Active Bandwidth Seeders
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="var(--color-info)" />
            <span
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-primary)',
              }}
            >
              {summary.totalActiveSeeders}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Peers currently serving your weights
          </div>
        </div>

        {/* Total Models */}
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>
            Models Published
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HardDrive size={24} color="var(--color-accent-bright)" />
            <span
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-primary)',
              }}
            >
              {summary.totalModels}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Partitioned & distributed on Monad
          </div>
        </div>
      </div>

      {/* Footer Info Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.8rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.75)',
          border: '1px solid rgba(28, 25, 23, 0.08)',
          fontSize: 'var(--text-xs)',
          color: '#57534e',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Sparkles size={14} color="var(--color-accent-bright)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Zero Escrow Claiming:</strong> Every time a peer streams a chunk, Monad's <code>SplitPayment.sol</code> transfers native MON directly to your address in the same atomic block transaction.
        </span>
      </div>
    </div>
  )
}
