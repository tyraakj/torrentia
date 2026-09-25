import React from 'react'
import {
  Lock,
  ShieldCheck,
  Cpu,
  Layers,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import type { IndexedModel } from '../../../lib/types'
import { SPLIT_PAYMENT_V2_ADDRESS } from '../../../lib/contracts'

export interface BatchedSessionsTabProps {
  model?: IndexedModel
}

export const BatchedSessionsTab: React.FC<BatchedSessionsTabProps> = ({ model }) => {
  return (
    <div className="tab-pane-container">
      {/* Top Floating Batch Metric Card */}
      <div className="floating-showcase-card showcase-earning-card">
        <div className="earning-badge-pill">
          <Lock size={12} />
          <span>Zero Gas Waste</span>
        </div>
        <div className="earning-label">Batched Session Channel</div>
        <div className="earning-amount-row">
          <span className="earning-amount font-mono">50 Chunks</span>
          <span className="earning-change">Per Batch</span>
        </div>
        <div className="earning-subtext">
          Signed off-chain EIP-712 vouchers &bull; Aggregated into 1 on-chain tx
        </div>
      </div>

      {/* Floating Security Pill */}
      <div className="floating-showcase-pill showcase-security-pill">
        <ShieldCheck size={13} color="#FFFFFF" />
        <span>Permissionless Batch Settlement</span>
      </div>

      <div className="dashboard-stage-body">
        {/* Main Batch Pipeline Table */}
        <div className="dashboard-table-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(28, 25, 23, 0.06)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#181615' }}>
              SplitPaymentV2 Pipeline &bull; {model?.modelName || 'Protocol Session Pipeline'}
            </span>
            <a
              href={`https://testnet.monadscan.com/address/${SPLIT_PAYMENT_V2_ADDRESS}`}
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
              <span>Contract on Monadscan</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="dashboard-table-head">
            <span>Stage</span>
            <span>Mechanism</span>
            <span>Payload / Cost</span>
            <span className="head-hide-mobile">Execution</span>
          </div>

          <div className="dashboard-table-rows">
            <div className="dashboard-table-row">
              <span className="td-file-cell">
                <span className="chunk-badge">01</span>
                <span className="file-name">Micro-Voucher</span>
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#57534E' }}>
                EIP-712 signed chunk claim
              </span>
              <span className="split-amount" style={{ color: '#059669' }}>
                Instant (0 gas)
              </span>
              <span className="head-hide-mobile">
                <span className="status-badge-settled" style={{ background: '#EFF6FF', color: '#0062FF', border: '1px solid #BFDBFE' }}>
                  <Cpu size={11} />
                  <span>Off-Chain</span>
                </span>
              </span>
            </div>

            <div className="dashboard-table-row">
              <span className="td-file-cell">
                <span className="chunk-badge">02</span>
                <span className="file-name">Session Buffer</span>
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#57534E' }}>
                Aggregates voucher signatures
              </span>
              <span className="split-amount">
                Up to 50 chunks
              </span>
              <span className="head-hide-mobile">
                <span className="status-badge-settled" style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
                  <Layers size={11} />
                  <span>Buffered</span>
                </span>
              </span>
            </div>

            <div className="dashboard-table-row">
              <span className="td-file-cell">
                <span className="chunk-badge">03</span>
                <span className="file-name">On-Chain Batch</span>
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#57534E' }}>
                settleBatch() atomic payout
              </span>
              <span className="split-amount">
                Single TX split
              </span>
              <span className="head-hide-mobile">
                <span className="status-badge-settled">
                  <CheckCircle2 size={11} />
                  <span>Monad 1s</span>
                </span>
              </span>
            </div>
          </div>

          {/* Active Session Status Callout */}
          <div style={{ padding: '1rem 1.25rem', background: '#FAFAF9', borderTop: '1px solid rgba(28, 25, 23, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Clock size={14} color="#78716C" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#44403C', textTransform: 'uppercase' }}>
                Live Session Channel Status
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#78716C', margin: 0, lineHeight: 1.45 }}>
              No active download session channels currently buffering vouchers for this model. Channels open dynamically when downloaders stream chunks via WebRTC and close upon batch settlement on Monad.
            </p>
          </div>
        </div>

        {/* Batched Architecture Diagnostics Card */}
        <div className="dashboard-donut-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div className="donut-card-title">Off-Chain + On-Chain Batching</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', background: '#EFF6FF', color: '#0062FF', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                <CheckCircle2 size={11} />
                <span>SplitPaymentV2</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#57534E', lineHeight: '1.45', marginBottom: '0.75rem' }}>
              Instead of submitting an on-chain transaction for every 1MB chunk, downloaders sign cryptographic EIP-712 vouchers over WebRTC. The seeder aggregates these vouchers into 50-chunk batches settled in a single Monad transaction.
            </p>

            <div style={{ background: '#F5F5F4', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(28, 25, 23, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#44403C', marginBottom: '0.25rem' }}>
                <span>Gas Efficiency</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>98% Less Gas</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#E7E5E4', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: '98%', height: '100%', background: '#10B981', borderRadius: '9999px' }} />
              </div>
            </div>
          </div>

          <div className="donut-footer-callout">
            <strong>Permissionless Relaying:</strong> Any node or seeder can submit the settled batch to Monad Testnet without risk—funds are locked to the creator and seeder addresses designated in the cryptographic vouchers.
          </div>
        </div>
      </div>
    </div>
  )
}
