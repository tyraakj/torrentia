import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Zap, Layers, UploadCloud, LayoutDashboard, LogOut } from 'lucide-react'
import { Button } from '../ui/Button'
import { AddressDisplay } from '../ui/AddressDisplay'

export const Navbar: React.FC = () => {
  const location = useLocation()
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const navLinks = [
    { to: '/model/llama-3-8b', label: 'Swarm Stream', icon: <Layers size={15} /> },
    { to: '/upload', label: 'Upload Model', icon: <UploadCloud size={15} /> },
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  ]

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.type === 'injected') || connectors[0]
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }

  return (
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
      {/* Brand / Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: '#1c1917',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(28, 25, 23, 0.2)',
            }}
          >
            <Zap size={17} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: "'Apfel Grotezk', 'Plus Jakarta Sans', sans-serif",
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#1c1917',
                lineHeight: 1.1,
              }}
            >
              TORRENTIA
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                color: '#78716c',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              P2P Swarm Network
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {navLinks.map((link) => {
            const isActive = link.to.startsWith('/model')
              ? location.pathname.startsWith('/model')
              : location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#1c1917' : '#57534e',
                  background: isActive ? 'rgba(28, 25, 23, 0.08)' : 'transparent',
                  border: isActive
                    ? '1px solid rgba(28, 25, 23, 0.12)'
                    : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: isActive ? '#1c1917' : '#78716c' }}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Right Controls: Network Badge + Wallet Connect */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Monad Testnet Network Indicator */}
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

        {/* Wallet Button */}
        {isConnected && address ? (
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
        ) : (
          <Button
            variant="primary"
            size="sm"
            isLoading={isConnecting}
            onClick={handleConnect}
            style={{
              borderRadius: '9999px',
              padding: '0.45rem 1.15rem',
              background: '#1c1917',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(28, 25, 23, 0.15)',
            }}
          >
            Connect Wallet
          </Button>
        )}
      </div>
    </header>
  )
}
