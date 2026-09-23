import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import { Layers, UploadCloud, LayoutDashboard, LogOut, Key } from 'lucide-react'
import { Button } from '../ui/Button'
import { AddressDisplay } from '../ui/AddressDisplay'
import { PasskeyAuthModal } from '../auth/PasskeyAuthModal'
import { PasskeyNavbarBadge } from '../auth/PasskeyNavbarBadge'

export const Navbar: React.FC = () => {
  const location = useLocation()
  const { address, isConnected, isConnecting, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const navLinks = [
    { to: '/marketplace', label: 'Explore', icon: <Layers size={15} /> },
    { to: '/upload', label: 'Publish', icon: <UploadCloud size={15} /> },
    { to: '/dashboard', label: 'My Activity', icon: <LayoutDashboard size={15} /> },
  ]

  const isPasskeyAccount = connector?.id === 'mera-passkey'

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(28, 25, 23, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          padding: '0 var(--space-8)',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Name Only (Logo icon removed) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <span
              style={{
                fontFamily: "'Apfel Grotezk', sans-serif",
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.03em',
                color: '#1c1917',
              }}
            >
              Torrentia
            </span>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    background: isActive ? 'rgba(28, 25, 23, 0.08)' : 'transparent',
                    color: isActive ? '#1c1917' : '#78716c',
                  }}
                >
                  {link.icon}
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Area: Network Badge & Wallet Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Monad Testnet Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.75rem',
              color: '#065f46',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)',
              }}
            />
            <span>Monad Testnet</span>
          </div>

          {/* Wallet Button / Passkey Badge */}
          {isConnected && address ? (
            isPasskeyAccount ? (
              <PasskeyNavbarBadge address={address} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <AddressDisplay address={address} chars={4} showLink={true} />
                <Button
                  variant="secondary"
                  size="sm"
                  title="Disconnect Wallet"
                  onClick={() => disconnect()}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(28, 25, 23, 0.12)',
                  }}
                >
                  <LogOut size={14} />
                </Button>
              </div>
            )
          ) : (
            <Button
              variant="primary"
              size="sm"
              isLoading={isConnecting}
              onClick={() => setAuthModalOpen(true)}
              style={{
                borderRadius: '9999px',
                padding: '0.45rem 1.15rem',
                background: 'linear-gradient(135deg, hsl(265, 90%, 65%), hsl(250, 85%, 60%))',
                color: '#ffffff',
                boxShadow: '0 4px 14px hsla(265, 90%, 65%, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
              }}
            >
              <Key size={14} />
              <span>Connect Wallet</span>
            </Button>
          )}
        </div>
      </header>

      <PasskeyAuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
