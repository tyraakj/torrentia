import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, Terminal, Play, Radio } from 'lucide-react'
import type { IndexedModel } from '../../lib/types'

interface TerminalRunnerProps {
  model: IndexedModel
}

export const TerminalRunner: React.FC<TerminalRunnerProps> = ({ model }) => {
  const navigate = useNavigate()
  const [isP2PMode, setIsP2PMode] = useState(true)
  const [copied, setCopied] = useState(false)

  const cliSnippet = [
    `# Download & seed model weights via Torrentia Go CLI`,
    `torrentia-seeder download \\`,
    `  --model ${model.modelId} \\`,
    `  --rpc https://testnet-rpc.monad.xyz \\`,
    `  --p2p ${isP2PMode ? 'true' : 'false'} \\`,
    `  --chunks ${model.chunkCount} \\`,
    `  --output ./weights/${model.modelName || 'model'}/`,
  ]

  const fullText = cliSnippet.join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        marginTop: '1.25rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid rgba(28, 25, 23, 0.08)',
      }}
    >
      {/* CLI Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '0.85rem',
          fontSize: '0.8125rem',
        }}
      >
        {/* Left: CLI Title & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              color: '#181615',
              fontSize: '0.8125rem',
            }}
          >
            <Terminal size={15} color="#0062FF" />
            <span>Go Seeder CLI</span>
          </div>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#059669',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
            }}
          >
            Monad Testnet
          </span>
        </div>

        {/* Right: P2P Network Switch */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          onClick={() => setIsP2PMode(!isP2PMode)}
        >
          <span style={{ color: '#57534e', fontSize: '0.75rem', fontWeight: 500 }}>
            P2P Direct Transfer
          </span>
          <div
            style={{
              width: '32px',
              height: '18px',
              borderRadius: '9999px',
              background: isP2PMode ? '#181615' : '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              transition: 'background 0.2s ease',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#ffffff',
                transform: isP2PMode ? 'translateX(14px)' : 'translateX(0)',
                transition: 'transform 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isP2PMode && <Check size={10} color="#181615" strokeWidth={3} />}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Code Window */}
      <div
        style={{
          position: 'relative',
          borderRadius: '12px',
          background: '#181615',
          border: '1px solid rgba(28, 25, 23, 0.12)',
          padding: '1rem 1.25rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          lineHeight: 1.55,
          color: '#e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 4px 16px rgba(24, 22, 21, 0.12)',
        }}
      >
        {/* Floating Copy Button */}
        <button
          onClick={handleCopy}
          title="Copy CLI command"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
            color: copied ? '#34d399' : '#cbd5e1',
            borderRadius: '6px',
            padding: '0.35rem 0.55rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {/* Code Lines with Line Numbers */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {cliSnippet.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem' }}>
              <span
                style={{
                  color: 'rgba(255, 255, 255, 0.22)',
                  textAlign: 'right',
                  width: '18px',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <span
                style={{
                  color: line.startsWith('#')
                    ? 'rgba(255, 255, 255, 0.45)'
                    : line.includes('--')
                    ? '#93c5fd'
                    : '#f1f5f9',
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#78716C', fontSize: '0.75rem' }}>
          <Radio size={13} color="#059669" />
          <span>Need weights immediately? Stream pieces directly in your browser.</span>
        </div>

        <button
          onClick={() => navigate(`/model/${model.modelId}`)}
          style={{
            background: '#0062FF',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.6rem 1.25rem',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(0, 98, 255, 0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 98, 255, 0.45)'
            e.currentTarget.style.background = '#0052D9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 98, 255, 0.35)'
            e.currentTarget.style.background = '#0062FF'
          }}
        >
          <Play size={14} fill="#ffffff" />
          <span>Stream in Browser</span>
        </button>
      </div>
    </div>
  )
}
