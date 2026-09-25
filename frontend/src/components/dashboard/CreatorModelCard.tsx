import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatEther } from 'viem'
import {
  Layers,
  HardDrive,
  ExternalLink,
  Users,
  TrendingUp,
  PowerOff,
  Coins,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import type { IndexedModel } from '../../lib/types'
import { formatFileSize } from '../../lib/utils'
import { useDeactivateModel } from '../../hooks/use-contracts'
import { PaymentSplitBadge } from '../payment/PaymentSplitBadge'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody } from '../ui/Card'

export interface CreatorModelCardProps {
  model: IndexedModel
  onDeactivated?: (modelId: string) => void
  className?: string
  style?: React.CSSProperties
}

export const CreatorModelCard: React.FC<CreatorModelCardProps> = ({
  model,
  onDeactivated,
  style,
}) => {
  const { deactivate, isPending: isDeactivating } = useDeactivateModel()
  const [isActive, setIsActive] = useState(model.active)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Calculate earnings for this specific model
  const chunkCount = BigInt(model.chunkCount || 1)
  const downloads = BigInt(model.totalDownloads || 0)
  const chunkPrice = model.chunkPrice || 0n
  const creatorRoyaltyPerChunk = (chunkPrice * BigInt(model.creatorShareBps)) / 10000n
  const modelEarningsWei = creatorRoyaltyPerChunk * chunkCount * downloads
  const modelEarningsMon = parseFloat(formatEther(modelEarningsWei)).toFixed(6)

  const handleDeactivate = async () => {
    try {
      setErrorMsg(null)
      // Call contract if available, otherwise update local state
      if (model.modelId.startsWith('0x') && model.modelId.length === 66) {
        await deactivate(model.modelId as `0x${string}`)
      }
      setIsActive(false)
      setShowConfirm(false)
      if (onDeactivated) {
        onDeactivated(model.modelId)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Deactivation failed')
    }
  }

  const format = model.format || 'ONNX'
  const category = model.category || 'Vision'

  return (
    <Card
      className="model-card-hover"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.78)',
        border: isActive ? '1px solid rgba(28, 25, 23, 0.08)' : '1px solid rgba(239, 68, 68, 0.25)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
        ...style,
      }}
    >
      <CardBody style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', flex: 1 }}>
        {/* Header: Badges & Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
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
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 8px',
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

          <div>
            {isActive ? (
              <Badge variant="active">
                <CheckCircle2 size={11} /> Network Active
              </Badge>
            ) : (
              <Badge variant="inactive">Deactivated</Badge>
            )}
          </div>
        </div>

        {/* Model Title & Specs */}
        <div>
          <Link
            to={`/model/${model.modelId}`}
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent-bright)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          >
            {model.modelName || 'Custom Registered Model'}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <HardDrive size={13} color="var(--color-text-muted)" />
              {model.totalSize ? formatFileSize(model.totalSize) : `${model.chunkCount} MB`}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Layers size={13} color="var(--color-text-muted)" />
              {model.chunkCount} chunks
            </span>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(28, 25, 23, 0.06)',
          }}
        >
          {/* Earnings from this model */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '11px', color: '#78716c' }}>
              <Coins size={12} color="var(--color-creator-share)" />
              <span>Model Royalties</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-creator-share)', marginTop: '0.1rem' }}>
              {modelEarningsMon} MON
            </div>
          </div>

          {/* Downloads */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '11px', color: '#78716c' }}>
              <TrendingUp size={12} color="var(--color-success)" />
              <span>Full Transfers</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: '#1c1917', marginTop: '0.1rem' }}>
              {model.totalDownloads}
            </div>
          </div>

          {/* Active Seeders */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '11px', color: '#78716c' }}>
              <Users size={12} color="var(--color-info)" />
              <span>Active Seeders</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: model.seederCount > 0 ? 'var(--color-success)' : 'var(--color-warning)',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: '#1c1917' }}>
                {model.seederCount} peers
              </span>
            </div>
          </div>

          {/* Price per Chunk */}
          <div>
            <div style={{ fontSize: '11px', color: '#78716c' }}>Chunk Price</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-xs)', color: '#57534e', marginTop: '0.1rem' }}>
              {parseFloat(formatEther(model.chunkPrice)).toFixed(6)} MON
            </div>
          </div>
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div style={{ fontSize: '11px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <AlertTriangle size={12} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Link to={`/model/${model.modelId}`} style={{ flex: 1 }}>
            <Button variant="secondary" size="sm" rightIcon={<ExternalLink size={13} />} style={{ width: '100%' }}>
              View Model
            </Button>
          </Link>

          {isActive && (
            showConfirm ? (
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeactivating}
                  onClick={handleDeactivate}
                >
                  {isDeactivating ? 'Stopping...' : 'Confirm'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                title="Deactivate Model on-chain"
                onClick={() => setShowConfirm(true)}
                style={{ color: 'var(--color-text-muted)' }}
              >
                <PowerOff size={14} />
              </Button>
            )
          )}
        </div>
      </CardBody>
    </Card>
  )
}
