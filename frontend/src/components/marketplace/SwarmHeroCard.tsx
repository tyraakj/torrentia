import React from 'react'
import { useAccount } from 'wagmi'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { StarburstGraphic } from './StarburstGraphic'

interface SwarmHeroCardProps {
  onStepClick?: (stepIndex: number) => void
}

export const SwarmHeroCard: React.FC<SwarmHeroCardProps> = ({ onStepClick }) => {
  const { isConnected } = useAccount()

  const steps = [
    {
      title: 'Connect wallet or Mera passkey to Monad Testnet',
      subtitle: 'Authenticated on Monad Testnet (Chain ID 10143)',
      isCompleted: isConnected,
    },
    {
      title: 'P2P Swarm signaling & WebRTC relay mesh',
      subtitle: 'Connected to peer discovery tracker & candidate seeders',
      isCompleted: true,
    },
    {
      title: 'Stream model weights with atomic 70/30 Monad settlement',
      subtitle: 'Select any model below to stream weights peer-to-peer',
      isCompleted: false,
    },
  ]

  const completedCount = steps.filter((s) => s.isCompleted).length

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '20px',
        background: '#ffffff',
        border: '1px solid rgba(28, 25, 23, 0.08)',
        boxShadow: '0 8px 30px rgba(28, 25, 23, 0.04)',
        padding: '1.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '2rem',
        overflow: 'hidden',
        marginBottom: '2rem',
      }}
    >
      {/* Subtle Ambient Radial Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          left: '10%',
          width: '260px',
          height: '140px',
          background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
          filter: 'blur(28px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '15%',
          width: '280px',
          height: '140px',
          background: 'radial-gradient(ellipse, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
          filter: 'blur(28px)',
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
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#8c857e',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Get Started
          </span>

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
                width: '14px',
                height: '14px',
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
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {step.isCompleted ? (
                  <CheckCircle2 size={17} color="#10b981" />
                ) : (
                  <Circle size={17} color="#d1d5db" />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: step.isCompleted ? 600 : 500,
                    color: step.isCompleted ? '#181615' : '#57534e',
                  }}
                >
                  {idx + 1}. {step.title}
                </span>
                {idx === 2 && (
                  <ArrowRight
                    size={14}
                    color="#8c857e"
                    style={{ transition: 'transform 0.15s ease' }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Radiating Starburst Graphic */}
      <div style={{ zIndex: 2 }}>
        <StarburstGraphic />
      </div>
    </div>
  )
}
