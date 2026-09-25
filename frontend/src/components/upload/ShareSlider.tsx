import React from 'react'
import { User, Server } from 'lucide-react'

export interface ShareSliderProps {
  valueBps: number // 100 - 9900
  onChange: (bps: number) => void
  disabled?: boolean
  chunkPriceMon?: string
  estimatedChunks?: number
}

const PRESETS = [
  { label: '85% Creator (Recommended)', bps: 8500 },
  { label: '70% Balanced Split', bps: 7000 },
  { label: '95% High Margin', bps: 9500 },
  { label: '50/50 Community Partnership', bps: 5000 },
]

export const ShareSlider: React.FC<ShareSliderProps> = ({
  valueBps,
  onChange,
  disabled = false,
  chunkPriceMon = '0.0001',
  estimatedChunks = 3,
}) => {
  const creatorPercent = Math.round(valueBps / 100)
  const seederPercent = 100 - creatorPercent

  const priceMonNum = parseFloat(chunkPriceMon) || 0.0001
  const creatorEarnPerPiece = ((priceMonNum * creatorPercent) / 100).toFixed(6)
  const seederEarnPerPiece = ((priceMonNum * seederPercent) / 100).toFixed(6)
  const creatorTotalEarn = ((priceMonNum * estimatedChunks * creatorPercent) / 100).toFixed(4)
  const seederTotalEarn = ((priceMonNum * estimatedChunks * seederPercent) / 100).toFixed(4)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseInt(e.target.value, 10)
    onChange(percent * 100)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Header with Title & Presets */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#181615', display: 'block', letterSpacing: '-0.01em' }}>
              On-Chain Royalty Distribution
            </span>
            <span style={{ fontSize: '0.75rem', color: '#78716C' }}>
              Smart contracts automatically distribute buyer micropayments on every downloaded piece.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: '#0062FF', fontWeight: 800, background: '#EFF6FF', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
              {creatorPercent}% Creator
            </span>
            <span style={{ color: '#78716C', fontWeight: 700 }}>/</span>
            <span style={{ color: '#059669', fontWeight: 800, background: '#ECFDF5', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
              {seederPercent}% Hosts
            </span>
          </div>
        </div>

        {/* Quick Preset Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PRESETS.map((preset) => {
            const isSelected = valueBps === preset.bps
            return (
              <button
                key={preset.bps}
                type="button"
                disabled={disabled}
                onClick={() => onChange(preset.bps)}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? '#181615' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#44403C',
                  border: isSelected ? '1px solid #181615' : '1px solid rgba(28, 25, 23, 0.12)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !disabled) {
                    e.currentTarget.style.borderColor = 'rgba(28, 25, 23, 0.3)'
                    e.currentTarget.style.background = '#F5F5F4'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !disabled) {
                    e.currentTarget.style.borderColor = 'rgba(28, 25, 23, 0.12)'
                    e.currentTarget.style.background = '#FFFFFF'
                  }
                }}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Twin Dynamic Role Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {/* Creator Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
            border: '1.5px solid #BFDBFE',
            borderRadius: '16px',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxShadow: '0 4px 12px rgba(0, 98, 255, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#0062FF', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <User size={13} />
              <span>Creator Share (You)</span>
            </div>
            <span style={{ fontFamily: "'Apfel Grotezk', 'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#0062FF', lineHeight: 1 }}>
              {creatorPercent}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid #DBEAFE', paddingTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#64748B' }}>Per 1 MB piece:</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1E293B' }}>
                +{creatorEarnPerPiece} MON
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#64748B' }}>Full model ({estimatedChunks} MB):</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#0062FF' }}>
                +{creatorTotalEarn} MON
              </span>
            </div>
          </div>
        </div>

        {/* Swarm Seeder Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
            border: '1.5px solid #A7F3D0',
            borderRadius: '16px',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#059669', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Server size={13} />
              <span>Community Seeder Hosts</span>
            </div>
            <span style={{ fontFamily: "'Apfel Grotezk', 'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>
              {seederPercent}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid #D1FAE5', paddingTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#64748B' }}>Per 1 MB piece:</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1E293B' }}>
                +{seederEarnPerPiece} MON
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#64748B' }}>Full model ({estimatedChunks} MB):</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#059669' }}>
                +{seederTotalEarn} MON
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Visual Split Bar */}
      <div>
        <div
          style={{
            height: '36px',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            background: '#F1F5F9',
          }}
        >
          <div
            style={{
              width: `${creatorPercent}%`,
              background: 'linear-gradient(90deg, #0052D4, #0062FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '0.8125rem',
              fontWeight: 700,
              transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '0 0.5rem',
            }}
          >
            {creatorPercent >= 20 ? `${creatorPercent}% Creator Royalty` : `${creatorPercent}%`}
          </div>
          <div
            style={{
              width: `${seederPercent}%`,
              background: 'linear-gradient(90deg, #10B981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '0.8125rem',
              fontWeight: 700,
              transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '0 0.5rem',
            }}
          >
            {seederPercent >= 20 ? `${seederPercent}% Community Nodes` : `${seederPercent}%`}
          </div>
        </div>

        {/* Tactile Range Input Slider */}
        <input
          type="range"
          min={1}
          max={99}
          value={creatorPercent}
          onChange={handleSliderChange}
          disabled={disabled}
          className="torrentia-range-slider"
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#78716C', marginTop: '0.1rem' }}>
          <span>1% (Max Host Incentive)</span>
          <span style={{ fontWeight: 600, color: '#57534E' }}>Drag to fine-tune exact royalty</span>
          <span>99% (Max Creator Share)</span>
        </div>
      </div>
    </div>
  )
}
