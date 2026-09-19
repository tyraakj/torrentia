import React, { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

export interface AddressDisplayProps {
  address: string
  truncate?: boolean
  chars?: number
  showLink?: boolean
  explorerUrl?: string
  className?: string
  style?: React.CSSProperties
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  truncate = true,
  chars = 4,
  showLink = true,
  explorerUrl = 'https://testnet.monadscan.com',
  style,
}) => {
  const [copied, setCopied] = useState(false)

  if (!address) return null

  const formattedAddress = truncate && address.length > chars * 2 + 2
    ? `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
    : address

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard copy fallback
    }
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(28, 25, 23, 0.12)',
        padding: '0.25rem 0.6rem',
        borderRadius: '9999px',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        color: '#1c1917',
        userSelect: 'none',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
        ...style,
      }}
    >
      <span title={address} style={{ letterSpacing: '0.02em' }}>
        {formattedAddress}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy Address'}
        style={{
          display: 'flex',
          alignItems: 'center',
          color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
          transition: 'color var(--transition-fast)',
          padding: '2px',
        }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {showLink && (
        <a
          href={`${explorerUrl}/address/${address}`}
          target="_blank"
          rel="noreferrer noopener"
          title="View on Monadscan"
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text-muted)',
            transition: 'color var(--transition-fast)',
            padding: '2px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent-bright)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <ExternalLink size={13} />
        </a>
      )}
    </span>
  )
}
