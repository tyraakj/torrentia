import React from 'react'

export interface ShareSliderProps {
  valueBps: number // 100 - 9900
  onChange: (bps: number) => void
  disabled?: boolean
}

export const ShareSlider: React.FC<ShareSliderProps> = ({
  valueBps,
  onChange,
  disabled = false,
}) => {
  const creatorPercent = Math.round(valueBps / 100)
  const seederPercent = 100 - creatorPercent

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseInt(e.target.value, 10)
    onChange(percent * 100)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          On-Chain Revenue Split
        </label>
        <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
          <span style={{ color: 'var(--color-creator-share)' }}>
            Creator: {creatorPercent}%
          </span>
          <span style={{ color: 'var(--color-seeder-share)' }}>
            Seeder: {seederPercent}%
          </span>
        </div>
      </div>

      {/* Segmented Visual Split Bar */}
      <div
        style={{
          height: '24px',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          display: 'flex',
          border: '1px solid var(--color-border-glass)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            width: `${creatorPercent}%`,
            background: 'var(--color-creator-share)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            transition: 'width var(--transition-fast)',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {creatorPercent >= 15 ? `${creatorPercent}% Creator` : `${creatorPercent}%`}
        </div>
        <div
          style={{
            width: `${seederPercent}%`,
            background: 'var(--color-seeder-share)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'hsl(230, 25%, 7%)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            transition: 'width var(--transition-fast)',
          }}
        >
          {seederPercent >= 15 ? `${seederPercent}% Seeder` : `${seederPercent}%`}
        </div>
      </div>

      {/* Range Input */}
      <input
        type="range"
        min={1}
        max={99}
        value={creatorPercent}
        onChange={handleSliderChange}
        disabled={disabled}
        style={{
          width: '100%',
          cursor: disabled ? 'not-allowed' : 'pointer',
          accentColor: 'var(--color-accent)',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
        <span>1% Creator (Max Host Incentive)</span>
        <span>Drag to set your custom royalty</span>
        <span>99% Creator</span>
      </div>
    </div>
  )
}
