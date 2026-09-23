import React from 'react'
import { formatEther } from 'viem'
import { HardDrive, Layers, Coins, Cpu, Award, Radio } from 'lucide-react'
import type { ChunkManifest, IndexedModel } from '../../lib/types'
import { formatFileSize } from '../../lib/utils'

export interface FileInfoPanelProps {
  model: IndexedModel
  manifest?: ChunkManifest | null
  className?: string
  style?: React.CSSProperties
}

export const FileInfoPanel: React.FC<FileInfoPanelProps> = ({ model, manifest, style }) => {
  const totalSize = manifest?.totalSize ?? model.totalSize ?? 0
  const chunkCount = manifest?.chunks.length ?? model.chunkCount ?? 1
  const chunkSize = manifest?.chunkSize ?? 1048576 // 1MB default

  const priceWei = model.chunkPrice
  const chunkPriceMon = formatEther(priceWei)
  const totalCostWei = priceWei * BigInt(chunkCount)
  const totalCostMon = formatEther(totalCostWei)

  const creatorPercent = Math.round(model.creatorShareBps / 100)
  const seederPercent = 100 - creatorPercent

  const specItems = [
    {
      icon: <HardDrive size={15} color="var(--color-accent-bright)" />,
      label: 'Total Model Size',
      value: totalSize > 0 ? formatFileSize(totalSize) : 'Unknown',
      subtext: `${(totalSize / (1024 * 1024)).toFixed(1)} Megabytes`,
    },
    {
      icon: <Layers size={15} color="var(--color-info)" />,
      label: 'Verified Pieces',
      value: `${chunkCount} Pieces`,
      subtext: `${formatFileSize(chunkSize)} / piece`,
    },
    {
      icon: <Coins size={15} color="var(--color-warning)" />,
      label: 'Price per Verified Piece',
      value: `${parseFloat(chunkPriceMon).toFixed(6)} MON`,
      subtext: 'Uniform fee per piece',
    },
    {
      icon: <Award size={15} color="var(--color-creator-share)" />,
      label: 'Creator Share (%)',
      value: `${creatorPercent}%`,
      subtext: `${(parseFloat(chunkPriceMon) * (creatorPercent / 100)).toFixed(6)} MON/piece`,
    },
    {
      icon: <Radio size={15} color="var(--color-seeder-share)" />,
      label: 'Peer / Seeder Node Share',
      value: `${seederPercent}%`,
      subtext: `${(parseFloat(chunkPriceMon) * (seederPercent / 100)).toFixed(6)} MON/piece`,
    },
    {
      icon: <Cpu size={15} color="var(--color-accent)" />,
      label: 'Full Swarm Cost',
      value: `${parseFloat(totalCostMon).toFixed(6)} MON`,
      subtext: `For complete model passport`,
    },
  ]

  return (
    <div
      className="glass"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em' }}>
          File Specifications & Economics
        </h3>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Monad EVM Standard
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {specItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(28, 25, 23, 0.08)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#78716c', fontSize: 'var(--text-xs)' }}>
              {item.icon}
              <span>{item.label}</span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: '#1c1917',
              }}
            >
              {item.value}
            </div>
            <div style={{ fontSize: '11px', color: '#57534e' }}>
              {item.subtext}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
