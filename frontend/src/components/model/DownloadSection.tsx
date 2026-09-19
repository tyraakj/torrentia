import React, { useState, useEffect } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { formatEther } from 'viem'
import {
  DownloadCloud,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Zap,
  Wallet,
  Radio,
  AlertTriangle,
  Flame,
} from 'lucide-react'
import type { ChunkManifest, IndexedModel } from '../../lib/types'
import { useDownload, useSeeding } from '../../hooks/use-p2p'
import { getHeldChunks, getAllChunks } from '../../services/chunk-store'
import { downloadBlob } from '../../services/downloader'
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

  // Check how many chunks this browser already holds in IndexedDB
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

  // Total chunks
  const totalChunks = manifest?.chunks.length ?? model.chunkCount ?? 1
  const totalCostMon = formatEther(model.chunkPrice * BigInt(totalChunks))
  const isFullyDownloadedLocally = localHeldCount >= totalChunks && totalChunks > 0

  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.type === 'injected') || connectors[0]
    if (injected) connect({ connector: injected })
  }

  // Handle local export if chunks exist in IndexedDB even after refresh
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

  // Active status description
  const getStatusText = () => {
    switch (downloadState.status) {
      case 'discovering':
        return 'Discovering swarm seeders via Go WebSocket tracker...'
      case 'paying':
        return `Submitting atomic 70/30 split payment for Chunk ${downloadState.currentChunkIndex + 1} on Monad...`
      case 'downloading':
        return `Streaming 16 KB WebRTC binary frames for Chunk ${downloadState.currentChunkIndex + 1} of ${totalChunks}...`
      case 'verifying':
        return `Verifying SHA-256 content hash against IPFS manifest...`
      case 'reassembling':
        return `Reassembling ${totalChunks} verified chunks into local file...`
      case 'complete':
        return 'All chunks transferred, verified, and reassembled!'
      case 'error':
        return downloadState.error || 'Download interrupted.'
      default:
        return 'Ready to connect to Monad swarm.'
    }
  }

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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DownloadCloud size={20} color="var(--color-accent-bright)" />
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              P2P Swarm Download & Transfer
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  {totalChunks} chunks (1 MB ea)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#78716c' }}>Split Logic</div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-creator-share)' }}>
                  {Math.round(model.creatorShareBps / 100)}% Creator / {100 - Math.round(model.creatorShareBps / 100)}% Peer
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#78716c' }}>Local Cache</div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: isFullyDownloadedLocally ? 'var(--color-success)' : '#57534e' }}>
                  {checkingLocal ? 'Checking...' : `${localHeldCount}/${totalChunks} chunks held`}
                </div>
              </div>
            </div>

            {/* If user already holds all chunks in IndexedDB */}
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
                    Complete Model Already Cached in Your Browser!
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  You have all {totalChunks} verified chunks in your local IndexedDB. You can export the file to your computer or seed it to earn 30% per chunk request.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleExportLocalFile}
                    leftIcon={<HardDrive size={15} />}
                  >
                    Save Model File
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
              /* Normal Download Action */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {!isConnected ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleConnectWallet}
                    leftIcon={<Wallet size={18} />}
                    style={{ width: '100%' }}
                  >
                    Connect Wallet to Download ({parseFloat(totalCostMon).toFixed(6)} MON)
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => void startDownload()}
                    disabled={!manifest}
                    leftIcon={<DownloadCloud size={18} />}
                    style={{ width: '100%' }}
                  >
                    {manifest ? `Download from Swarm (${parseFloat(totalCostMon).toFixed(6)} MON)` : 'Loading Manifest...'}
                  </Button>
                )}

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Chunks stream over WebRTC data channels directly from peers. Each chunk payment triggers an atomic 70/30 split on Monad.
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
                  {getStatusText()}
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

        {/* 3. DOWNLOAD COMPLETE CELEBRATION */}
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
                  Download Complete & Verified!
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  All {totalChunks} chunks verified via SHA-256 hashes and saved to IndexedDB.
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
                Save File to Computer
              </Button>

              {/* SEEDER ORGANIC GROWTH TOGGLE */}
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
                  leftIcon={<Flame size={16} color="var(--color-warning)" />}
                >
                  Start Seeding to Swarm (+30% MON)
                </Button>
              )}
            </div>

            {isSeeding && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-success)',
                }}
              >
                <Radio size={14} />
                <span>You are actively seeding this model ({totalChunks}/{totalChunks} chunks) to the Monad swarm!</span>
              </div>
            )}
          </div>
        )}

        {/* 4. ERROR STATE */}
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
                {downloadState.error || 'Swarm download failed'}
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Make sure at least one peer is actively seeding this model on the configured Go signaling server.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void startDownload()}
              leftIcon={<RefreshCw size={14} />}
              style={{ alignSelf: 'flex-start' }}
            >
              Retry Download
            </Button>
          </div>
        )}
      </div>

      {/* HERO SECTION: ANIMATED SPLIT VISUALIZATION */}
      {/* Shows either the live chunk payment during download, or the cumulative summary upon completion, or the preview */}
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
