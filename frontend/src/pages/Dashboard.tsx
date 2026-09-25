import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useConnect } from 'wagmi'
import {
  Wallet,
  UploadCloud,
  Zap,
  ShieldCheck,
  Radio,
  Fingerprint,
  Key,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Users,
  HardDrive,
  MousePointer2,
} from 'lucide-react'
import { useCreatorModels, useCreatorEarnings } from '../hooks/use-creator-data'
import { CreatorModelCard } from '../components/dashboard/CreatorModelCard'
import { PasskeyAuthModal } from '../components/auth/PasskeyAuthModal'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { AddressDisplay } from '../components/ui/AddressDisplay'
import '../styles/dashboard.css'

export const Dashboard: React.FC = () => {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors } = useConnect()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const { data: models = [], isLoading, refetch } = useCreatorModels(address)
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
            Select your preferred authentication method to view your registered AI models, track real-time creator royalties, and monitor community downloads across the swarm.
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
              <Zap size={14} color="#F59E0B" />
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

  // 2. CONNECTED DASHBOARD (Full-Screen Sky-Ice Showcase)
  return (
    <div className="dashboard-full-viewport">
      {/* Top Header */}
      <div className="dashboard-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
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
          </div>
          <h1 className="dashboard-title">
            Creator Hub &amp; Community Activity
          </h1>
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

      {/* 4-Metric Overview Strip */}
      <div className="dashboard-metrics-grid">
        <div className="dashboard-metric-card">
          <div className="metric-top-label">
            <span>Total Royalties Earned</span>
            <span className="metric-pill-tag pill-green">Direct EOA</span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{earningsSummary.totalEarningsMon}</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>MON</span>
          </div>
          <div className="metric-subtext">Direct to your wallet per chunk split</div>
        </div>

        <div className="dashboard-metric-card">
          <div className="metric-top-label">
            <span>Cloud Egress Costs</span>
            <span className="metric-pill-tag pill-blue">100% P2P</span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">$0.00</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0062FF' }}>Saved</span>
          </div>
          <div className="metric-subtext">Zero AWS S3 cloud egress or bandwidth bills</div>
        </div>

        <div className="dashboard-metric-card">
          <div className="metric-top-label">
            <span>Community Downloads</span>
            <TrendingUp size={16} color="#059669" />
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{earningsSummary.totalDownloads}</span>
          </div>
          <div className="metric-subtext">Direct browser &amp; CLI streams settled</div>
        </div>

        <div className="dashboard-metric-card">
          <div className="metric-top-label">
            <span>Active Swarm Hosts</span>
            <Users size={16} color="#0062FF" />
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{earningsSummary.totalActiveSeeders}</span>
          </div>
          <div className="metric-subtext">Community nodes sharing your model chunks</div>
        </div>
      </div>

      {/* Sky-Ice Showcase Stage (Matches Features Section) */}
      <div className="dashboard-sky-stage">
        <div className="dashboard-sky-grid" />

        <div className="dashboard-stage-header">
          <div className="live-pulse-badge">
            <span className="pulse-dot" />
            <span>LIVE ON-CHAIN SETTLEMENTS • 1-SEC MONAD FINALITY</span>
          </div>

          <div className="stage-instant-pill">
            <ShieldCheck size={14} />
            <span>Instant Payouts &amp; Zero Cloud Intermediaries</span>
          </div>
        </div>

        {/* Two-Column Stage: Table + Donut Card */}
        <div className="dashboard-stage-body">
          {/* Main Settlement Ledger Table */}
          <div className="dashboard-table-card">
            <div className="dashboard-table-head">
              <span>Model File</span>
              <span>Community Host</span>
              <span>Your Split</span>
              <span className="head-hide-mobile">Settlement</span>
              <span className="head-hide-mobile">Status</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="dashboard-table-row">
                <span className="td-file-cell">
                  <span className="chunk-badge">01</span>
                  <span className="file-name">Llama-3-8B.bin</span>
                </span>
                <span>
                  <a
                    href="https://testnet.monadscan.com/address/0x72a9e3b4a2d8c1e41b"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="host-link"
                  >
                    0x72a9...e41b
                  </a>
                </span>
                <span className="split-amount">+0.085 MON</span>
                <span className="speed-tag head-hide-mobile">0.8s on Monad</span>
                <span className="head-hide-mobile">
                  <span className="status-badge-settled">
                    <ShieldCheck size={11} />
                    <span>Settled</span>
                  </span>
                </span>
              </div>

              <div className="dashboard-table-row">
                <span className="td-file-cell">
                  <span className="chunk-badge">02</span>
                  <span className="file-name">Mistral-7B.bin</span>
                </span>
                <span>
                  <a
                    href="https://testnet.monadscan.com/address/0x38fe76d1e4a99921"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="host-link"
                  >
                    0x38fe...9921
                  </a>
                </span>
                <span className="split-amount">+0.085 MON</span>
                <span className="speed-tag head-hide-mobile">1.2s on Monad</span>
                <span className="head-hide-mobile">
                  <span className="status-badge-settled">
                    <ShieldCheck size={11} />
                    <span>Settled</span>
                  </span>
                </span>
              </div>

              <div className="dashboard-table-row">
                <span className="td-file-cell">
                  <span className="chunk-badge">03</span>
                  <span className="file-name">Phi-3-Mini.bin</span>
                </span>
                <span>
                  <a
                    href="https://testnet.monadscan.com/address/0x91d4e782f9aa02"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="host-link"
                  >
                    0x91d4...aa02
                  </a>
                </span>
                <span className="split-amount">+0.085 MON</span>
                <span className="speed-tag head-hide-mobile">1.9s on Monad</span>
                <span className="head-hide-mobile">
                  <span className="status-badge-settled">
                    <ShieldCheck size={11} />
                    <span>Settled</span>
                  </span>
                </span>
              </div>

              <div className="dashboard-table-row">
                <span className="td-file-cell">
                  <span className="chunk-badge">04</span>
                  <span className="file-name">Gemma-2-9B.bin</span>
                </span>
                <span>
                  <a
                    href="https://testnet.monadscan.com/address/0x15bc821e4f301f"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="host-link"
                  >
                    0x15bc...301f
                  </a>
                </span>
                <span className="split-amount">+0.085 MON</span>
                <span className="speed-tag head-hide-mobile">2.4s on Monad</span>
                <span className="head-hide-mobile">
                  <span className="status-badge-settled">
                    <ShieldCheck size={11} />
                    <span>Settled</span>
                  </span>
                </span>
              </div>

              <div className="dashboard-table-row">
                <span className="td-file-cell">
                  <span className="chunk-badge">05</span>
                  <span className="file-name">Qwen-2.5-7B.bin</span>
                </span>
                <span>
                  <a
                    href="https://testnet.monadscan.com/address/0x88f29c4e10ce"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="host-link"
                  >
                    0x88f2...10ce
                  </a>
                </span>
                <span className="split-amount">+0.085 MON</span>
                <span className="speed-tag head-hide-mobile">3.1s on Monad</span>
                <span className="head-hide-mobile">
                  <span className="status-badge-settled">
                    <ShieldCheck size={11} />
                    <span>Settled</span>
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Donut Royalty Breakdown Card */}
          <div className="dashboard-donut-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div className="donut-card-title">Royalty Distribution</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', background: '#EFF6FF', color: '#0062FF', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                  <MousePointer2 size={11} />
                  <span>You (Creator)</span>
                </div>
              </div>

              <div className="donut-chart-row">
                <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" stroke="#E2E8F0" strokeWidth="9" fill="none" />
                    {/* 85% Creator Stroke */}
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#0062FF"
                      strokeWidth="9"
                      strokeDasharray="201.06"
                      strokeDashoffset="30.15"
                      strokeLinecap="round"
                      fill="none"
                      transform="rotate(-90 40 40)"
                    />
                    {/* 15% Host Stroke */}
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#10B981"
                      strokeWidth="9"
                      strokeDasharray="201.06"
                      strokeDashoffset="170.9"
                      strokeLinecap="round"
                      fill="none"
                      transform="rotate(216 40 40)"
                    />
                    <text
                      x="40"
                      y="45"
                      textAnchor="middle"
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="14"
                      fontWeight="700"
                      fill="#0062FF"
                    >
                      85%
                    </text>
                  </svg>
                </div>

                <div className="donut-legend-wrap" style={{ flex: 1 }}>
                  <div className="legend-item-row">
                    <span className="legend-dot-label">
                      <span className="legend-color-dot dot-creator-blue" />
                      <span>Creator</span>
                    </span>
                    <span className="legend-share-pct" style={{ color: '#0062FF' }}>85%</span>
                  </div>

                  <div className="legend-item-row">
                    <span className="legend-dot-label">
                      <span className="legend-color-dot dot-hosts-green" />
                      <span>Community Hosts</span>
                    </span>
                    <span className="legend-share-pct" style={{ color: '#10B981' }}>15%</span>
                  </div>

                  <div className="legend-item-row">
                    <span className="legend-dot-label">
                      <span className="legend-color-dot dot-cloud-gray" />
                      <span>Middlemen</span>
                    </span>
                    <span className="legend-share-pct" style={{ color: '#64748B' }}>0%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="donut-footer-callout">
              <strong>Atomic Smart Contract Split:</strong> Every download stream splits native MON directly into your address with zero platform fees or custody delays.
            </div>
          </div>
        </div>
      </div>

      {/* Published Models Section */}
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

        {isLoading ? (
          <div className="models-grid-layout">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} height="260px" style={{ borderRadius: '18px' }} />
            ))}
          </div>
        ) : models.length === 0 ? (
          <Card>
            <CardBody
              style={{
                padding: '3.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(28, 25, 23, 0.04)',
                  border: '1px dashed rgba(28, 25, 23, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UploadCloud size={30} color="#78716C" />
              </div>

              <h3 style={{ fontFamily: "'Apfel Grotezk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#181615' }}>
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
        ) : (
          <div className="models-grid-layout">
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
    </div>
  )
}
