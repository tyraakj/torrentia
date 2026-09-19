import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Zap, ShieldCheck } from 'lucide-react'
import { useModel, useModelPayments } from '../hooks/use-models'
import { fetchManifest } from '../services/ipfs'
import type { ChunkManifest } from '../lib/types'
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

  // Fetch Manifest from IPFS or generate fallback
  useEffect(() => {
    let isMounted = true
    if (!model) return

    const loadManifest = async () => {
      const cid = model.metadataURI ? model.metadataURI.replace(/^ipfs:\/\//, '') : ''

      if (cid) {
        try {
          const fetched = await fetchManifest(cid)
          if (isMounted) {
            setManifest(fetched)
            return
          }
        } catch (err) {
          console.warn('Could not fetch manifest from IPFS, generating fallback from indexed metadata:', err)
        }
      }

      // Generate robust fallback manifest based on model metadata so download flow remains fully functional
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
          modelCard: `# ${model.modelName || 'Model'}\n\nThis open-source model is distributed peer-to-peer on the Torrentia swarm on Monad.\n\n### Specifications\n- **Chunk Count**: ${chunkCount} chunks\n- **Partition Size**: 1 Megabyte per chunk\n- **Settlement Protocol**: Monad EVM Testnet (SplitPayment.sol)\n- **Creator Split**: ${Math.round(model.creatorShareBps / 100)}% Creator Royalty / ${100 - Math.round(model.creatorShareBps / 100)}% Seeder Incentive`,
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
            <Link to="/">
              <Button variant="primary" leftIcon={<ArrowLeft size={16} />}>
                Return to Marketplace
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-8)', width: '100%' }}>
      {/* Back to Home Link */}
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: 'var(--text-sm)',
          color: '#57534e',
          marginBottom: 'var(--space-6)',
          transition: 'color var(--transition-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#1c1917')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#57534e')}
      >
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </Link>

      {/* Model Header */}
      <ModelHeader model={model} style={{ marginBottom: 'var(--space-6)' }} />

      {/* Main Two-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(320px, 1fr)',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* Left / Main Column: Download, Split Hero, Documentation & Payment History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Central Interactive Download Section (Contains SplitVisualization & LivePaymentFeed) */}
          <DownloadSection
            model={model}
            manifest={manifest}
          />

          {/* Model Card / Documentation */}
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

        {/* Right Sidebar: Specs, Swarm Peers, Monad Economics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* File Specs & Revenue Grid */}
          <FileInfoPanel
            model={model}
            manifest={manifest}
          />

          {/* Live Swarm Seeders Panel */}
          <SeederPanel
            modelId={model.modelId}
            totalChunks={manifest?.chunks.length ?? model.chunkCount ?? 1}
          />

          {/* Monad Value-Add Card */}
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
                Why Monad is Essential Here
              </h4>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: '#57534e', lineHeight: 1.5 }}>
              On Ethereum L1, settling {manifest?.chunks.length || model.chunkCount} sequential chunk payments would take <strong>{(manifest?.chunks.length || model.chunkCount) * 12} seconds</strong> and freeze the download stream.
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: '#57534e', lineHeight: 1.5 }}>
              On Monad, <strong>400ms block times</strong> and <strong>sub-cent gas fees</strong> allow atomic 70/30 creator/seeder settlement per chunk in real time with zero buffering.
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
              <span>400ms Blocks • 10,000 TPS • Atomic Split</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
