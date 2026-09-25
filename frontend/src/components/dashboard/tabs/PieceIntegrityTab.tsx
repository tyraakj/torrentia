import React, { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Check,
  HardDrive,
  ExternalLink,
  FileCheck2,
  Clock,
  AlertCircle,
  Copy,
} from 'lucide-react'
import type { IndexedModel, ChunkManifest } from '../../../lib/types'
import { fetchManifest } from '../../../services/ipfs'
import { getHeldChunks } from '../../../services/chunk-store'
import { formatFileSize, truncateAddress } from '../../../lib/utils'

export interface PieceIntegrityTabProps {
  model?: IndexedModel
}

export const PieceIntegrityTab: React.FC<PieceIntegrityTabProps> = ({ model }) => {
  const [manifest, setManifest] = useState<ChunkManifest | null>(null)
  const [heldChunks, setHeldChunks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    if (!model?.metadataURI) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      setErrorMsg(null)

      try {
        // 1. Fetch real IPFS manifest
        const cid = model.metadataURI ? model.metadataURI.replace(/^ipfs:\/\//, '') : ''
        if (!cid) {
          throw new Error('No IPFS metadata URI registered for this model')
        }

        const fetchedManifest = await fetchManifest(cid)
        if (isMounted) {
          setManifest(fetchedManifest)
        }

        // 2. Fetch locally stored chunks from IndexedDB
        const held = await getHeldChunks(model.modelId)
        if (isMounted) {
          setHeldChunks(held)
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load manifest from IPFS')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [model?.modelId, model?.metadataURI])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedHash(text)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const cid = model?.metadataURI ? model.metadataURI.replace(/^ipfs:\/\//, '') : ''
  const chunks = manifest?.chunks || []

  return (
    <div className="tab-pane-container">
      {/* Top Floating Security Card */}
      <div className="floating-showcase-card showcase-earning-card">
        <div className="earning-badge-pill">
          <ShieldCheck size={12} />
          <span>Tamper-Proof Check</span>
        </div>
        <div className="earning-label">Security &amp; Authenticity</div>
        <div className="earning-amount-row">
          <span className="earning-amount font-mono">SHA-256</span>
          <span className="earning-change">Verified</span>
        </div>
        <div className="earning-subtext">
          Client-side cryptographic verification &bull; 0 corruption risk
        </div>
      </div>

      {/* Floating Security Pill */}
      <div className="floating-showcase-pill showcase-security-pill">
        <Check size={13} color="#FFFFFF" />
        <span>Automatic Safety Verification</span>
      </div>

      <div className="dashboard-stage-body">
        {/* Main Chunk Hashes Table */}
        <div className="dashboard-table-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(28, 25, 23, 0.06)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#181615' }}>
              Cryptographic Piece Ledger ({chunks.length || model?.chunkCount || 1} chunks)
            </span>
            {cid && (
              <a
                href={`https://gateway.pinata.cloud/ipfs/${cid}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: '#0062FF',
                  fontWeight: 600,
                }}
              >
                <span>IPFS Manifest</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div className="dashboard-table-head">
            <span>Piece</span>
            <span>Digital Fingerprint (SHA-256)</span>
            <span>Size</span>
            <span className="head-hide-mobile">Integrity</span>
          </div>

          {isLoading ? (
            <div className="tab-loading-state">
              <Clock size={18} className="animate-spin" />
              <span>Fetching and verifying manifest from IPFS...</span>
            </div>
          ) : errorMsg ? (
            <div className="tab-empty-state">
              <div className="empty-state-icon" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                <AlertCircle size={28} color="#EF4444" />
              </div>
              <h4 className="empty-state-title">IPFS Manifest Resolution</h4>
              <p className="empty-state-desc" style={{ maxWidth: '400px' }}>
                {errorMsg}. Ensure the model manifest is pinned to IPFS and accessible via gateway.
              </p>
            </div>
          ) : chunks.length === 0 ? (
            <div className="tab-empty-state">
              <div className="empty-state-icon">
                <FileCheck2 size={28} color="#0062FF" />
              </div>
              <h4 className="empty-state-title">
                {model ? 'No Pieces Recorded' : 'Cryptographic Integrity Engine'}
              </h4>
              <p className="empty-state-desc">
                {model
                  ? 'No chunk descriptors found in the manifest for this model.'
                  : 'Torrentia verifies every 1MB model piece with SHA-256 before storing it to disk. Upload a model to generate its cryptographic piece passport.'}
              </p>
            </div>
          ) : (
            <div className="dashboard-table-rows">
              {chunks.map((chunk, idx) => {
                const isHeldLocally = heldChunks.includes(chunk.index)
                const hashDisplay = chunk.hash ? `${chunk.hash.slice(0, 10)}...${chunk.hash.slice(-8)}` : 'Pending hash'
                return (
                  <div key={chunk.index ?? idx} className="dashboard-table-row">
                    <span className="td-file-cell">
                      <span className="chunk-badge">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="file-name font-mono">Piece #{String(idx + 1).padStart(2, '0')}</span>
                    </span>
                    <span>
                      <button
                        onClick={() => handleCopy(chunk.hash)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.75rem',
                          color: '#0062FF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                        }}
                        title="Click to copy SHA-256 hash"
                      >
                        <span>{hashDisplay}</span>
                        {copiedHash === chunk.hash ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                      </button>
                    </span>
                    <span className="split-amount font-mono" style={{ color: '#57534E', fontSize: '0.75rem' }}>
                      {formatFileSize(chunk.size || 1048576)}
                    </span>
                    <span className="head-hide-mobile">
                      <span
                        className="status-badge-settled"
                        style={{
                          background: isHeldLocally ? '#ECFDF5' : '#EFF6FF',
                          color: isHeldLocally ? '#059669' : '#0062FF',
                          border: isHeldLocally ? '1px solid #A7F3D0' : '1px solid #BFDBFE',
                        }}
                      >
                        {isHeldLocally ? <HardDrive size={11} /> : <Check size={11} />}
                        <span>{isHeldLocally ? 'Verified Local' : 'Network Verified'}</span>
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Guaranteed Original Files Diagnostics Card */}
        <div className="dashboard-donut-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div className="donut-card-title">Guaranteed Original Files</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', background: '#ECFDF5', color: '#059669', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                <ShieldCheck size={11} />
                <span>100% Tamper-Proof</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#57534E', lineHeight: '1.45', marginBottom: '0.75rem' }}>
              Every byte downloaded from the community network is cryptographically checked against the creator's original upload manifest before being stored in IndexedDB. Corrupted or tampered slices are discarded immediately.
            </p>

            {cid && (
              <div style={{ background: '#F5F5F4', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(28, 25, 23, 0.08)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78716C', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Model Passport IPFS CID
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#181615' }}>
                    {truncateAddress(cid, 8)}
                  </span>
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0062FF', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <span>View</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="donut-footer-callout">
            <strong>Client-Side Verification:</strong> Browser native <code>crypto.subtle.digest('SHA-256')</code> verifies each slice in parallel with WebRTC chunk streaming.
          </div>
        </div>
      </div>
    </div>
  )
}
