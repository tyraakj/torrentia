import React, { useEffect, useState, useCallback } from 'react'
import { Radio, Users, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { SeederRecord } from '../../lib/types'
import { useSignaling } from '../../hooks/use-p2p'
import { AddressDisplay } from '../ui/AddressDisplay'

export interface SeederPanelProps {
  modelId: string
  totalChunks: number
  className?: string
  style?: React.CSSProperties
}

export const SeederPanel: React.FC<SeederPanelProps> = ({
  modelId,
  totalChunks,
  style,
}) => {
  const { client, status: signalingStatus } = useSignaling()
  const [seeders, setSeeders] = useState<SeederRecord[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchSeeders = useCallback(async () => {
    if (!modelId || !client.isConnected) return
    setIsRefreshing(true)
    try {
      const activeSeeders = await client.querySeeders(modelId)
      setSeeders(activeSeeders)
      setLastUpdated(new Date())
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false)
    }
  }, [modelId, client])

  // Periodic polling every 3 seconds for live swarm awareness
  useEffect(() => {
    let isMounted = true
    const poll = () => {
      if (!modelId || !client.isConnected) return
      void client.querySeeders(modelId).then((activeSeeders) => {
        if (isMounted) {
          setSeeders(activeSeeders)
          setLastUpdated(new Date())
        }
      }).catch(() => {
        // ignore
      })
    }

    poll()
    const interval = setInterval(poll, 3000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [client, modelId])

  const onlineCount = seeders.length

  return (
    <div
      className="glass"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: onlineCount > 0 ? 'var(--color-success)' : 'var(--color-warning)',
              boxShadow: onlineCount > 0 ? '0 0 10px var(--color-success)' : 'none',
              animation: onlineCount > 0 ? 'pulseGlow 2s infinite' : 'none',
            }}
          />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Community Hosts ({onlineCount})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => void fetchSeeders()}
          disabled={isRefreshing}
          title="Refresh hosts"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: isRefreshing ? 'wait' : 'pointer',
            fontSize: 'var(--text-xs)',
          }}
        >
          <RefreshCw
            size={12}
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{isRefreshing ? 'Checking...' : 'Live'}</span>
        </button>
      </div>

      {/* Tracker Connection Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#78716c',
          padding: '0.35rem 0.6rem',
          background: 'rgba(28, 25, 23, 0.04)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(28, 25, 23, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Radio size={12} color={signalingStatus === 'connected' ? 'var(--color-success)' : 'var(--color-warning)'} />
          <span>Network: {signalingStatus === 'connected' ? 'Connected' : 'Reconnecting...'}</span>
        </div>
        <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
      </div>

      {/* Peer List or Empty State */}
      {onlineCount === 0 ? (
        <div
          style={{
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-md)',
            background: 'hsla(40, 90%, 60%, 0.05)',
            border: '1px dashed hsla(40, 90%, 60%, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <AlertCircle size={24} color="var(--color-warning)" />
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
            No community hosts online right now
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', maxWidth: '320px', lineHeight: 1.4 }}>
            This model currently has no active online hosts. Leave this page open or run the CLI seeder to host it and earn automatic rewards.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
          {seeders.map((seeder) => {
            const heldCount = seeder.chunksHeld.length
            const isFullSeed = totalChunks > 0 && heldCount >= totalChunks
            const percentage = totalChunks > 0 ? Math.round((heldCount / totalChunks) * 100) : 100

            return (
              <div
                key={seeder.peerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(28, 25, 23, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={14} color="var(--color-seeder-share)" />
                  <div>
                    <AddressDisplay address={seeder.seederAddress} chars={3} showLink={false} />
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Provider {seeder.peerId.slice(0, 8)}...
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {isFullSeed ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-success)',
                        background: 'hsla(155, 75%, 55%, 0.1)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      <CheckCircle2 size={11} />
                      Full copy ({heldCount}/{totalChunks})
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-info)',
                        background: 'hsla(200, 85%, 60%, 0.1)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      {percentage}% ({heldCount}/{totalChunks})
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
