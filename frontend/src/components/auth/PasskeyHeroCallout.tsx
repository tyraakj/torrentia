import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { Fingerprint, ArrowRight, Zap } from 'lucide-react'
import { Button } from '../ui/Button'
import { PasskeyAuthModal } from './PasskeyAuthModal'

export const PasskeyHeroCallout: React.FC = () => {
  const { isConnected } = useAccount()
  const [modalOpen, setModalOpen] = useState(false)

  if (isConnected) return null

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, hsla(265, 80%, 25%, 0.4) 0%, hsla(230, 25%, 10%, 0.8) 100%)',
          borderRadius: '16px',
          border: '1px solid hsla(265, 80%, 65%, 0.25)',
          padding: '1.25rem 1.75rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 25px hsla(265, 90%, 65%, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 320px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, hsl(265, 90%, 65%), hsl(200, 85%, 60%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px hsla(265, 90%, 65%, 0.35)',
              flexShrink: 0,
            }}
          >
            <Fingerprint size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Frictionless Swarm Streaming with Passkeys
              </span>
              <span
                style={{
                  background: 'hsla(155, 75%, 55%, 0.15)',
                  border: '1px solid hsla(155, 75%, 55%, 0.3)',
                  color: 'hsl(155, 80%, 60%)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                }}
              >
                Mera Powered
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'hsl(230, 15%, 65%)', lineHeight: 1.4 }}>
              Stream open-source AI weights in seconds with Face ID or Device PIN. No browser extensions, zero confirmation popups.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            onClick={() => setModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, hsl(265, 90%, 65%), hsl(250, 85%, 60%))',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.875rem',
              padding: '0.625rem 1.125rem',
              borderRadius: '10px',
              border: 'none',
              boxShadow: '0 4px 15px hsla(265, 90%, 65%, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Zap size={15} />
            <span>Connect with Passkey</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      <PasskeyAuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
