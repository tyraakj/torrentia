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
  const formattedBalance = balanceData ? formatEther(balanceData.value) : '0'
  const monBalance = balanceData ? parseFloat(formattedBalance).toFixed(2) : '0.00'
  const isLowBalance = balanceData ? parseFloat(formattedBalance) < 10 : true

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
            gap: '0.625rem',
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            background: 'hsl(230, 20%, 11%)',
            border: '1px solid hsla(265, 80%, 65%, 0.3)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2), 0 0 15px hsla(265, 90%, 65%, 0.15)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Biometric Active Indicator */}
          <div
            style={{
              position: 'relative',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, hsl(265, 90%, 65%), hsl(200, 85%, 60%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Fingerprint size={14} color="#ffffff" />
            <span
              style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '1px solid hsl(230, 20%, 11%)',
              }}
            />
          </div>

          {/* Balance & Address */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span style={{ fontWeight: 700, color: '#ffffff' }}>
              {monBalance} <span style={{ fontSize: '0.6875rem', color: 'hsl(265, 90%, 75%)' }}>MON</span>
            </span>
            <span style={{ color: 'hsl(230, 15%, 55%)' }}>•</span>
            <span style={{ fontFamily: 'monospace', color: 'hsl(0, 0%, 90%)', fontWeight: 500 }}>
              {formattedAddress}
            </span>
          </div>

          {/* Faucet Pill if Low Balance */}
          {isLowBalance && (
            <a
              href="https://testnet.monad.xyz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                background: 'hsla(40, 90%, 55%, 0.15)',
                border: '1px solid hsla(40, 90%, 55%, 0.3)',
                color: 'hsl(40, 95%, 65%)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              title="Request testnet MON for streaming payments"
            >
              <Droplets size={10} />
              Faucet
            </a>
          )}

          <ChevronDown size={14} color="hsl(230, 15%, 65%)" />
        </div>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '260px',
              background: 'hsl(230, 22%, 12%)',
              borderRadius: '16px',
              border: '1px solid hsla(265, 80%, 65%, 0.25)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px hsla(265, 90%, 65%, 0.1)',
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
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#22c55e" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>
                  {metadata?.displayName || 'Passkey Account'}
                </span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'hsl(230, 15%, 55%)' }}>
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
                color: 'hsl(0, 0%, 90%)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
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
                color: 'hsl(0, 0%, 90%)',
                fontSize: '0.8125rem',
                textDecoration: 'none',
              }}
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
                color: 'hsl(265, 90%, 75%)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
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
                color: 'hsl(40, 95%, 65%)',
                fontSize: '0.8125rem',
                textDecoration: 'none',
              }}
            >
              <Droplets size={14} />
              <span>Monad Testnet Faucet</span>
            </a>

            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '4px 0' }} />

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
                color: '#f87171',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
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
