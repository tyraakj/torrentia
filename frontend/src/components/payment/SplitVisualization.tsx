import React, { useEffect, useState, useRef } from 'react'
import { formatEther } from 'viem'
import { Sparkles, ArrowRight, Volume2, VolumeX, ShieldCheck, Cpu } from 'lucide-react'
import { TransactionLink } from './TransactionLink'
import { truncateAddress } from '../../lib/utils'

export interface SplitVisualizationProps {
  creatorShareBps: number
  creatorAddress: string
  seederAddress?: string
  chunkPriceWei?: bigint | string
  txHash?: string
  chunkIndex?: number
  totalChunks?: number
  isLive?: boolean
  isSummary?: boolean
  totalCreatorEarnedWei?: bigint
  totalSeederEarnedWei?: bigint
  totalPaidWei?: bigint
  className?: string
  style?: React.CSSProperties
}

/**
 * Self-contained audio ping using Web Audio API oscillator.
 * Avoids any external audio asset dependency.
 */
function playPaymentPing() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    // Crisp ascending micro-chime
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  } catch {
    // Web Audio blocked or not permitted
  }
}

export const SplitVisualization: React.FC<SplitVisualizationProps> = ({
  creatorShareBps,
  creatorAddress,
  seederAddress = '0x1234...swarm-peer',
  chunkPriceWei = 100000000000000n, // 0.0001 MON default
  txHash,
  chunkIndex,
  totalChunks,
  isLive = false,
  isSummary = false,
  totalCreatorEarnedWei,
  totalSeederEarnedWei,
  totalPaidWei,
  style,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [pulseActive, setPulseActive] = useState(false)
  const prevTxRef = useRef<string | undefined>(undefined)

  const creatorPercent = Math.round(creatorShareBps / 100)
  const seederPercent = 100 - creatorPercent

  // Calculate MON values
  const priceWei = typeof chunkPriceWei === 'string' ? BigInt(chunkPriceWei) : chunkPriceWei
  const effectiveTotalWei = isSummary && totalPaidWei !== undefined ? totalPaidWei : priceWei
  const effectiveCreatorWei = isSummary && totalCreatorEarnedWei !== undefined
    ? totalCreatorEarnedWei
    : (priceWei * BigInt(creatorShareBps)) / 10000n
  const effectiveSeederWei = isSummary && totalSeederEarnedWei !== undefined
    ? totalSeederEarnedWei
    : effectiveTotalWei - effectiveCreatorWei

  const totalMon = formatEther(effectiveTotalWei)
  const creatorMon = formatEther(effectiveCreatorWei)
  const seederMon = formatEther(effectiveSeederWei)

  // Trigger pulse animation and chime on new transaction
  useEffect(() => {
    if (txHash && txHash !== prevTxRef.current) {
      prevTxRef.current = txHash
      setPulseActive(true)
      if (soundEnabled && isLive) {
        playPaymentPing()
      }
      const timer = setTimeout(() => setPulseActive(false), 900)
      return () => clearTimeout(timer)
    }
  }, [txHash, soundEnabled, isLive])

  return (
    <div
      className="glass"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        position: 'relative',
        overflow: 'hidden',
        border: pulseActive
          ? '1px solid var(--color-accent)'
          : '1px solid var(--color-border-glass)',
        boxShadow: pulseActive
          ? '0 0 32px hsla(265, 90%, 65%, 0.35), 0 8px 32px rgba(0,0,0,0.6)'
          : 'var(--shadow-card)',
        transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: '20%',
          width: '60%',
          height: '100%',
          background: 'radial-gradient(ellipse at center, hsla(265, 90%, 65%, 0.12), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-full)',
              background: isLive ? 'hsla(155, 75%, 55%, 0.15)' : 'hsla(265, 90%, 65%, 0.15)',
              border: `1px solid ${isLive ? 'var(--color-success)' : 'var(--color-accent)'}`,
            }}
          >
            {isLive ? (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--color-success)',
                  boxShadow: '0 0 8px var(--color-success)',
                  display: 'inline-block',
                }}
              />
            ) : (
              <Cpu size={13} color="var(--color-accent-bright)" />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isLive ? 'var(--color-success)' : 'var(--color-accent-bright)',
              }}
            >
              {isSummary
                ? 'Monad Cumulative Settlement Summary'
                : isLive
                ? `Streaming Chunk ${chunkIndex !== undefined ? chunkIndex + 1 : 1} of ${totalChunks || 1} • Atomic Split`
                : 'Atomic On-Chain Revenue Split (SplitPayment.sol)'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              1 Transaction • 2 Native MON Transfers • Zero intermediary escrow
            </div>
          </div>
        </div>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute payment sound effect' : 'Enable payment sound effect'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(28, 25, 23, 0.1)',
            color: soundEnabled ? '#1c1917' : '#78716c',
            fontSize: 'var(--text-xs)',
            cursor: 'pointer',
          }}
        >
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span style={{ fontSize: '10px' }}>{soundEnabled ? 'SFX ON' : 'MUTED'}</span>
        </button>
      </div>

      {/* Hero Headline: Total Amount Paid */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'block' }}>
            {isSummary ? 'Total Swarm Fee Settled' : 'Atomic Payment per Chunk'}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.1rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--color-text-primary)',
              }}
            >
              {parseFloat(totalMon) < 0.00001 && parseFloat(totalMon) > 0
                ? totalMon
                : parseFloat(totalMon).toFixed(6)}
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 'var(--text-lg)',
                color: 'var(--color-accent-bright)',
                letterSpacing: '0.04em',
              }}
            >
              MON
            </span>
          </div>
        </div>

        {/* Verification Shield */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'hsla(155, 75%, 55%, 0.1)',
            border: '1px solid hsla(155, 75%, 55%, 0.25)',
            padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-success)',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={14} />
          <span>Monad Fast Finality (~800ms)</span>
        </div>
      </div>

      {/* ANIMATED SPLIT BAR (THE HERO ELEMENT) */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 'var(--space-4)' }}>
        {/* The Bar Track */}
        <div
          style={{
            height: '46px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(28, 25, 23, 0.08)',
            border: '1px solid rgba(28, 25, 23, 0.12)',
            display: 'flex',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.08)',
            position: 'relative',
          }}
        >
          {/* Creator Segment (Left, Violet) */}
          <div
            style={{
              width: `${creatorPercent}%`,
              background: 'linear-gradient(135deg, hsl(265, 85%, 58%), hsl(265, 95%, 68%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 var(--space-3)',
              color: 'white',
              position: 'relative',
              transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: pulseActive ? 'inset 0 0 16px hsla(0, 0%, 100%, 0.4)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
              <Sparkles size={13} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Creator ({creatorPercent}%)
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: 'hsla(0, 0%, 0%, 0.25)',
                padding: '0.15rem 0.35rem',
                borderRadius: '4px',
              }}
            >
              +{parseFloat(creatorMon).toFixed(6)} MON
            </span>
          </div>

          {/* Seeder Segment (Right, Emerald Green) */}
          <div
            style={{
              width: `${seederPercent}%`,
              background: 'linear-gradient(135deg, hsl(155, 75%, 42%), hsl(155, 80%, 55%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 var(--space-3)',
              color: 'white',
              position: 'relative',
              transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: pulseActive ? 'inset 0 0 16px hsla(0, 0%, 100%, 0.4)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Seeder Peer ({seederPercent}%)
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: 'hsla(0, 0%, 0%, 0.25)',
                padding: '0.15rem 0.35rem',
                borderRadius: '4px',
              }}
            >
              +{parseFloat(seederMon).toFixed(6)} MON
            </span>
          </div>
        </div>

        {/* Labels below the bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.5rem',
            fontSize: 'var(--text-xs)',
          }}
        >
          {/* Creator address */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ color: 'var(--color-creator-share)', fontWeight: 600 }}>Royalty:</span>
            <span
              className="address-mono"
              style={{ color: 'var(--color-text-secondary)' }}
              title={creatorAddress}
            >
              {truncateAddress(creatorAddress, 4)}
            </span>
          </div>

          <ArrowRight size={12} color="var(--color-text-muted)" />

          {/* Seeder address */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ color: 'var(--color-seeder-share)', fontWeight: 600 }}>P2P Host:</span>
            <span
              className="address-mono"
              style={{ color: 'var(--color-text-secondary)' }}
              title={seederAddress}
            >
              {truncateAddress(seederAddress, 4)}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction Link Footer */}
      {txHash ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border-glass)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Proof of On-Chain Settlement:
          </span>
          <TransactionLink txHash={txHash} label="View on Monadscan →" showCopy={true} />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border-glass)',
            position: 'relative',
            zIndex: 1,
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>Monad Contract Target:</span>
          <span className="address-mono" style={{ color: 'var(--color-accent-bright)' }}>
            SplitPayment.sol (Atomic Native Split)
          </span>
        </div>
      )}
    </div>
  )
}
