import React, { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAccount, useDisconnect, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { motion } from 'motion/react'
import {
  Layers,
  UploadCloud,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  LogOut,
  Key,
  BookOpen,
  Coins,
  Radio,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { PasskeyAuthModal } from '../auth/PasskeyAuthModal'
import { PasskeyNavbarBadge } from '../auth/PasskeyNavbarBadge'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'splits'
  const { address, isConnected, isConnecting, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: balanceData } = useBalance({ address })
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const isPasskeyAccount = connector?.id === 'mera-passkey'

  const catalogLinks = [
    { to: '/marketplace', label: 'Models', icon: <Layers size={18} /> },
    { to: '/upload', label: 'Publish', icon: <UploadCloud size={18} /> },
  ]

  const featureLinks = [
    { to: '/dashboard?tab=splits', tab: 'splits', label: 'Creator Splits', icon: <Coins size={18} /> },
    { to: '/dashboard?tab=mesh', tab: 'mesh', label: 'Community Network', icon: <Radio size={18} /> },
    { to: '/dashboard?tab=batch', tab: 'batch', label: 'Batched Settlements', icon: <Lock size={18} /> },
    { to: '/dashboard?tab=integrity', tab: 'integrity', label: 'File Verification', icon: <ShieldCheck size={18} /> },
  ]

  const formattedBalance = balanceData
    ? `${parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(2)} ${balanceData.symbol}`
    : '0.00 MON'

  return (
    <>
      <motion.aside
        animate={{ width: isCollapsed ? 68 : 230 }}
        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        style={{
          background: '#FAFAF8',
          borderRight: '1px solid rgba(28, 25, 23, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: isCollapsed ? '1.25rem 0.5rem' : '1.25rem 1rem',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          zIndex: 10,
          userSelect: 'none',
        }}
      >
        {/* Top: Brand & Collapse Toggle */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              marginBottom: '1.75rem',
              padding: isCollapsed ? '0' : '0 0.35rem',
            }}
          >
            {!isCollapsed ? (
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
                    color: '#181615',
                  }}
                >
                  Torrentia
                </span>
              </Link>
            ) : (
              <button
                onClick={onToggleCollapse}
                title="Expand Sidebar"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: 'rgba(28, 25, 23, 0.06)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#181615',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(28, 25, 23, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(28, 25, 23, 0.06)'
                }}
              >
                <PanelLeftOpen size={18} />
              </button>
            )}

            {!isCollapsed && (
              <button
                onClick={onToggleCollapse}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(28, 25, 23, 0.45)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#181615')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(28, 25, 23, 0.45)')}
                title="Collapse Sidebar"
              >
                <PanelLeftClose size={17} />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {catalogLinks.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  title={isCollapsed ? link.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? '0' : '0.75rem',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: isCollapsed ? '0.65rem 0' : '0.6rem 0.85rem',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#ffffff' : '#57534e',
                    background: isActive ? '#181615' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(28, 25, 23, 0.06)'
                      e.currentTarget.style.color = '#181615'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#57534e'
                    }
                  }}
                >
                  <span style={{ color: isActive ? '#ffffff' : '#57534e', display: 'flex' }}>
                    {link.icon}
                  </span>
                  {!isCollapsed && <span>{link.label}</span>}
                </Link>
              )
            })}

            {/* Section Divider */}
            {!isCollapsed ? (
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#A8A29E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.75rem 0.5rem 0.25rem',
                }}
              >
                Network &amp; Activity
              </div>
            ) : (
              <div
                style={{
                  height: '1px',
                  background: 'rgba(28, 25, 23, 0.08)',
                  margin: '0.45rem 0',
                }}
              />
            )}

            {featureLinks.map((link) => {
              const isActive =
                location.pathname === '/dashboard' && currentTab === link.tab
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  title={isCollapsed ? link.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? '0' : '0.75rem',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: isCollapsed ? '0.65rem 0' : '0.6rem 0.85rem',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#ffffff' : '#57534e',
                    background: isActive ? '#181615' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(28, 25, 23, 0.06)'
                      e.currentTarget.style.color = '#181615'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#57534e'
                    }
                  }}
                >
                  <span style={{ color: isActive ? '#ffffff' : '#57534e', display: 'flex' }}>
                    {link.icon}
                  </span>
                  {!isCollapsed && <span>{link.label}</span>}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section: Docs, Balance, Account */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Docs Link */}
          <a
            href="https://github.com/tyraakj/torrentia"
            target="_blank"
            rel="noopener noreferrer"
            title={isCollapsed ? 'Docs' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              padding: isCollapsed ? '0.55rem 0' : '0.5rem 0.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#57534e',
              fontSize: '0.8125rem',
              fontWeight: 500,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#181615')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#57534e')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <BookOpen size={16} />
              {!isCollapsed && <span>Docs</span>}
            </div>
            {!isCollapsed && <ArrowUpRight size={14} color="rgba(28, 25, 23, 0.4)" />}
          </a>

          {/* Balance Row */}
          {!isCollapsed && isConnected && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                background: '#f5f6f8',
                border: '1px solid rgba(28, 25, 23, 0.06)',
                fontSize: '0.75rem',
                color: '#57534e',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem' }}>💼</span>
                <span>Balance</span>
              </div>
              <span style={{ fontWeight: 700, color: '#181615' }}>{formattedBalance}</span>
            </div>
          )}

          {/* User Account / Connect Pill */}
          <div
            style={{
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(28, 25, 23, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
            }}
          >
            {isConnected && address ? (
              isPasskeyAccount ? (
                isCollapsed ? (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title={`Mera Passkey: ${address}`}
                    onClick={() => disconnect()}
                  >
                    <Key size={14} color="#ffffff" />
                  </div>
                ) : (
                  <div style={{ width: '100%' }}>
                    <PasskeyNavbarBadge address={address} />
                  </div>
                )
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    width: isCollapsed ? 'auto' : '100%',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #181615, #475569)',
                        flexShrink: 0,
                      }}
                    />
                    {!isCollapsed && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          color: '#181615',
                          fontWeight: 600,
                        }}
                      >
                        {address.slice(0, 5)}...{address.slice(-4)}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <button
                      onClick={() => disconnect()}
                      title="Disconnect"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(28, 25, 23, 0.45)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(28, 25, 23, 0.45)')}
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                </div>
              )
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                disabled={isConnecting}
                title={isCollapsed ? 'Connect Wallet' : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isCollapsed ? '0' : '0.5rem',
                  padding: isCollapsed ? '0.6rem 0' : '0.55rem 0.75rem',
                  borderRadius: '8px',
                  background: '#181615',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(24, 22, 21, 0.18)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#292523'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#181615'
                }}
              >
                <Key size={14} />
                {!isCollapsed && <span>Connect</span>}
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      <PasskeyAuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
