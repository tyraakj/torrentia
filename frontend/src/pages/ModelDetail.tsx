import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Zap, ShieldCheck, FileQuestion } from 'lucide-react'
import { useModel, useModelPayments } from '../hooks/use-models'
import { fetchManifest } from '../services/ipfs'
import type { ChunkManifest } from '../lib/types'
import { allowMockFallbacks } from '../lib/app-mode'
import { ModelHeader } from '../components/model/ModelHeader'
import { FileInfoPanel } from '../components/model/FileInfoPanel'
import { SeederPanel } from '../components/model/SeederPanel'
import { DownloadSection } from '../components/model/DownloadSection'
import { ModelCardViewer } from '../components/model/ModelCardViewer'
import { PaymentLog } from '../components/model/PaymentLog'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'

export const ModelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: model, isLoading: isModelLoading, error: modelError } = useModel(id)
  const { data: payments = [] } = useModelPayments(id)

  const [manifest, setManifest] = useState<ChunkManifest | null>(null)
  const [manifestError, setManifestError] = useState<string | null>(null)

  // Fetch Model Passport from IPFS with strict mode governance
  useEffect(() => {
    let isMounted = true
    if (!model) return

    const loadManifest = async () => {
      setManifestError(null)
      const cid = model.metadataURI ? model.metadataURI.replace(/^ipfs:\/\//, '') : ''

      if (cid) {
        try {
          const fetched = await fetchManifest(cid)
          if (isMounted) {
            setManifest(fetched)
            return
          }
        } catch (err) {
          console.warn('Could not fetch manifest from IPFS:', err)
        }
      }

      // Strict Mode Governance (Spec 25): In testnet/mainnet, do NOT generate synthetic manifests
      if (!allowMockFallbacks()) {
        if (isMounted) {
          setManifest(null)
          setManifestError(
            'Model information is temporarily unavailable. Please try again in a moment.',
          )
        }
        return
      }

      // Demo Mode only: generate synthetic manifest for offline demonstration
      if (isMounted) {
        const chunkCount = model.chunkCount || 1
        const chunkSize = 1048576 // 1MB
        const syntheticManifest: ChunkManifest = {
          modelId: model.modelId,
          modelName: model.modelName || 'Model Weights',
          totalSize: model.totalSize || chunkCount * chunkSize,
          chunkSize,
          chunks: Array.from({ length: chunkCount }, (_, idx) => ({
            index: idx,
            hash: '',
            size: chunkSize,
          })),
          modelCard: `# ${model.modelName || 'Model'}\n\nThis model is shared directly between people on the Torrentia network.\n\n### Details\n- **Verified pieces**: ${chunkCount}\n- **Piece size**: 1 Megabyte\n- **Creator earnings**: ${Math.round(model.creatorShareBps / 100)}%\n- **Provider reward**: ${100 - Math.round(model.creatorShareBps / 100)}%`,
          createdAt: model.registeredAt,
        }
        setManifest(syntheticManifest)
      }
    }

    void loadManifest()

    return () => {
      isMounted = false
    }
  }, [model])

  // Loading State
  if (isModelLoading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-8)', width: '100%' }}>
        <Skeleton height="36px" width="160px" style={{ marginBottom: 'var(--space-6)' }} />
        <Skeleton height="140px" width="100%" style={{ marginBottom: 'var(--space-6)', borderRadius: 'var(--radius-lg)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <Skeleton height="280px" width="100%" style={{ borderRadius: 'var(--radius-lg)' }} />
            <Skeleton height="200px" width="100%" style={{ borderRadius: 'var(--radius-lg)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <Skeleton height="220px" width="100%" style={{ borderRadius: 'var(--radius-lg)' }} />
            <Skeleton height="220px" width="100%" style={{ borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      </div>
    )
  }

  // Not Found State
  if (!model || modelError) {
    return (
      <div style={{ maxWidth: '640px', margin: 'var(--space-12) auto', padding: 'var(--space-8)', width: '100%' }}>
        <Card glow={true}>
          <CardBody style={{ textAlign: 'center', padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <AlertCircle size={48} color="var(--color-warning)" />
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
              Model Not Found
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '400px' }}>
              We could not find an on-chain model registration with ID{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-bright)' }}>
                {id || 'unknown'}
              </code>
              . The model may not have been registered on Monad testnet or indexed yet.
            </p>
            <Link to="/marketplace">
              <Button variant="primary" leftIcon={<ArrowLeft size={16} />}>
                Return to Explore
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-8)', width: '100%' }}>
      {/* Back to Explore Link */}
      <Link
        to="/marketplace"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: 'var(--text-sm)',
          color: '#57534e',
          marginBottom: 'var(--space-6)',
          textDecoration: 'none',
          transition: 'color var(--transition-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#1c1917')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#57534e')}
      >
        <ArrowLeft size={16} />
        <span>Back to Explore</span>
      </Link>

      {/* Model Header with Orthogonal Statuses */}
      <ModelHeader
        model={model}
        manifest={manifest}
        seederCount={model.seederCount}
        isPaid={payments.length > 0}
        style={{ marginBottom: 'var(--space-6)' }}
      />

      {/* Manifest Unavailable Warning Banner (Spec 25) */}
      {manifestError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#b91c1c',
          }}
        >
          <FileQuestion size={20} />
          <div style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.4 }}>
            <strong>Model Passport Unavailable:</strong> {manifestError}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(320px, 1fr)',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* Main column: download and model information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Central Interactive Download Section */}
          <DownloadSection
            model={model}
            manifest={manifest}
          />

          {/* Model Passport / Architecture Documentation */}
          <ModelCardViewer
            content={manifest?.modelCard}
            modelName={model.modelName || 'Model Architecture'}
          />

          {/* Historical Payment Log */}
          <PaymentLog
            payments={payments}
            creatorShareBps={model.creatorShareBps}
          />
        </div>

        {/* Sidebar: file details and availability */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* File Specs & Revenue Grid */}
          <FileInfoPanel
            model={model}
            manifest={manifest}
          />

          {/* Live Swarm Peers Panel */}
          <SeederPanel
            modelId={model.modelId}
            totalChunks={manifest?.chunks.length ?? model.chunkCount ?? 1}
          />

          {/* Network information */}
          <div
            className="glass"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(28, 25, 23, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Zap size={16} color="var(--color-accent-bright)" />
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#1c1917' }}>
                Why this network works well
              </h4>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: '#57534e', lineHeight: 1.5 }}>
              Torrentia sends the model in small verified pieces so downloads can continue even when one provider disconnects.
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: '#57534e', lineHeight: 1.5 }}>
              Payments are automatically shared between the creator and the people helping provide the model.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '11px',
                color: 'var(--color-success)',
                fontWeight: 600,
                marginTop: '0.25rem',
              }}
            >
              <ShieldCheck size={13} />
              <span>Fast delivery • Verified pieces • Automatic payouts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
