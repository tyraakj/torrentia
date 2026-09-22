import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, CardFooter } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { AddressDisplay } from '../ui/AddressDisplay'
import { MonAmount } from '../ui/MonAmount'
import { formatFileSize, bpsToPercent } from '../../lib/utils'
import type { IndexedModel } from '../../lib/types'
import { HardDrive, ArrowRight, Download } from 'lucide-react'

interface ModelCardProps {
  model: IndexedModel
}

export const ModelCard: React.FC<ModelCardProps> = ({ model }) => {
  const navigate = useNavigate()

  const handleCardClick = () => {
    navigate(`/model/${model.modelId}`)
  }

  const creatorPercent = bpsToPercent(model.creatorShareBps)
  const seederPercent = bpsToPercent(10000 - model.creatorShareBps)
  const sizeFormatted = model.totalSize
    ? formatFileSize(model.totalSize)
    : `${model.chunkCount} MB`

  return (
    <Card
      onClick={handleCardClick}
      className="model-card-hover"
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '20px',
        boxShadow: '0 8px 24px rgba(28, 25, 23, 0.04)',
      }}
    >
      <CardBody style={{ flex: 1, padding: 'var(--space-6)' }}>
        {/* Top Badges Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {model.isDemo && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#b45309',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  letterSpacing: '0.03em',
                }}
              >
                Demo Data
              </span>
            )}
            {model.format && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#4f46e5',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  letterSpacing: '0.04em',
                }}
              >
                {model.format}
              </span>
            )}
            {model.category && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(28, 25, 23, 0.05)',
                  color: '#57534e',
                  border: '1px solid rgba(28, 25, 23, 0.08)',
                }}
              >
                {model.category}
              </span>
            )}
          </div>

          {/* Live Peer Swarm Indicator */}
          {model.staleSeederData ? (
            <Badge variant="inactive" dot={true} style={{ fontSize: '11px', padding: '3px 9px' }}>
              Unknown / Stale
            </Badge>
          ) : model.seederCount > 0 ? (
            <Badge variant="seeding" dot={true} style={{ fontSize: '11px', padding: '3px 9px' }}>
              {model.seederCount} {model.seederCount === 1 ? 'peer' : 'peers'}
            </Badge>
          ) : (
            <Badge variant="inactive" dot={true} style={{ fontSize: '11px', padding: '3px 9px' }}>
              0 peers online
            </Badge>
          )}
        </div>

        {/* Model Title in Apfel Grotezk */}
        <h3
          style={{
            fontFamily: "'Apfel Grotezk', 'Plus Jakarta Sans', sans-serif",
            fontSize: '1.2rem',
            fontWeight: 700,
            lineHeight: 1.3,
            color: '#1c1917',
            marginBottom: 'var(--space-2)',
            letterSpacing: '-0.01em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {model.modelName || 'Untitled AI Model'}
        </h3>

        {/* Creator Address */}
        <div style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: '#78716c' }}>by</span>
          <AddressDisplay address={model.originalCreator} showLink={false} />
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.65)',
            border: '1px solid rgba(28, 25, 23, 0.06)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {/* Piece Price */}
          <div>
            <div style={{ fontSize: '10px', color: '#78716c', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
              Price / Piece
            </div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#1c1917' }}>
              <MonAmount amountWei={model.chunkPrice} />
            </div>
          </div>

          {/* Size & Pieces */}
          <div>
            <div style={{ fontSize: '10px', color: '#78716c', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
              Swarm Size
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: '#44403c', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HardDrive size={12} color="#78716c" />
              <span>{sizeFormatted}</span>
              <span style={{ color: '#a8a29e' }}>({model.chunkCount} pcs)</span>
            </div>
          </div>
        </div>

        {/* Creator / Peer Split Bar Preview */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, marginBottom: '5px' }}>
            <span style={{ color: '#4f46e5' }}>
              Creator {creatorPercent}
            </span>
            <span style={{ color: '#059669' }}>
              Peer {seederPercent}
            </span>
          </div>
          <div
            style={{
              height: '5px',
              borderRadius: '9999px',
              display: 'flex',
              overflow: 'hidden',
              background: 'rgba(28, 25, 23, 0.08)',
            }}
          >
            <div style={{ width: creatorPercent, background: '#6366f1' }} />
            <div style={{ width: seederPercent, background: '#10b981' }} />
          </div>
        </div>
      </CardBody>

      {/* Card Footer */}
      <CardFooter
        style={{
          padding: 'var(--space-3) var(--space-6)',
          borderTop: '1px solid rgba(28, 25, 23, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: '#78716c' }}>
          <Download size={13} />
          <span>{model.totalDownloads.toLocaleString()} downloads</span>
        </div>

        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            color: '#1c1917',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Download <ArrowRight size={13} />
        </span>
      </CardFooter>
    </Card>
  )
}
