import React, { useEffect, useState } from 'react'
import { useConnect, type Connector } from 'wagmi'
import {
  Key,
  Fingerprint,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2,
  Wallet,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { MeraAuthService } from '../../services/auth/mera-auth'
import type { PasskeyDiagnostics } from '../../types/mera'

interface PasskeyAuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PasskeyAuthModal: React.FC<PasskeyAuthModalProps> = ({ isOpen, onClose }) => {
  const { connect, connectors, isPending } = useConnect()
  const [authMethod, setAuthMethod] = useState<'mera' | 'wallet'>('mera')
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<PasskeyDiagnostics | null>(null)
  const [hasSavedKey, setHasSavedKey] = useState(false)

  const auth = MeraAuthService.getInstance()

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setHasSavedKey(auth.hasSavedPasskey())
      setTab(auth.hasSavedPasskey() ? 'login' : 'register')
      auth.checkDiagnostics().then(setDiagnostics).catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handlePasskeyAuth = async () => {
    setError(null)
    setLoading(true)

    try {
      const meraConnector = connectors.find((c) => c.id === 'mera-passkey')
      if (!meraConnector) {
        throw new Error('Mera Passkey connector not configured in Wagmi.')
      }

      if (tab === 'register') {
        const name = displayName.trim() || 'Torrentia User'
        await auth.register(name)
      } else {
        await auth.login()
      }

      // Connect into Wagmi provider
      connect(
        { connector: meraConnector },
        {
          onSuccess: () => {
            setLoading(false)
            onClose()
          },
          onError: (err) => {
            setLoading(false)
            setError(err.message || 'Failed to connect passkey account.')
          },
        },
      )
    } catch (err: unknown) {
      setLoading(false)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('cancelled') || msg.includes('canceled') || msg.includes('AbortError')) {
        setError('Authentication was cancelled. Tap again when ready.')
      } else {
        setError(msg)
      }
    }
  }

  const handleWalletConnect = (connector: Connector) => {
    setError(null)
    connect(
      { connector },
      {
        onSuccess: () => onClose(),
        onError: (err) => {
          if (
            err.name === 'ConnectorAlreadyConnectedError' ||
            err.message?.toLowerCase().includes('already connected')
          ) {
            onClose()
            return
          }
          setError(err.message || 'Failed to connect wallet.')
        },
      },
    )
  }

  const walletConnectors = connectors.filter((c) => c.id !== 'mera-passkey')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(24, 22, 21, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid rgba(28, 25, 23, 0.1)',
          boxShadow: '0 24px 64px rgba(28, 25, 23, 0.18)',
          padding: '2rem',
          color: '#181615',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: '#78716C',
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
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#0062FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 98, 255, 0.28)',
              color: '#FFFFFF',
            }}
          >
            <Key size={22} />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Apfel Grotezk', sans-serif", margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#181615' }}>
              Connect to Torrentia
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: '#57534E' }}>
              Choose biometric passkey login or your Web3 wallet
            </p>
          </div>
        </div>

        {/* Two Top-Level First-Class Options: Mera Logic vs Wallets */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
          }}
        >
          {/* Option 1: Mera Passkey */}
          <button
            type="button"
            onClick={() => {
              setAuthMethod('mera')
              setError(null)
            }}
            style={{
              padding: '0.85rem 0.75rem',
              borderRadius: '12px',
              border: authMethod === 'mera' ? '2px solid #0062FF' : '1px solid rgba(28, 25, 23, 0.12)',
              background: authMethod === 'mera' ? 'rgba(0, 98, 255, 0.04)' : '#FAFAF8',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Fingerprint size={18} color={authMethod === 'mera' ? '#0062FF' : '#57534E'} />
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  background: authMethod === 'mera' ? '#0062FF' : 'rgba(28, 25, 23, 0.08)',
                  color: authMethod === 'mera' ? '#FFFFFF' : '#78716C',
                }}
              >
                Recommended
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#181615' }}>Passkey (Mera)</div>
            <div style={{ fontSize: '0.72rem', color: '#78716C', lineHeight: 1.3 }}>
              Face ID / Touch ID • Zero seed phrase
            </div>
          </button>

          {/* Option 2: Web3 Wallets */}
          <button
            type="button"
            onClick={() => {
              setAuthMethod('wallet')
              setError(null)
            }}
            style={{
              padding: '0.85rem 0.75rem',
              borderRadius: '12px',
              border: authMethod === 'wallet' ? '2px solid #0062FF' : '1px solid rgba(28, 25, 23, 0.12)',
              background: authMethod === 'wallet' ? 'rgba(0, 98, 255, 0.04)' : '#FAFAF8',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Wallet size={18} color={authMethod === 'wallet' ? '#0062FF' : '#57534E'} />
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  background: authMethod === 'wallet' ? '#0062FF' : 'rgba(28, 25, 23, 0.08)',
                  color: authMethod === 'wallet' ? '#FFFFFF' : '#78716C',
                }}
              >
                Extensions
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#181615' }}>Web3 Wallet</div>
            <div style={{ fontSize: '0.72rem', color: '#78716C', lineHeight: 1.3 }}>
              MetaMask, Rabby, Coinbase &amp; more
            </div>
          </button>
        </div>

        {/* View 1: Mera Passkey Flow */}
        {authMethod === 'mera' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Mode Selector Tabs (Existing vs New) */}
            <div
              style={{
                display: 'flex',
                background: '#F5F5F4',
                borderRadius: '8px',
                padding: '3px',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTab('login')
                  setError(null)
                }}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: tab === 'login' ? '#FFFFFF' : 'transparent',
                  color: tab === 'login' ? '#181615' : '#78716C',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  boxShadow: tab === 'login' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Existing Passkey
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register')
                  setError(null)
                }}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: tab === 'register' ? '#FFFFFF' : 'transparent',
                  color: tab === 'register' ? '#181615' : '#78716C',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  boxShadow: tab === 'register' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Create New
              </button>
            </div>

            {tab === 'register' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label
                  htmlFor="passkey-name"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#181615' }}
                >
                  Device Label
                </label>
                <input
                  id="passkey-name"
                  type="text"
                  placeholder="e.g. Workstation, MacBook Pro"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    background: '#FAFAF8',
                    border: '1px solid rgba(28, 25, 23, 0.15)',
                    color: '#181615',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#78716C', lineHeight: 1.4 }}>
                  Derives a standard Monad EOA address directly from your device hardware.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(0, 98, 255, 0.04)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  border: '1px solid rgba(0, 98, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <ShieldCheck size={18} color="#0062FF" />
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#181615', lineHeight: 1.4 }}>
                  {hasSavedKey
                    ? 'Welcome back! Tap below to authenticate with your biometric passkey.'
                    : 'Select your passkey from iCloud Keychain, Google Password Manager, or security key.'}
                </p>
              </div>
            )}

            {/* Passkey Button */}
            <Button
              onClick={handlePasskeyAuth}
              disabled={loading || isPending}
              style={{
                background: '#0062FF',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9375rem',
                padding: '0.75rem',
                borderRadius: '10px',
                border: 'none',
                boxShadow: '0 4px 14px rgba(0, 98, 255, 0.28)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {loading || isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying Passkey...</span>
                </>
              ) : (
                <>
                  <Fingerprint size={18} />
                  <span>{tab === 'login' ? 'Authenticate with Passkey' : 'Create & Register Passkey'}</span>
                </>
              )}
            </Button>

            {/* Hardware diagnostics */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#78716C',
                paddingTop: '0.25rem',
                borderTop: '1px solid rgba(28, 25, 23, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: diagnostics?.prfSupported ? '#10B981' : '#F59E0B',
                  }}
                />
                <span>
                  {diagnostics?.prfSupported ? 'WebAuthn PRF Active' : 'Standard WebAuthn'}
                </span>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} color="#10B981" />
                Hardware Encrypted EOA
              </span>
            </div>
          </div>
        )}

        {/* View 2: Web3 Wallet Flow */}
        {authMethod === 'wallet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#57534E' }}>
              Connect with your installed Web3 browser extension or mobile wallet:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {walletConnectors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleWalletConnect(c)}
                  disabled={loading || isPending}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#FAFAF8',
                    border: '1px solid rgba(28, 25, 23, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5F5F4'
                    e.currentTarget.style.borderColor = '#181615'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FAFAF8'
                    e.currentTarget.style.borderColor = 'rgba(28, 25, 23, 0.12)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Wallet size={18} color="#0062FF" />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#181615' }}>
                      {c.name || 'Browser Wallet (Injected)'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#78716C', fontWeight: 500 }}>
                    Connect &rarr;
                  </span>
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.75rem',
                color: '#78716C',
                paddingTop: '0.5rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10B981',
                }}
              />
              <span>Monad Testnet (Chain ID 10143)</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '0.65rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              color: '#dc2626',
              fontSize: '0.8125rem',
            }}
          >
            <AlertCircle size={15} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
