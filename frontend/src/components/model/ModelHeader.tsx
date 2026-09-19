import React from 'react'
import { Calendar, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import type { IndexedModel } from '../../lib/types'
import { Badge } from '../ui/Badge'
import { AddressDisplay } from '../ui/AddressDisplay'
import { PaymentSplitBadge } from '../payment/PaymentSplitBadge'

export interface ModelHeaderProps {
  model: IndexedModel
  className?: string
  style?: React.CSSProperties
}

export const ModelHeader: React.FC<ModelHeaderProps> = ({ model, style }) => {
  const registeredDate = model.registeredAt
    ? new Date(model.registeredAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent'

  const format = model.format || 'ONNX'
  const category = model.category || 'Vision'

  return (
    <div
      className="glass"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Background glow banner */}
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, hsla(265, 90%, 65%, 0.15), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Badges Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(124, 58, 237, 0.1)',
              border: '1px solid rgba(124, 58, 237, 0.25)',
              color: '#6d28d9',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {format}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(28, 25, 23, 0.06)',
              border: '1px solid rgba(28, 25, 23, 0.1)',
              color: '#44403c',
            }}
          >
            {category}
          </span>
          <PaymentSplitBadge creatorShareBps={model.creatorShareBps} size="sm" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {model.active ? (
            <Badge variant="active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle2 size={12} />
              Active Swarm
            </Badge>
          ) : (
            <Badge variant="inactive">Inactive</Badge>
          )}
        </div>
      </div>

      {/* Model Title */}
      <div>
        <h1
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            marginBottom: '0.25rem',
            wordBreak: 'break-word',
          }}
        >
          {model.modelName || 'Unnamed Model'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
          <Sparkles size={13} color="var(--color-accent-bright)" />
          <span>Decentralized AI weights distributed peer-to-peer on Monad</span>
        </div>
      </div>

      {/* Creator & Metadata Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border-glass)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Original Creator:</span>
          <AddressDisplay address={model.originalCreator} chars={4} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={13} color="var(--color-text-muted)" />
            <span>Registered: {registeredDate}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} color="var(--color-success)" />
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>ModelRegistry Verified</span>
          </div>
        </div>
      </div>
    </div>
  )
}
