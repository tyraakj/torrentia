import React from 'react'
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, HardDrive, Share2, FileCode, Check } from 'lucide-react'
import { getMonadscanTxUrl } from '../../lib/contracts'
import { Button } from '../ui/Button'

export type StepState = 'pending' | 'in-progress' | 'completed' | 'error'

export interface UploadProgressProps {
  currentStep: number // 1 to 4
  chunkProgress: { current: number; total: number }
  ipfsCid: string | null
  txHash: string | null
  error: string | null
  onRetry: () => void
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  currentStep,
  chunkProgress,
  ipfsCid,
  txHash,
  error,
  onRetry,
}) => {
  const steps = [
    {
      step: 1,
      title: 'Chunking & Hashing',
      desc: 'Splitting model file into 1MB chunks and computing SHA-256 hashes locally in browser.',
      icon: <HardDrive size={18} />,
      info: chunkProgress.total > 0
        ? `Processed ${chunkProgress.current} / ${chunkProgress.total} chunks (${Math.round((chunkProgress.current / chunkProgress.total) * 100)}%)`
        : 'Waiting to start...',
    },
    {
      step: 2,
      title: 'Pinning Manifest',
      desc: 'Generating content-addressed ChunkManifest and pinning metadata to IPFS.',
      icon: <FileCode size={18} />,
      info: ipfsCid ? `IPFS CID: ${ipfsCid}` : 'Manifest ready for pinning...',
    },
    {
      step: 3,
      title: 'Registering On-Chain',
      desc: 'Writing model ID, chunk price, and split ratio to ModelRegistry on Monad.',
      icon: <Share2 size={18} />,
      info: txHash ? `Transaction sent to Monad` : 'Awaiting wallet signature...',
    },
    {
      step: 4,
      title: 'Ready to Seed',
      desc: 'Model registered. Chunks stored in local browser IndexedDB; ready to serve peers in the swarm.',
      icon: <Check size={18} />,
      info: 'Seeder active and ready for P2P chunk requests.',
    },
  ]

  const getStepState = (stepNumber: number): StepState => {
    if (error && currentStep === stepNumber) return 'error'
    if (currentStep > stepNumber) return 'completed'
    if (currentStep === stepNumber) return 'in-progress'
    return 'pending'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
      {steps.map((s) => {
        const state = getStepState(s.step)

        const getBorderColor = () => {
          if (state === 'completed') return 'var(--color-success)'
          if (state === 'in-progress') return 'var(--color-accent)'
          if (state === 'error') return 'var(--color-error)'
          return 'var(--color-border-glass)'
        }

        return (
          <div
            key={s.step}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-4) var(--space-6)',
              background: state === 'in-progress'
                ? 'rgba(124, 58, 237, 0.08)'
                : 'rgba(255, 255, 255, 0.75)',
              border: `1px solid ${getBorderColor()}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              transition: 'all var(--transition-normal)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {/* State Icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: state === 'completed'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : state === 'in-progress'
                      ? 'rgba(124, 58, 237, 0.12)'
                      : state === 'error'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(28, 25, 23, 0.05)',
                    color: state === 'completed'
                      ? 'var(--color-success)'
                      : state === 'in-progress'
                      ? '#6d28d9'
                      : state === 'error'
                      ? 'var(--color-error)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {state === 'completed' ? (
                    <CheckCircle2 size={18} />
                  ) : state === 'in-progress' ? (
                    <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : state === 'error' ? (
                    <AlertCircle size={18} />
                  ) : (
                    s.icon
                  )}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: '#1c1917' }}>
                    Step {s.step}: {s.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: '#57534e' }}>
                    {s.desc}
                  </div>
                </div>
              </div>

              {/* Status text */}
              <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                {state === 'completed' && (
                  <span style={{ color: 'var(--color-success)' }}>Completed</span>
                )}
                {state === 'in-progress' && (
                  <span style={{ color: 'var(--color-accent-bright)' }}>In Progress</span>
                )}
                {state === 'error' && (
                  <span style={{ color: 'var(--color-error)' }}>Failed</span>
                )}
                {state === 'pending' && (
                  <span style={{ color: 'var(--color-text-muted)' }}>Pending</span>
                )}
              </div>
            </div>

            {/* Step 1 Progress Bar */}
            {s.step === 1 && state === 'in-progress' && chunkProgress.total > 0 && (
              <div
                style={{
                  marginTop: 'var(--space-3)',
                  height: '6px',
                  background: 'var(--color-bg-primary)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(chunkProgress.current / chunkProgress.total) * 100}%`,
                    background: 'var(--gradient-accent)',
                    transition: 'width 150ms ease-out',
                  }}
                />
              </div>
            )}

            {/* Step Detail Data */}
            <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {s.info}
              {s.step === 3 && txHash && (
                <div style={{ marginTop: '0.25rem' }}>
                  <a
                    href={getMonadscanTxUrl(txHash)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: 'var(--color-accent-bright)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span>View transaction on Monadscan</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Error Retry Bar */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4)',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <span>Error: {error}</span>
          <Button size="sm" variant="destructive" onClick={onRetry}>
            Retry Step
          </Button>
        </div>
      )}
    </div>
  )
}
