import React, { useState, useRef, useEffect } from 'react'
import { useBalance, useDisconnect } from 'wagmi'
import { formatEther } from 'viem'
import {
  Fingerprint,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Key,
  LogOut,
  Droplets,
} from 'lucide-react'
import { MeraAuthService } from '../../services/auth/mera-auth'
import { ExportKeyModal } from './ExportKeyModal'

interface PasskeyNavbarBadgeProps {
  address: `0x${string}`
}

export const PasskeyNavbarBadge: React.FC<PasskeyNavbarBadgeProps> = ({ address }) => {
  const { disconnect } = useDisconnect()
  const { data: balanceData } = useBalance({ address })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const auth = MeraAuthService.getInstance()
  const metadata = auth.getSavedMetadata()

  const formattedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <div
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.4rem 0.65rem',
            borderRadius: '10px',
            background: '#FFFFFF',
            border: '1px solid rgba(28, 25, 23, 0.1)',
            boxShadow: '0 1px 3px rgba(28, 25, 23, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Biometric Active Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <div
              style={{
                position: 'relative',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #0062FF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Fingerprint size={14} color="#ffffff" />
              <span
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  right: '-1px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10B981',
                  border: '1px solid #FFFFFF',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#181615', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {metadata?.displayName || 'Passkey Account'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#78716C', fontSize: '0.6875rem', lineHeight: 1.2 }}>
                {formattedAddress}
              </span>
            </div>
          </div>

          <ChevronDown size={14} color="#78716C" style={{ flexShrink: 0 }} />
        </div>

        {/* Dropdown Menu - Opens Upwards from Sidebar */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 0,
              width: '260px',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid rgba(28, 25, 23, 0.1)',
              boxShadow: '0 16px 40px rgba(28, 25, 23, 0.14)',
              padding: '0.625rem',
              zIndex: 150,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {/* Header info */}
            <div
              style={{
                padding: '0.5rem 0.625rem',
                borderBottom: '1px solid rgba(28, 25, 23, 0.06)',
                marginBottom: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#10B981" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#181615' }}>
                    {metadata?.displayName || 'Passkey Account'}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                  {balanceData ? parseFloat(formatEther(balanceData.value)).toFixed(2) : '0.00'} MON
                </span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#78716C' }}>
                Hardware-backed • WebAuthn PRF
              </span>
            </div>

            {/* Copy Address */}
            <button
              type="button"
              onClick={handleCopyAddress}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.625rem',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#181615',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(28, 25, 23, 0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copied ? 'Address Copied' : 'Copy Address'}</span>
            </button>

            {/* View on Monadscan */}
            <a
              href={`https://testnet.monadscan.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.625rem',
                borderRadius: '8px',
                color: '#181615',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(28, 25, 23, 0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ExternalLink size={14} />
              <span>View on Monadscan</span>
            </a>

            {/* Export Keys / Seed Phrase */}
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false)
                setExportModalOpen(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.625rem',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#0062FF',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 98, 255, 0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Key size={14} />
              <span>Export Seed / Private Key</span>
            </button>

            {/* Faucet Link */}
            <a
              href="https://testnet.monad.xyz"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.625rem',
                borderRadius: '8px',
                color: '#B45309',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(217, 119, 6, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Droplets size={14} />
              <span>Monad Testnet Faucet</span>
            </a>

            <div style={{ height: '1px', background: 'rgba(28, 25, 23, 0.06)', margin: '4px 0' }} />

            {/* Disconnect */}
            <button
              type="button"
              onClick={() => {
                disconnect()
                auth.disconnect()
                setDropdownOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.625rem',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#EF4444',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={14} />
              <span>Disconnect Passkey</span>
            </button>
          </div>
        )}
      </div>

      {/* Self-Sovereign Key Export Modal */}
      <ExportKeyModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} />
    </>
  )
}
