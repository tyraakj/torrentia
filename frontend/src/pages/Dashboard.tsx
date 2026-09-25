import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAccount, useConnect } from 'wagmi'
import {
  Wallet,
  UploadCloud,
  ShieldCheck,
  Radio,
  Fingerprint,
  Key,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Users,
  HardDrive,
  Cpu,
  Lock,
  Layers,
  FileCheck2,
} from 'lucide-react'
import { useCreatorModels, useCreatorEarnings } from '../hooks/use-creator-data'
import { CreatorModelCard } from '../components/dashboard/CreatorModelCard'
import type { DashboardTabKey } from '../components/dashboard/DashboardStage'
import { PasskeyAuthModal } from '../components/auth/PasskeyAuthModal'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { AddressDisplay } from '../components/ui/AddressDisplay'
import '../styles/dashboard.css'

export const Dashboard: React.FC = () => {
  const [searchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') as DashboardTabKey | null
  const currentTab: DashboardTabKey =
    rawTab && ['splits', 'mesh', 'batch', 'integrity'].includes(rawTab)
      ? rawTab
      : 'splits'

  const { address, isConnected, connector } = useAccount()
  const { connect, connectors } = useConnect()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const { data: models = [], refetch } = useCreatorModels(address)
  const earningsSummary = useCreatorEarnings(models)

  const isPasskey = connector?.id === 'mera-passkey'

  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.type === 'injected') || connectors[0]
    if (injected) {
      connect({ connector: injected })
    }
  }

  // 1. WALLET DISCONNECTED STATE (Dual Option Architecture)
  if (!isConnected || !address) {
    return (
      <div className="dashboard-full-viewport">
        <div className="dashboard-connect-hero">
          <div className="dashboard-connect-pill">
            <Radio size={13} />
            <span>Authentication • Monad Testnet</span>
          </div>

          <h1 className="dashboard-connect-title">
            Connect to Creator Hub
          </h1>

          <p className="dashboard-connect-lead">
            Select your preferred authentication method to view your registered AI models, track real-time creator royalties, and monitor community downloads across the network.
          </p>

          <div className="connect-options-grid">
            {/* Option 1: Mera Logic Passkey */}
            <div className="connect-option-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div className="connect-card-icon icon-mera">
                    <Fingerprint size={26} />
                  </div>
                  <span className="connect-option-badge badge-mera">
                    Mera Logic • Recommended
                  </span>
                </div>

                <div className="connect-card-name">Passkey (Mera Logic)</div>
                <div className="connect-card-desc">
                  Hardware-backed biometric authentication via Touch ID, Face ID, or Windows Hello. Derives a secure Monad EOA key with zero extensions or seed phrases.
                </div>

                <ul className="connect-card-perks">
                  <li className="connect-card-perk">
                    <CheckCircle2 size={15} color="#10B981" />
                    <span>Instant 1-click biometric sign-in</span>
                  </li>
                  <li className="connect-card-perk">
                    <CheckCircle2 size={15} color="#10B981" />
                    <span>WebAuthn PRF deterministic key derivation</span>
                  </li>
                  <li className="connect-card-perk">
                    <CheckCircle2 size={15} color="#10B981" />
                    <span>Zero-prompt EIP-712 micro-voucher streaming</span>
                  </li>
                  <li className="connect-card-perk">
                    <CheckCircle2 size={15} color="#10B981" />
                    <span>Self-sovereign seed &amp; private key export</span>
                  </li>
                </ul>
              </div>

              <button
                className="connect-cta-btn btn-mera"
                onClick={() => setAuthModalOpen(true)}
              >
                <Key size={16} />
                <span>Connect with Passkey</span>
              </button>
            </div>

            {/* Option 2: Web3 Wallets */}
            <div className="connect-option-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div className="connect-card-icon icon-wallet">
                    <Wallet size={26} />
                  </div>
                  <span className="connect-option-badge badge-wallet">
                    Browser Extensions
                  </span>
                </div>

                <div className="connect-card-name">Web3 Wallets</div>
                <div className="connect-card-desc">
                  Connect your existing Web3 browser wallet on Monad Testnet. Full support for MetaMask, Rabby, Coinbase Wallet, Backpack, and EIP-1193 injectors.
                </div>

                <ul className="connect-card-perks">
                  <li className="connect-card-perk">
                    <CheckCircle2 size={15} color="#7C3AED" />
                    <span>Standard EIP-1193 injected browser support</span>
                  </li>
                  <li className="connect-card-perk">
                    <CheckCircle2 size={15} color="#7C3AED" />
                    <span>Supports MetaMask, Rabby, Backpack &amp; Coinbase</span>
                  </li>
                  <li className="connect-card-perk">
                    <CheckCircle2 size={15} color="#7C3AED" />
                    <span>Direct connection to Monad Testnet (Chain ID 10143)</span>
                  </li>
                  <li className="connect-card-perk">
                    <CheckCircle2 size={15} color="#7C3AED" />
                    <span>Full manual transaction signing &amp; custody</span>
                  </li>
                </ul>
              </div>

              <button
                className="connect-cta-btn btn-wallet"
                onClick={handleConnectWallet}
              >
                <Wallet size={16} />
                <span>Connect Web3 Wallet</span>
              </button>
            </div>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="dashboard-connect-trust">
            <div className="trust-item">
              <Radio size={14} color="#0062FF" />
              <span>Monad Testnet (Chain ID 10143)</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={14} color="#10B981" />
              <span>Direct Atomic Settlement (SplitPayment.sol)</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={14} color="#10B981" />
              <span>Zero Cloud Storage Fees</span>
            </div>
          </div>
        </div>

        <PasskeyAuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    )
  }

  const tabMeta: Record<
    DashboardTabKey,
    {
      title: string
      subtitle: string
      badge: string
      badgeIcon: React.ReactNode
      metrics: Array<{
        label: string
        tag?: string
        tagClass?: string
        val: string
        unit?: string
        sub: string
        icon?: React.ReactNode
      }>
    }
  > = {
    splits: {
      title: 'Creator Splits & Settlements',
      subtitle: 'Direct atomic royalties programmed into ModelRegistry with zero platform take on Monad Testnet.',
      badge: 'SplitPayment.sol • Direct EOA',
      badgeIcon: <Layers size={13} />,
      metrics: [
        {
          label: 'Total Royalties Earned',
          tag: 'Direct EOA',
          tagClass: 'pill-green',
          val: earningsSummary.totalEarningsMon,
          unit: 'MON',
          sub: 'Direct to your wallet per chunk split',
        },
        {
          label: 'Cloud Egress Costs',
          tag: '100% P2P',
          tagClass: 'pill-blue',
          val: '$0.00',
          unit: 'Saved',
          sub: 'Zero AWS S3 cloud egress or bandwidth bills',
        },
        {
          label: 'Community Downloads',
          val: String(earningsSummary.totalDownloads),
          sub: 'Direct browser & CLI streams settled',
          icon: <TrendingUp size={16} color="#059669" />,
        },
        {
          label: 'Active Community Nodes',
          val: String(earningsSummary.totalActiveSeeders),
          sub: 'Community nodes sharing your model chunks',
          icon: <Users size={16} color="#0062FF" />,
        },
      ],
    },
    mesh: {
      title: 'Community Network & Direct Sharing',
      subtitle: 'Real-time WebRTC peer mesh, active node discovery, and multi-device chunk distribution.',
      badge: 'WebRTC Mesh • Signaling Hub',
      badgeIcon: <Radio size={13} />,
      metrics: [
        {
          label: 'Active Community Nodes',
          tag: 'Online',
          tagClass: 'pill-green',
          val: String(earningsSummary.totalActiveSeeders),
          unit: 'Nodes',
          sub: 'Browser peers and persistent CLI daemons',
        },
        {
          label: 'Direct DataChannels',
          tag: '100% P2P',
          tagClass: 'pill-blue',
          val: 'WebRTC',
          sub: 'Device-to-device streaming via RTCDataChannel',
          icon: <Cpu size={16} color="#0062FF" />,
        },
        {
          label: 'Bandwidth Egress Costs',
          tag: '0 Middlemen',
          tagClass: 'pill-green',
          val: '$0.00',
          unit: 'Billed',
          sub: 'Distributed mesh absorbs transfer load',
        },
        {
          label: 'Signaling Protocol',
          val: 'torrentia/1.0',
          sub: 'Ultra-low latency Go broker signaling',
          icon: <Radio size={16} color="#0062FF" />,
        },
      ],
    },
    batch: {
      title: 'Batched Settlements & Payment Channels',
      subtitle: 'Off-chain voucher buffering and batched Monad execution via SplitPaymentV2.',
      badge: 'SplitPaymentV2 • EIP-712',
      badgeIcon: <Lock size={13} />,
      metrics: [
        {
          label: 'Batch Buffer Threshold',
          tag: 'V2 Buffer',
          tagClass: 'pill-blue',
          val: '50',
          unit: 'Chunks',
          sub: 'Accumulates micro-vouchers before on-chain commit',
        },
        {
          label: 'Monad Gas Savings',
          tag: 'Optimal',
          tagClass: 'pill-green',
          val: '98.2%',
          unit: 'Saved',
          sub: '1 batched settlement tx vs 50 individual calls',
        },
        {
          label: 'Voucher Signing Overhead',
          tag: 'Off-Chain',
          tagClass: 'pill-blue',
          val: '0 Gas',
          sub: 'Off-chain EIP-712 cryptographic authorization',
          icon: <CheckCircle2 size={16} color="#059669" />,
        },
        {
          label: 'Settlement Contract',
          val: '0xe2aD...5ECe',
          sub: 'SplitPaymentV2 deployed on Monad Testnet',
          icon: <ShieldCheck size={16} color="#0062FF" />,
        },
      ],
    },
    integrity: {
      title: 'SHA-256 Piece Verification',
      subtitle: 'Cryptographic piece-by-piece SHA-256 verification against creator upload manifests before disk persistence.',
      badge: 'Merkle Integrity • IPFS',
      badgeIcon: <ShieldCheck size={13} />,
      metrics: [
        {
          label: 'Verification Standard',
          tag: 'Cryptographic',
          tagClass: 'pill-green',
          val: 'SHA-256',
          sub: 'Every piece hashed and verified independently',
          icon: <FileCheck2 size={16} color="#059669" />,
        },
        {
          label: 'Chunk Slice Granularity',
          tag: 'Fixed Size',
          tagClass: 'pill-blue',
          val: '1',
          unit: 'MB',
          sub: 'Optimal chunk size for peer transfer & verification',
        },
        {
          label: 'Tamper Resistance',
          tag: 'Enforced',
          tagClass: 'pill-green',
          val: '100%',
          sub: 'Invalid or corrupt slices discarded before write',
        },
        {
          label: 'Local Persistence Engine',
          val: 'IndexedDB',
          sub: 'Zero-cloud local slice cache in browser',
          icon: <HardDrive size={16} color="#0062FF" />,
        },
      ],
    },
  }

  const currentMeta = tabMeta[currentTab] || tabMeta.splits

  // 2. CONNECTED DASHBOARD (Full-Screen Dynamic Showcase)
  return (
    <div className="dashboard-full-viewport">
      {/* Top Header */}
      <div className="dashboard-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: isPasskey ? '#059669' : '#0062FF',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: isPasskey ? '#ECFDF5' : '#EFF6FF',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                border: isPasskey ? '1px solid #A7F3D0' : '1px solid #BFDBFE',
              }}
            >
              {isPasskey ? <Fingerprint size={13} /> : <Wallet size={13} />}
              <span>{isPasskey ? 'Mera Passkey Active' : 'Web3 Wallet Connected'}</span>
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#57534E',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: '#F5F5F4',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid #E7E5E4',
              }}
            >
              {currentMeta.badgeIcon}
              <span>{currentMeta.badge}</span>
            </span>
          </div>

          <h1 className="dashboard-title">
            {currentMeta.title}
          </h1>

          <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.875rem', color: '#78716C', maxWidth: '700px' }}>
            {currentMeta.subtitle}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#57534E' }}>
            <span>Settlement address:</span>
            <AddressDisplay address={address} chars={5} />
            <a
              href={`https://testnet.monadscan.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0062FF', display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '0.25rem' }}
              title="View on Monadscan Explorer"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        <Link to="/upload">
          <Button variant="primary" size="md" leftIcon={<UploadCloud size={16} />}>
            Upload New Model
          </Button>
        </Link>
      </div>

      {/* 4-Metric Overview Strip (Dynamically Tailored to Active Tab) */}
      <div className="dashboard-metrics-grid">
        {currentMeta.metrics.map((m, idx) => (
          <div key={idx} className="dashboard-metric-card">
            <div className="metric-top-label">
              <span>{m.label}</span>
              {m.tag && <span className={`metric-pill-tag ${m.tagClass || 'pill-blue'}`}>{m.tag}</span>}
              {m.icon && m.icon}
            </div>
            <div className="metric-number-row">
              <span className="metric-big-number">{m.val}</span>
              {m.unit && (
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: m.tagClass === 'pill-green' ? '#059669' : '#0062FF', marginLeft: '0.25rem' }}>
                  {m.unit}
                </span>
              )}
            </div>
            <div className="metric-subtext">{m.sub}</div>
          </div>
        ))}
      </div>


      {/* Published Models Section */}
      {models.length > 0 ? (
        <div className="dashboard-models-section">
          <div className="models-section-header">
            <h2 className="models-section-title">
              <HardDrive size={20} color="#0062FF" />
              <span>Your Registered Models ({models.length})</span>
            </h2>

            <span style={{ fontSize: '0.75rem', color: '#78716C', fontWeight: 600 }}>
              Indexed on Monad Testnet (Chain ID 10143)
            </span>
          </div>

          <div className="models-grid-layout">
            {models.map((model) => (
              <CreatorModelCard
                key={model.modelId}
                model={model}
                onDeactivated={() => void refetch()}
              />
            ))}
          </div>
        </div>
      ) : currentTab === 'splits' ? (
        <div className="dashboard-models-section">
          <div className="models-section-header">
            <h2 className="models-section-title">
              <HardDrive size={20} color="#0062FF" />
              <span>Your Registered Models (0)</span>
            </h2>

            <span style={{ fontSize: '0.75rem', color: '#78716C', fontWeight: 600 }}>
              Indexed on Monad Testnet (Chain ID 10143)
            </span>
          </div>

          <Card>
            <CardBody
              style={{
                padding: '3rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(28, 25, 23, 0.04)',
                  border: '1px dashed rgba(28, 25, 23, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UploadCloud size={28} color="#78716C" />
              </div>

              <h3 style={{ fontFamily: "'Apfel Grotezk', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#181615' }}>
                No Models Registered Under This Address
              </h3>

              <p style={{ color: '#57534E', fontSize: '0.875rem', maxWidth: '440px', lineHeight: 1.55 }}>
                You haven't published any models on Torrentia yet. Upload your first model to set your custom creator royalty percentage and start earning automatically on every download.
              </p>

              <Link to="/upload" style={{ marginTop: '0.5rem' }}>
                <Button variant="primary" size="md" leftIcon={<UploadCloud size={16} />}>
                  Upload Your First Model
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      ) : (
        <div style={{ marginTop: '2rem', padding: '1.25rem 1.5rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(28, 25, 23, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={18} color="#0062FF" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#181615' }}>Publish AI Models with On-Chain Royalties</div>
              <div style={{ fontSize: '0.78125rem', color: '#78716C' }}>Upload model weights to distribute slices across the community network and receive direct per-chunk payouts.</div>
            </div>
          </div>
          <Link to="/upload">
            <Button variant="secondary" size="sm" leftIcon={<UploadCloud size={14} />}>
              Upload Model
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
