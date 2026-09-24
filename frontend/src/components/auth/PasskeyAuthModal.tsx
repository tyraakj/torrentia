import React, { useEffect, useState } from 'react'
import { useConnect } from 'wagmi'
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

  const handleInjectedConnect = () => {
    const injected = connectors.find((c) => c.id === 'injected' || c.type === 'injected')
    if (injected) {
      connect(
        { connector: injected },
        {
          onSuccess: () => onClose(),
          onError: (err) => setError(err.message),
        },
      )
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 12, 26, 0.75)',
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
          maxWidth: '440px',
          background: 'linear-gradient(180deg, hsl(230, 22%, 13%) 0%, hsl(230, 25%, 8%) 100%)',
          borderRadius: '20px',
          border: '1px solid hsla(265, 80%, 65%, 0.25)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px hsla(265, 90%, 65%, 0.15)',
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
          onClick={onClose}
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
              background: 'linear-gradient(135deg, hsl(265, 90%, 65%), hsl(200, 85%, 60%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px hsla(265, 90%, 65%, 0.35)',
            }}
          >
            <Fingerprint size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {tab === 'login' ? 'Sign In with Passkey' : 'Create Passkey Account'}
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'hsl(230, 15%, 65%)' }}>
              Face ID, Touch ID, or Device PIN • Powered by Mera
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'hsl(230, 20%, 11%)',
            borderRadius: '10px',
            padding: '3px',
            gap: '4px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
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
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: tab === 'login' ? 'hsl(265, 80%, 60%)' : 'transparent',
              color: tab === 'login' ? '#ffffff' : 'hsl(230, 15%, 65%)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
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
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: tab === 'register' ? 'hsl(265, 80%, 60%)' : 'transparent',
              color: tab === 'register' ? '#ffffff' : 'hsl(230, 15%, 65%)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Create New
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'register' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label
                htmlFor="passkey-name"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'hsl(0, 0%, 90%)' }}
              >
                Device / Account Label
              </label>
              <input
                id="passkey-name"
                type="text"
                placeholder="e.g. MacBook Pro, Alice's PC"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '10px',
                  background: 'hsl(230, 20%, 11%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(230, 15%, 60%)', lineHeight: 1.4 }}>
              Derives a standard Monad EOA address directly from your device hardware. No seed phrase or extension needed.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'hsla(265, 80%, 50%, 0.08)',
              borderRadius: '12px',
              padding: '0.875rem',
              border: '1px solid hsla(265, 80%, 60%, 0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <ShieldCheck size={18} color="hsl(265, 90%, 75%)" />
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'hsl(0, 0%, 90%)', lineHeight: 1.4 }}>
              {hasSavedKey
                ? 'Welcome back! Tap below to verify with your biometric passkey or device PIN.'
                : 'Select your existing passkey from iCloud Keychain, Google, or your security key.'}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              color: '#fca5a5',
              fontSize: '0.8125rem',
            }}
          >
            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Passkey Action Button */}
        <Button
          onClick={handlePasskeyAuth}
          disabled={loading || isPending}
          style={{
            background: 'linear-gradient(135deg, hsl(265, 90%, 65%), hsl(250, 85%, 60%))',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9375rem',
            padding: '0.75rem',
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 20px hsla(265, 90%, 65%, 0.4)',
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
              <Key size={18} />
              <span>{tab === 'login' ? 'Authenticate with Passkey' : 'Create & Register Passkey'}</span>
            </>
          )}
        </Button>

        {/* Diagnostics Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'hsl(230, 15%, 55%)',
            paddingTop: '0.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: diagnostics?.prfSupported ? '#22c55e' : '#eab308',
                boxShadow: diagnostics?.prfSupported ? '0 0 8px #22c55e' : 'none',
              }}
            />
            <span>
              {diagnostics?.prfSupported ? 'WebAuthn PRF Supported' : 'Standard WebAuthn Active'}
            </span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} />
            Hardware Encrypted
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'hsl(230, 10%, 45%)',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
          <span>or use extension</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
        </div>

        {/* Injected Wallet Fallback */}
        <button
          type="button"
          onClick={handleInjectedConnect}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.625rem',
            borderRadius: '10px',
            background: 'hsl(230, 20%, 11%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'hsl(0, 0%, 90%)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Wallet size={16} />
          <span>Browser Extension (MetaMask, Rabby)</span>
        </button>
      </div>
    </div>
  )
}
