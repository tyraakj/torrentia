import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Code, Cpu, Zap, Layers, ShieldCheck } from 'lucide-react'
import { TerminalRunner } from './TerminalRunner'
import { formatFileSize, bpsToPercent } from '../../lib/utils'
import { formatEther } from 'viem'
import type { IndexedModel } from '../../lib/types'

interface WaferModelCardProps {
  model: IndexedModel
  defaultExpanded?: boolean
}

export const WaferModelCard: React.FC<WaferModelCardProps> = ({ model, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const creatorPercent = bpsToPercent(model.creatorShareBps)
  const seederPercent = bpsToPercent(10000 - model.creatorShareBps)
  const sizeFormatted = model.totalSize
    ? formatFileSize(model.totalSize)
    : `${model.chunkCount} MB`

  const priceFormatted = model.chunkPrice
    ? `${parseFloat(formatEther(model.chunkPrice)).toFixed(4)} MON`
    : '0.0010 MON'

  // Extract avatar initial from model name
  const modelTitle = model.modelName || `Model #${model.modelId.slice(2, 8)}`
  const initial = modelTitle.charAt(0).toUpperCase()

  // Generate capability tags
  const tags = [
    { label: model.category || 'General AI', icon: <Code size={11} /> },
    { label: model.format || 'Safetensors', icon: <Layers size={11} /> },
    { label: 'Instant Split', icon: <Zap size={11} /> },
    { label: 'Direct Streaming', icon: <Cpu size={11} /> },
  ]

  const description =
    model.isDemo
      ? 'A verified AI model shared directly by active community members. Instant pay-as-you-download streaming with zero cloud markup.'
      : 'Decentralized open AI model distributed via the Torrentia community network with instant on-chain royalties on Monad.'

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Brand Header Line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          marginBottom: '0.55rem',
          paddingLeft: '0.25rem',
        }}
      >
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            background: '#181615',
            border: '1px solid rgba(28, 25, 23, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.8rem',
            fontFamily: "'Apfel Grotezk', sans-serif",
            boxShadow: '0 2px 6px rgba(24, 22, 21, 0.15)',
          }}
        >
          {initial}
        </div>
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#181615',
            letterSpacing: '-0.01em',
            fontFamily: "'Apfel Grotezk', sans-serif",
          }}
        >
          {modelTitle}
        </span>
        {model.active && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#065f46',
              fontSize: '0.6875rem',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={11} />
            Verified
          </span>
        )}
      </div>

      {/* Main White Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(28, 25, 23, 0.08)',
          borderRadius: '18px',
          padding: '1.4rem 1.6rem',
          boxShadow: '0 4px 20px rgba(28, 25, 23, 0.04)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Top Card Row: Description + Chevron Expand */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#57534e',
                lineHeight: 1.45,
                margin: '0 0 0.75rem 0',
              }}
            >
              {description}
            </p>

            {/* Capability Tag Chips */}
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    background: '#f5f6f8',
                    border: '1px solid rgba(28, 25, 23, 0.06)',
                    color: '#57534e',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {tag.icon}
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

          {/* Expand / Collapse Chevron */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand details and runner'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isExpanded ? '#181615' : '#f5f6f8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isExpanded ? '#ffffff' : '#181615',
              transition: 'background 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isExpanded) {
                e.currentTarget.style.background = '#e5e7eb'
              }
            }}
            onMouseLeave={(e) => {
              if (!isExpanded) {
                e.currentTarget.style.background = '#f5f6f8'
              }
            }}
          >
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={17} />
            </motion.div>
          </button>
        </div>

        {/* 4-Column Key Metrics Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(28, 25, 23, 0.06)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#8c857e', marginBottom: '0.2rem' }}>
              Chunk Price
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#181615', letterSpacing: '-0.02em' }}>
              {priceFormatted}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#8c857e', marginBottom: '0.2rem' }}>
              Total Size
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#181615', letterSpacing: '-0.02em' }}>
              {sizeFormatted}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#8c857e', marginBottom: '0.2rem' }}>
              Royalty Split
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669', letterSpacing: '-0.02em' }}>
              {creatorPercent} / {seederPercent}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#8c857e', marginBottom: '0.2rem' }}>
              Community Hosts
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#181615', letterSpacing: '-0.02em' }}>
              {model.seederCount || 1} {model.seederCount === 1 ? 'Host' : 'Hosts'}
            </div>
          </div>
        </div>

        {/* Expandable Accordion Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <TerminalRunner model={model} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
