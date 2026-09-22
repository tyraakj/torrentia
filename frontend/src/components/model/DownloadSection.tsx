import React, { useState, useEffect } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { formatEther } from 'viem'
import {
  DownloadCloud,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Zap,
  Radio,
  AlertTriangle,
  Flame,
  Copy,
  Check,
  Terminal,
  Server,
} from 'lucide-react'
import type { ChunkManifest, IndexedModel } from '../../lib/types'
import { useDownload, useSeeding } from '../../hooks/use-p2p'
import { getHeldChunks, getAllChunks } from '../../services/chunk-store'
import { downloadBlob } from '../../services/downloader'
import { useDownloadStateMachine } from '../../hooks/use-download-state-machine'
import { SplitVisualization } from '../payment/SplitVisualization'
import { LivePaymentFeed } from '../payment/LivePaymentFeed'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

export interface DownloadSectionProps {
  model: IndexedModel
  manifest?: ChunkManifest | null
  className?: string
  style?: React.CSSProperties
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  model,
  manifest,
  style,
}) => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  // Local storage chunk awareness
  const [localHeldCount, setLocalHeldCount] = useState<number>(0)
  const [checkingLocal, setCheckingLocal] = useState(true)
  const [copiedCli, setCopiedCli] = useState(false)

  // Download & Seeding hooks
  const {
    downloadState,
    downloadedBlob,
    isDownloading,
    startDownload,
    cancelDownload,
    saveFile,
  } = useDownload(
    model.modelId,
    manifest || undefined,
    undefined,
    model.originalCreator,
    model.creatorShareBps
  )

  const {
    isSeeding,
    startSeeding,
    stopSeeding,
    refreshHeldChunks,
  } = useSeeding(
    model.modelId,
    address,
    model.chunkPrice.toString()
  )

  // Total pieces & cost
  const totalChunks = manifest?.chunks.length ?? model.chunkCount ?? 1
  const totalCostMon = formatEther(model.chunkPrice * BigInt(totalChunks))
  const isFullyDownloadedLocally = localHeldCount >= totalChunks && totalChunks > 0

  // Check how many pieces this browser already holds in IndexedDB
  useEffect(() => {
    let isMounted = true
    void getHeldChunks(model.modelId, address)
      .then((held) => {
        if (isMounted) {
          setLocalHeldCount(held.length)
          setCheckingLocal(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setLocalHeldCount(0)
          setCheckingLocal(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [model.modelId, address, downloadState.status])

  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.type === 'injected') || connectors[0]
    if (injected) connect({ connector: injected })
  }

  // Handle local export if pieces exist in IndexedDB
  const handleExportLocalFile = async () => {
    try {
      const chunks = await getAllChunks(model.modelId, totalChunks, address)
      const blob = new Blob(chunks, { type: 'application/octet-stream' })
      const fileName = manifest?.modelName ? `${manifest.modelName}.bin` : `${model.modelName || 'model'}.bin`
      downloadBlob(blob, fileName)
    } catch (err) {
      console.error('Failed to export local model chunks:', err)
    }
  }

  const handleCopyCli = () => {
    const cmd = `torrentia-seeder --model ${model.modelId}`
    navigator.clipboard.writeText(cmd)
    setCopiedCli(true)
    setTimeout(() => setCopiedCli(false), 2000)
  }

  // Initialize deterministic 10-state machine
  const { stateDetails, handlePrimaryAction } = useDownloadStateMachine({
    model,
    manifest,
    heldChunkCount: localHeldCount,
    downloadStatus: downloadState.status,
    downloadError: downloadState.error,
    activeTransport: downloadState.activeTransport,
    currentChunkIndex: downloadState.currentChunkIndex,
    totalChunks,
    isSeederOnline: model.seederCount > 0,
    onStartDownload: async () => {
      await startDownload()
    },
    onConnectWallet: handleConnectWallet,
    onExportLocalFile: handleExportLocalFile,
    onRetry: () => {
      void startDownload()
    },
  })

  // Latest payment event
  const latestPayment = downloadState.payments.length > 0 ? downloadState.payments[0] : undefined

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        ...style,
      }}
    >
      {/* Interactive Main Box */}
      <div
        className="glass"
        style={{
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          border: isDownloading ? '1px solid var(--color-accent)' : '1px solid var(--color-border-glass)',
          boxShadow: isDownloading ? 'var(--shadow-glow)' : 'var(--shadow-card)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header with status badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DownloadCloud size={20} color="var(--color-accent-bright)" />
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              P2P Swarm Download & Transfer
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Multi-Transport Badges */}
            {stateDetails.activeTransport === 'persistent_seeder' && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#2563eb',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)',
                }}
              >
                <Server size={12} />
                <span>Persistent Seeder Node (HTTP/QUIC)</span>
              </div>
            )}

            {stateDetails.activeTransport === 'browser_peer' && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: '#9333ea',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  boxShadow: '0 0 10px rgba(168, 85, 247, 0.2)',
                }}
              >
                <Radio size={12} />
                <span>Direct Browser Peer (WebRTC)</span>
              </div>
            )}

            {isDownloading && (
              <Badge variant="seeding" style={{ animation: 'pulseGlow 1.5s infinite' }}>
                <Zap size={11} /> Streaming Swarm
              </Badge>
            )}
            {downloadState.status === 'complete' && (
              <Badge variant="active">
                <CheckCircle2 size={11} /> 100% Downloaded
              </Badge>
            )}
            {isSeeding && (
              <Badge variant="seeding">
                <Flame size={11} /> Active Seeder (+30%)
              </Badge>
            )}
          </div>
        </div>

        {/* 1. IDLE / PRE-DOWNLOAD STATE */}
        {!isDownloading && downloadState.status !== 'complete' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Download Cost & Economics Summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid rgba(28, 25, 23, 0.08)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#78716c' }}>Required Cost</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-accent-bright)' }}>
                  {parseFloat(totalCostMon).toFixed(6)} MON
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#78716c' }}>Partition Size</div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: '#1c1917' }}>
                  {totalChunks} pieces (1 MB ea)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#78716c' }}>Creator Share (%)</div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-creator-share)' }}>
                  {Math.round(model.creatorShareBps / 100)}% Creator / {100 - Math.round(model.creatorShareBps / 100)}% Peer
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#78716c' }}>Local Model Storage</div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: isFullyDownloadedLocally ? 'var(--color-success)' : '#57534e' }}>
                  {checkingLocal ? 'Checking...' : `${localHeldCount}/${totalChunks} pieces held`}
                </div>
              </div>
            </div>

            {/* If user already holds all pieces in IndexedDB */}
            {isFullyDownloadedLocally ? (
              <div
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'hsla(155, 75%, 55%, 0.1)',
                  border: '1px solid var(--color-success)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)' }}>
                  <CheckCircle2 size={18} />
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                    Complete Model Verified in Local Model Storage!
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  You have all {totalChunks} verified pieces stored in your browser. You can export the file to your machine or seed it to earn 30% per piece requested by peers.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleExportLocalFile}
                    leftIcon={<HardDrive size={15} />}
                  >
                    Save Assembled Model (.bin)
                  </Button>

                  {isSeeding ? (
                    <Button variant="secondary" size="md" onClick={stopSeeding}>
                      Stop Seeding
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={async () => {
                        await startSeeding()
                        await refreshHeldChunks()
                      }}
                      leftIcon={<Flame size={15} color="var(--color-warning)" />}
                    >
                      Seed Model to Swarm (+30% MON)
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* State Machine Primary CTA */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePrimaryAction}
                  disabled={!manifest && isConnected}
                  leftIcon={stateDetails.recoveryAction ? <RefreshCw size={18} /> : <DownloadCloud size={18} />}
                  style={{ width: '100%' }}
                >
                  {stateDetails.recoveryAction
                    ? stateDetails.recoveryAction.label
                    : !isConnected
                    ? `Connect Wallet to Download (${parseFloat(totalCostMon).toFixed(6)} MON)`
                    : manifest
                    ? `Download from Swarm (${parseFloat(totalCostMon).toFixed(6)} MON)`
                    : 'Validating Model Passport...'}
                </Button>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Verified pieces stream over WebRTC data channels directly from peers. Each piece payment triggers an atomic 70/30 split on Monad.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. ACTIVE DOWNLOAD PROGRESS STATE */}
        {isDownloading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Progress Percentage & Bar */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.4rem',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {stateDetails.message}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent-bright)' }}>
                  {Math.round((downloadState.downloadedChunks / totalChunks) * 100)}% ({downloadState.downloadedChunks}/{totalChunks})
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: '10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(28, 25, 23, 0.08)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(4, (downloadState.downloadedChunks / totalChunks) * 100)}%`,
                    background: 'var(--gradient-accent)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 250ms ease-out',
                    boxShadow: '0 0 12px var(--color-accent-bright)',
                  }}
                />
              </div>
            </div>

            {/* Cancel Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={cancelDownload}>
                Cancel Download
              </Button>
            </div>
          </div>
        )}

        {/* 3. DOWNLOAD COMPLETE CELEBRATION & SEEDING GUIDANCE */}
        {downloadState.status === 'complete' && (
          <div
            style={{
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-md)',
              background: 'hsla(155, 75%, 55%, 0.1)',
              border: '1px solid var(--color-success)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)' }}>
              <CheckCircle2 size={24} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 'var(--text-lg)' }}>
                  Download Complete & Cryptographically Verified!
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  All {totalChunks} pieces verified via SHA-256 hashes against the Model Passport and saved locally.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="md"
                disabled={!downloadedBlob && localHeldCount < totalChunks}
                onClick={() => saveFile(manifest?.modelName ? `${manifest.modelName}.bin` : undefined)}
                leftIcon={<HardDrive size={16} />}
              >
                Save Assembled Model (.bin)
              </Button>

              {/* BROWSER SEEDING TOGGLE */}
              {isSeeding ? (
                <Button variant="secondary" size="md" onClick={stopSeeding}>
                  Stop Browser Seeding
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={async () => {
                    await startSeeding()
                    await refreshHeldChunks()
                  }}
                  leftIcon={<Flame size={16} color="var(--color-warning)" />}
                >
                  Keep Seeding in This Browser (+30% MON)
                </Button>
              )}
            </div>

            {/* PERSISTENT CLI SEEDER GUIDANCE */}
            <div
              style={{
                marginTop: 'var(--space-2)',
                padding: 'var(--space-3)',
                borderRadius: '8px',
                background: 'rgba(28, 25, 23, 0.05)',
                border: '1px solid rgba(28, 25, 23, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#44403c', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Terminal size={12} />
                  For 24/7 background seeding, run the Persistent CLI Seeder:
                </span>
                <button
                  type="button"
                  onClick={handleCopyCli}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: copiedCli ? '#10b981' : '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedCli ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCli ? 'Copied' : 'Copy'}
                </button>
              </div>

              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  background: '#1c1917',
                  color: '#a7f3d0',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  display: 'block',
                }}
              >
                torrentia-seeder --model {model.modelId}
              </code>
            </div>
          </div>
        )}

        {/* 4. ERROR STATE WITH DYNAMIC RECOVERY ACTION */}
        {downloadState.status === 'error' && (
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'hsla(0, 75%, 60%, 0.1)',
              border: '1px solid var(--color-error)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-error)' }}>
              <AlertTriangle size={18} />
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                {stateDetails.message}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrimaryAction}
                leftIcon={<RefreshCw size={14} />}
              >
                {stateDetails.recoveryAction ? stateDetails.recoveryAction.label : 'Retry Download'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* HERO SECTION: ANIMATED SPLIT VISUALIZATION */}
      <SplitVisualization
        creatorShareBps={model.creatorShareBps}
        creatorAddress={model.originalCreator}
        seederAddress={latestPayment?.seeder || '0x4382...seeder-peer'}
        chunkPriceWei={model.chunkPrice}
        txHash={latestPayment?.txHash}
        chunkIndex={downloadState.currentChunkIndex}
        totalChunks={totalChunks}
        isLive={isDownloading}
        isSummary={downloadState.status === 'complete'}
        totalPaidWei={downloadState.payments.reduce((acc, p) => acc + p.totalPaid, 0n)}
        totalCreatorEarnedWei={downloadState.payments.reduce((acc, p) => acc + p.creatorAmount, 0n)}
        totalSeederEarnedWei={downloadState.payments.reduce((acc, p) => acc + p.seederAmount, 0n)}
      />

      {/* REAL-TIME PAYMENT STREAM FEED */}
      {downloadState.payments.length > 0 && (
        <LivePaymentFeed
          payments={downloadState.payments}
          creatorShareBps={model.creatorShareBps}
        />
      )}
    </div>
  )
}
