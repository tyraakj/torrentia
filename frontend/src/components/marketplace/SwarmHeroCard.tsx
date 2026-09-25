import React from 'react'
import { useAccount } from 'wagmi'
import { CheckCircle2, Circle, ArrowRight, ShieldCheck, Cpu, Server } from 'lucide-react'

interface SwarmHeroCardProps {
  onStepClick?: (stepIndex: number) => void
}

export const SwarmHeroCard: React.FC<SwarmHeroCardProps> = ({ onStepClick }) => {
  const { isConnected } = useAccount()

  const steps = [
    {
      title: 'Connect wallet or passkey to Monad Testnet',
      subtitle: 'Instant authentication on Monad Testnet',
      isCompleted: isConnected,
    },
    {
      title: 'Join the community sharing network',
      subtitle: 'Direct browser peer connections & 24/7 CLI nodes',
      isCompleted: true,
    },
    {
      title: 'Download AI models with instant creator earnings',
      subtitle: 'Creator-set royalty splits (up to 99%) settled in 1 second',
      isCompleted: false,
    },
  ]

  const completedCount = steps.filter((s) => s.isCompleted).length

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '24px',
        background: '#F7F5F0',
        border: '1px solid rgba(28, 25, 23, 0.08)',
        boxShadow: '0 8px 30px rgba(28, 25, 23, 0.04)',
        padding: '1.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '2.5rem',
        overflow: 'hidden',
        marginBottom: '2rem',
      }}
    >
      {/* Subtle Sky-Ice ambient corner highlight */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '260px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(0, 98, 255, 0.08) 0%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* Left Column: Onboarding Steps */}
      <div style={{ flex: 1, minWidth: '280px', zIndex: 2 }}>
        {/* Top Header Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#0062FF',
                background: 'rgba(0, 98, 255, 0.08)',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Get Started
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#065f46',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
            }}
          >
            <span>{completedCount}/3 Completed</span>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: '2px solid rgba(16, 185, 129, 0.25)',
                borderTopColor: '#10b981',
                transform: 'rotate(45deg)',
              }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {steps.map((step, idx) => (
            <div
              key={idx}
              onClick={() => onStepClick && onStepClick(idx)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                cursor: idx === 2 ? 'pointer' : 'default',
                padding: '0.4rem 0.5rem',
                borderRadius: '12px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (idx === 2) e.currentTarget.style.background = 'rgba(0, 98, 255, 0.05)'
              }}
              onMouseLeave={(e) => {
                if (idx === 2) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {step.isCompleted ? (
                  <CheckCircle2 size={17} color="#059669" />
                ) : (
                  <Circle size={17} color="#A8A29E" />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: step.isCompleted ? 700 : 600,
                      color: step.isCompleted ? '#181615' : '#44403C',
                    }}
                  >
                    {idx + 1}. {step.title}
                  </span>
                  {idx === 2 && (
                    <ArrowRight
                      size={14}
                      color="#0062FF"
                      style={{ transition: 'transform 0.15s ease' }}
                    />
                  )}
                </div>
                <span style={{ fontSize: '0.76rem', color: '#78716C' }}>
                  {step.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Floating Feature Showcase Card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          minWidth: '240px',
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '0.85rem 1.15rem',
            border: '1px solid rgba(28, 25, 23, 0.07)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0, 98, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0062FF',
              flexShrink: 0,
            }}
          >
            <Cpu size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#78716C', textTransform: 'uppercase', fontWeight: 600 }}>
              Direct Device P2P
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#181615' }}>
              Zero Cloud Egress
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '0.85rem 1.15rem',
            border: '1px solid rgba(28, 25, 23, 0.07)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#78716C', textTransform: 'uppercase', fontWeight: 600 }}>
              Creator Royalties
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
              Set Your Own (Up to 99%)
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '0.85rem 1.15rem',
            border: '1px solid rgba(28, 25, 23, 0.07)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(124, 58, 237, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7C3AED',
              flexShrink: 0,
            }}
          >
            <Server size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#78716C', textTransform: 'uppercase', fontWeight: 600 }}>
              Hosting Support
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#181615' }}>
              Browser &amp; 24/7 CLI Nodes
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
