import React from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useConnect } from 'wagmi'
import {
  Wallet,
  UploadCloud,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { useCreatorModels, useCreatorEarnings } from '../hooks/use-creator-data'
import { EarningsSummary } from '../components/dashboard/EarningsSummary'
import { CreatorModelCard } from '../components/dashboard/CreatorModelCard'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { AddressDisplay } from '../components/ui/AddressDisplay'

export const Dashboard: React.FC = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  const { data: models = [], isLoading, refetch } = useCreatorModels(address)
  const earningsSummary = useCreatorEarnings(models)

  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.type === 'injected') || connectors[0]
    if (injected) connect({ connector: injected })
  }

  // 1. WALLET DISCONNECTED STATE
  if (!isConnected || !address) {
    return (
      <div style={{ maxWidth: '700px', margin: 'var(--space-12) auto', padding: '0 var(--space-6)', width: '100%' }}>
        <Card glow={true}>
          <CardBody
            style={{
              padding: 'var(--space-12) var(--space-8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.15)',
              }}
            >
              <Wallet size={32} color="#7c3aed" />
            </div>

            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Connect Your Wallet
            </h1>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', maxWidth: '460px', lineHeight: 1.5 }}>
              Connect your Monad testnet wallet to view your registered AI models, track real-time 70% royalties, and monitor bandwidth peers.
            </p>

            <Button
              variant="primary"
              size="lg"
              onClick={handleConnectWallet}
              leftIcon={<Wallet size={18} />}
              style={{ marginTop: 'var(--space-2)' }}
            >
              Connect Wallet
            </Button>

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-6)',
                marginTop: 'var(--space-6)',
                paddingTop: 'var(--space-6)',
                borderTop: '1px solid var(--color-border-glass)',
                width: '100%',
                justifyContent: 'center',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Zap size={13} color="var(--color-accent)" />
                <span>Monad Testnet</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={13} color="var(--color-success)" />
                <span>Direct On-Chain Settlement</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  // 2. CONNECTED DASHBOARD
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-8)', width: '100%' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-2)' }}>
            <Sparkles size={16} color="var(--color-accent-bright)" />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-accent-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Creator Hub
            </span>
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Creator & Swarm Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            <span>Connected as:</span>
            <AddressDisplay address={address} chars={4} />
          </div>
        </div>

        <Link to="/upload">
          <Button variant="primary" size="md" leftIcon={<UploadCloud size={16} />}>
            Upload New Model
          </Button>
        </Link>
      </div>

      {/* Hero Royalty Summary */}
      <EarningsSummary summary={earningsSummary} style={{ marginBottom: 'var(--space-8)' }} />

      {/* Models Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--color-accent)" />
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            Your Published Models ({models.length})
          </h2>
        </div>

        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Indexed on Monad Swarm
        </span>
      </div>

      {/* Models Grid or Loading / Empty States */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} height="260px" style={{ borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardBody
            style={{
              padding: 'var(--space-12) var(--space-8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(28, 25, 23, 0.04)',
                border: '1px dashed rgba(28, 25, 23, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={28} color="#78716c" />
            </div>

            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              No Models Registered Under This Address
            </h3>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '420px', lineHeight: 1.5 }}>
              You haven't uploaded any models to Torrentia yet. Upload your first model to partition its weights, set your creator royalty percentage, and start earning on every swarm transfer.
            </p>

            <Link to="/upload">
              <Button variant="primary" size="md" leftIcon={<UploadCloud size={16} />}>
                Upload Your First Model
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {models.map((model) => (
            <CreatorModelCard
              key={model.modelId}
              model={model}
              onDeactivated={() => void refetch()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
