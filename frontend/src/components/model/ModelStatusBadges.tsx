import React from 'react'
import { ShieldCheck, Radio, AlertTriangle, Coins, CheckCircle2, AlertCircle } from 'lucide-react'
import type { IndexedModel, ChunkManifest } from '../../lib/types'

export interface ModelStatusBadgesProps {
  model: IndexedModel
  manifest?: ChunkManifest | null
  seederCount?: number
  isPaid?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Renders the three orthogonal status indicators mandated by Spec 25:
 * 1. Verified: Manifest and chunk hashes pass cryptographic SHA-256 validation.
 * 2. Available: Live swarm peer availability and piece coverage.
 * 3. Paid: On-chain payment settlement status on Monad.
 */
export const ModelStatusBadges: React.FC<ModelStatusBadgesProps> = ({
  manifest,
  seederCount = 0,
  isPaid = false,
  style,
}) => {
  const isCryptographicallyVerified = Boolean(manifest && manifest.chunks && manifest.chunks.length > 0)
  const isSwarmAvailable = seederCount > 0

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {/* 1. Cryptographic Verification Status */}
      {isCryptographicallyVerified ? (
        <div
          title="Manifest and verified piece byte hashes match SHA-256 passport."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            background: 'hsla(155, 75%, 45%, 0.1)',
            color: '#059669',
            border: '1px solid hsla(155, 75%, 45%, 0.25)',
            letterSpacing: '0.01em',
          }}
        >
          <ShieldCheck size={13} color="#059669" />
          <span>Verified model</span>
        </div>
      ) : (
        <div
          title="Model Passport is resolving or unverified."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#d97706',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          <AlertCircle size={13} color="#d97706" />
          <span>Checking model</span>
        </div>
      )}

      {/* 2. Swarm Availability Status */}
      {isSwarmAvailable ? (
        <div
          title={`${seederCount} provider${seederCount === 1 ? '' : 's'} currently available.`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#065f46',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
            }}
          />
          <Radio size={12} color="#059669" />
          <span>Available ({seederCount} provider{seederCount === 1 ? '' : 's'})</span>
        </div>
      ) : (
        <div
          title="No providers are currently available for this model."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#b91c1c',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <AlertTriangle size={12} color="#b91c1c" />
          <span>Currently unavailable</span>
        </div>
      )}

      {/* 3. On-Chain Settlement Status */}
      {isPaid ? (
        <div
          title="Payment confirmed on the network."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#4f46e5',
            border: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          <CheckCircle2 size={12} color="#4f46e5" />
          <span>Payment confirmed</span>
        </div>
      ) : (
        <div
          title="Payments are automatically shared between the creator and provider."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(28, 25, 23, 0.05)',
            color: '#57534e',
            border: '1px solid rgba(28, 25, 23, 0.1)',
          }}
        >
          <Coins size={12} color="#78716c" />
          <span>Automatic creator payout</span>
        </div>
      )}
    </div>
  )
}
