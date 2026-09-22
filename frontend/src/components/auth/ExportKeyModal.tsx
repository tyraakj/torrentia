import React, { useState } from 'react'
import {
  Copy,
  Check,
  ShieldAlert,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { MeraAuthService } from '../../services/auth/mera-auth'
import type { ExportedCredentials } from '../../types/mera'

interface ExportKeyModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ExportKeyModal: React.FC<ExportKeyModalProps> = ({ isOpen, onClose }) => {
  const [credentials, setCredentials] = useState<ExportedCredentials | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [copiedMnemonic, setCopiedMnemonic] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  if (!isOpen) return null

  const handleReveal = async () => {
    setLoading(true)
    setError(null)
    try {
      const auth = MeraAuthService.getInstance()
      const creds = await auth.exportCredentials()
      setCredentials(creds)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Failed to authenticate passkey for key export.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyMnemonic = () => {
    if (!credentials) return
    navigator.clipboard.writeText(credentials.mnemonic)
    setCopiedMnemonic(true)
    setTimeout(() => setCopiedMnemonic(false), 2000)
  }

  const handleCopyKey = () => {
    if (!credentials) return
    navigator.clipboard.writeText(credentials.privateKey)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleClose = () => {
    setCredentials(null)
    setShowPrivateKey(false)
    setError(null)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 210,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 12, 26, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(180deg, hsl(230, 22%, 13%) 0%, hsl(230, 25%, 8%) 100%)',
          borderRadius: '20px',
          border: '1px solid hsla(0, 75%, 60%, 0.25)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px hsla(0, 75%, 60%, 0.1)',
          padding: '1.75rem',
          color: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'hsl(230, 15%, 65%)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '8px',
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, hsl(0, 75%, 60%), hsl(30, 85%, 55%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px hsla(0, 75%, 60%, 0.35)',
            }}
          >
            <ShieldAlert size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Export Account Keys
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'hsl(230, 15%, 65%)' }}>
              Self-Sovereign Backup & Migration
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div
          style={{
            background: 'hsla(0, 75%, 55%, 0.1)',
            borderRadius: '12px',
            padding: '0.875rem',
            border: '1px solid hsla(0, 75%, 55%, 0.25)',
            fontSize: '0.8125rem',
            color: '#fca5a5',
            lineHeight: 1.4,
          }}
        >
          <strong>Warning:</strong> Anyone with these words or private key can access all funds and models owned by this address. Never share them with anyone, including Torrentia support.
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '0.75rem',
              color: '#fca5a5',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        {!credentials ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(0, 0%, 90%)', lineHeight: 1.5 }}>
              To view your standard BIP-39 mnemonic phrase and raw Monad private key, authenticate with your biometric passkey.
            </p>
            <Button
              onClick={handleReveal}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, hsl(265, 90%, 65%), hsl(250, 85%, 60%))',
                color: '#ffffff',
                fontWeight: 700,
                padding: '0.75rem',
                borderRadius: '12px',
                border: 'none',
              }}
            >
              {loading ? 'Authenticating with Passkey...' : 'Reveal Keys with Face ID / PIN'}
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 24-Word Mnemonic Phrase */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(0, 0%, 90%)' }}>
                  24-Word Recovery Phrase (256-bit)
                </span>
                <button
                  type="button"
                  onClick={handleCopyMnemonic}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedMnemonic ? '#4ade80' : 'hsl(265, 90%, 75%)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedMnemonic ? <Check size={13} /> : <Copy size={13} />}
                  {copiedMnemonic ? 'Copied' : 'Copy Phrase'}
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  background: 'hsl(230, 20%, 11%)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {credentials.mnemonic.split(' ').map((word, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'hsl(230, 22%, 14%)',
                      borderRadius: '6px',
                      padding: '0.375rem 0.5rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: 'hsl(230, 15%, 50%)', width: '16px', textAlign: 'right' }}>{idx + 1}.</span>
                    <span style={{ color: '#ffffff', fontWeight: 600, fontFamily: 'monospace' }}>{word}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Private Key */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(0, 0%, 90%)' }}>
                  Raw EVM Private Key
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'hsl(230, 15%, 65%)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {showPrivateKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showPrivateKey ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedKey ? '#4ade80' : 'hsl(265, 90%, 75%)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey ? 'Copied' : 'Copy Key'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: 'hsl(230, 20%, 11%)',
                  borderRadius: '10px',
                  padding: '0.625rem 0.75rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: showPrivateKey ? '#4ade80' : 'hsl(230, 15%, 55%)',
                  wordBreak: 'break-all',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {showPrivateKey ? credentials.privateKey : '•'.repeat(66)}
              </div>
            </div>

            {/* Migration Help Note */}
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(230, 15%, 60%)', lineHeight: 1.4 }}>
              To import this account into MetaMask or Rabby: select <strong>Import Account</strong> &gt; <strong>Private Key</strong> (or Import Seed Phrase), and paste the values above.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
