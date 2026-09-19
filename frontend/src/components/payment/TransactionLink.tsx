import React, { useState } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'

export interface TransactionLinkProps {
  txHash: string
  truncate?: boolean
  chars?: number
  explorerUrl?: string
  className?: string
  style?: React.CSSProperties
  showCopy?: boolean
  label?: string
}

export const TransactionLink: React.FC<TransactionLinkProps> = ({
  txHash,
  truncate = true,
  chars = 4,
  explorerUrl = 'https://testnet.monadscan.com',
  style,
  showCopy = true,
  label,
}) => {
  const [copied, setCopied] = useState(false)

  if (!txHash) return null

  const isMock = txHash.startsWith('0xmock')
  const formattedHash = truncate && txHash.length > chars * 2 + 2
    ? `${txHash.slice(0, chars + 2)}...${txHash.slice(-chars)}`
    : txHash

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(txHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  const url = isMock ? '#' : `${explorerUrl}/tx/${txHash}`

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        ...style,
      }}
    >
      <a
        href={url}
        target={isMock ? '_self' : '_blank'}
        rel="noopener noreferrer"
        title={isMock ? `Simulated on-chain tx: ${txHash}` : `View on Monadscan: ${txHash}`}
        onClick={(e) => {
          if (isMock) {
            e.preventDefault()
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: 'var(--color-accent-bright)',
          textDecoration: 'none',
          padding: '0.15rem 0.4rem',
          borderRadius: 'var(--radius-sm)',
          background: 'hsla(265, 90%, 65%, 0.08)',
          border: '1px solid hsla(265, 90%, 65%, 0.2)',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'hsla(265, 90%, 65%, 0.16)'
          e.currentTarget.style.borderColor = 'var(--color-accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'hsla(265, 90%, 65%, 0.08)'
          e.currentTarget.style.borderColor = 'hsla(265, 90%, 65%, 0.2)'
        }}
      >
        <span>{label || formattedHash}</span>
        <ExternalLink size={11} style={{ opacity: 0.8 }} />
      </a>

      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? 'Copied full tx hash!' : 'Copy Tx Hash'}
          style={{
            display: 'flex',
            alignItems: 'center',
            color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
            transition: 'color var(--transition-fast)',
            padding: '2px',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </span>
  )
}
