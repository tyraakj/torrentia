import React, { useEffect, useState } from 'react'
import {
  Radio,
  TrendingUp,
  Cpu,
  Globe,
  Terminal,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react'
import type { IndexedModel, SeederRecord } from '../../../lib/types'
import { getGlobalSignalingClient } from '../../../hooks/use-p2p'

export interface SwarmMeshTabProps {
  model?: IndexedModel
}

export const SwarmMeshTab: React.FC<SwarmMeshTabProps> = ({ model }) => {
  const [seeders, setSeeders] = useState<SeederRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCli, setCopiedCli] = useState(false)

  const signaling = getGlobalSignalingClient()

  const refreshSeeders = async () => {
    setIsLoading(true)
    try {
      if (!signaling.isConnected) {
        signaling.connect()
      }
      const records = model?.modelId
        ? await signaling.querySeeders(model.modelId)
        : []
      setSeeders(records || [])
    } catch (err) {
      console.warn('Failed to query seeders from signaling hub:', err)
      setSeeders([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const poll = async () => {
      if (!isMounted) return
      await refreshSeeders()
    }

    void poll()
    const timer = setInterval(() => {
      void poll()
    }, 10000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [model?.modelId])

  const cliCommand = model?.modelId
    ? `torrentia-seeder --model ${model.modelId}`
    : `torrentia-seeder --signal wss://torrentia-signaling.onrender.com/ws`

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommand).catch(() => {})
    setCopiedCli(true)
    setTimeout(() => setCopiedCli(false), 2000)
  }

  const cliSeeders = seeders.filter((s) => Boolean(s.isHttpSeeder))
  const browserSeeders = seeders.filter((s) => !s.isHttpSeeder)

  return (
    <div className="tab-pane-container">
      {/* Top Floating Network Metric Card */}
      <div className="floating-showcase-card showcase-earning-card">
        <div className="earning-badge-pill">
          <Radio size={12} />
          <span>Zero Cloud Middlemen</span>
        </div>
        <div className="earning-label">Active Network Presence</div>
        <div className="earning-amount-row">
          <span className="earning-amount font-mono">{seeders.length} Nodes</span>
          <span className="earning-change">
            {seeders.length > 0 ? 'Network Online' : 'Awaiting Nodes'}
          </span>
        </div>
        <div className="earning-subtext">
          {browserSeeders.length} browser peers &bull; {cliSeeders.length} daemon nodes
        </div>
      </div>

      {/* Floating Pill */}
      <div className="floating-showcase-pill showcase-security-pill">
        <TrendingUp size={13} color="#FFFFFF" />
        <span>Direct Device-to-Device Sharing</span>
      </div>

      <div className="dashboard-stage-body">
        {/* Main Community Nodes Table */}
        <div className="dashboard-table-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(28, 25, 23, 0.06)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#181615' }}>
              Connected Community Nodes ({seeders.length})
            </span>
            <button
              onClick={() => void refreshSeeders()}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                color: '#0062FF',
                fontWeight: 600,
              }}
              title="Refresh Network Status"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="dashboard-table-head">
            <span>Peer ID / Node</span>
            <span>Type</span>
            <span>Chunks Hosted</span>
            <span className="head-hide-mobile">Connection</span>
          </div>

          {isLoading && seeders.length === 0 ? (
            <div className="tab-loading-state">
              <RefreshCw size={18} className="animate-spin" />
              <span>Discovering peers across community network...</span>
            </div>
          ) : seeders.length === 0 ? (
            <div className="tab-empty-state">
              <div className="empty-state-icon">
                <Radio size={28} color="#0062FF" />
              </div>
              <h4 className="empty-state-title">No Active Nodes Discovered</h4>
              <p className="empty-state-desc">
                Currently no browser peers or daemon hosts are broadcasting chunks for this model. Run the CLI node or open a sharing tab to join the network.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={handleCopyCli} className="empty-action-btn">
                  {copiedCli ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                  <span>{copiedCli ? 'CLI Command Copied!' : 'Copy Node CLI Command'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="dashboard-table-rows">
              {seeders.map((s, idx) => {
                const isCli = Boolean(s.isHttpSeeder)
                return (
                  <div key={s.peerId || idx} className="dashboard-table-row">
                    <span className="td-file-cell">
                      <span className="chunk-badge">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="file-name font-mono">{s.peerId.slice(0, 16)}...</span>
                    </span>
                    <span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          color: isCli ? '#7C3AED' : '#0062FF',
                          background: isCli ? '#F5F3FF' : '#EFF6FF',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          fontWeight: 600,
                        }}
                      >
                        {isCli ? <Terminal size={11} /> : <Globe size={11} />}
                        <span>{isCli ? 'CLI Daemon' : 'Browser WebRTC'}</span>
                      </span>
                    </span>
                    <span className="split-amount">{s.chunksHeld.length} / {model?.chunkCount || 1} chunks</span>
                    <span className="head-hide-mobile">
                      <span className="status-badge-settled">
                        <Check size={11} />
                        <span>Connected</span>
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Community Mesh Diagnostics Card */}
        <div className="dashboard-donut-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div className="donut-card-title">Community Network Topology</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', background: '#ECFDF5', color: '#059669', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                <Cpu size={11} />
                <span>WebRTC Mesh</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#57534E', lineHeight: '1.45', marginBottom: '1rem' }}>
              Files download simultaneously from multiple nearby supporters over WebRTC DataChannels, eliminating central bandwidth bottlenecks and server hosting bills.
            </p>

            <div style={{ background: '#F5F5F4', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(28, 25, 23, 0.08)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78716C', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Run Persistent Headless Seeder
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <code style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#181615', wordBreak: 'break-all' }}>
                  {cliCommand}
                </code>
                <button
                  onClick={handleCopyCli}
                  style={{
                    background: 'white',
                    border: '1px solid #D6D3D1',
                    borderRadius: '6px',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                  title="Copy command"
                >
                  {copiedCli ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                  <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="donut-footer-callout">
            <strong>Zero Cloud Middlemen:</strong> Seeders stream encrypted binary slices directly to peers. Bandwidth is absorbed organically by the network, not your cloud balance.
          </div>
        </div>
      </div>
    </div>
  )
}
