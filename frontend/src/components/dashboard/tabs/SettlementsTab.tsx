import React from 'react'
import { formatEther } from 'viem'
import {
  ShieldCheck,
  MousePointer2,
  ExternalLink,
  Lock,
  Clock,
} from 'lucide-react'
import type { IndexedModel } from '../../../lib/types'
import { useModelPayments } from '../../../hooks/use-models'
import { truncateAddress } from '../../../lib/utils'
import { SPLIT_PAYMENT_ADDRESS } from '../../../lib/contracts'

export interface SettlementsTabProps {
  model?: IndexedModel
}

export const SettlementsTab: React.FC<SettlementsTabProps> = ({ model }) => {
  const { data: payments = [], isLoading } = useModelPayments(model?.modelId)

  // Real on-chain split calculation from model.creatorShareBps
  const creatorBps = model?.creatorShareBps || 7000
  const creatorPct = Math.min(99, Math.max(1, Math.round(creatorBps / 100)))
  const hostPct = 100 - creatorPct

  // SVG Donut calculation (r=32, circumference = 2 * PI * 32 ≈ 201.06)
  const circumference = 201.06
  const creatorOffset = circumference * (1 - creatorPct / 100)
  const hostOffset = circumference * (1 - hostPct / 100)
  const hostRotation = (creatorPct / 100) * 360 - 90

  // Calculate total earnings on this model
  const chunkPrice = model?.chunkPrice || 0n
  const creatorRoyaltyPerChunk = (chunkPrice * BigInt(creatorBps)) / 10000n
  const totalModelEarningsWei = creatorRoyaltyPerChunk * BigInt(payments.length)
  const totalModelEarningsMon = parseFloat(formatEther(totalModelEarningsWei)).toFixed(6)

  return (
    <div className="tab-pane-container">
      {/* Floating Total Earning Card (Top Right) */}
      <div className="floating-showcase-card showcase-earning-card">
        <div className="earning-badge-pill">
          <Lock size={12} />
          <span>Real On-Chain Split</span>
        </div>
        <div className="earning-label">Settled Creator Royalties</div>
        <div className="earning-amount-row">
          <span className="earning-amount font-mono">{totalModelEarningsMon} MON</span>
          <span className="earning-change">{creatorPct}% Split</span>
        </div>
        <div className="earning-subtext">
          {payments.length} verified chunk settlements &bull; $0 cloud bills
        </div>
      </div>

      {/* Floating Security Pill */}
      <div className="floating-showcase-pill showcase-security-pill">
        <ShieldCheck size={13} color="#FFFFFF" />
        <span>Atomic Monad Settlement &bull; 0% Middlemen</span>
      </div>

      <div className="dashboard-stage-body">
        {/* Main Settlement Ledger Table */}
        <div className="dashboard-table-card">
          <div className="dashboard-table-head">
            <span>Model File</span>
            <span>Community Host</span>
            <span>Creator Split</span>
            <span className="head-hide-mobile">Monad Settlement</span>
            <span className="head-hide-mobile">Status</span>
          </div>

          {isLoading ? (
            <div className="tab-loading-state">
              <Clock size={18} className="animate-spin" />
              <span>Querying Monad Testnet event stream...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="tab-empty-state">
              <div className="empty-state-icon">
                <ShieldCheck size={28} color="#0062FF" />
              </div>
              <h4 className="empty-state-title">No Settlement Transactions Yet</h4>
              <p className="empty-state-desc">
                Transactions will stream here in real time as downloaders fetch model chunks and execute atomic payments on Monad Testnet (Chain ID 10143).
              </p>
              <a
                href={`https://testnet.monadscan.com/address/${SPLIT_PAYMENT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="empty-state-link"
              >
                <span>View SplitPayment Contract on Monadscan</span>
                <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <div className="dashboard-table-rows">
              {payments.map((payment, idx) => {
                const formattedPaid = parseFloat(formatEther(payment.creatorAmount)).toFixed(6)
                const hostAddr = payment.seeder || '0x0000...0000'
                return (
                  <div key={payment.txHash || idx} className="dashboard-table-row">
                    <span className="td-file-cell">
                      <span className="chunk-badge">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="file-name">{model?.modelName || 'Model Chunk'}</span>
                    </span>
                    <span>
                      <a
                        href={`https://testnet.monadscan.com/address/${hostAddr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="host-link"
                      >
                        {truncateAddress(hostAddr)}
                      </a>
                    </span>
                    <span className="split-amount">+{formattedPaid} MON</span>
                    <span className="speed-tag head-hide-mobile">
                      {payment.txHash ? (
                        <a
                          href={`https://testnet.monadscan.com/tx/${payment.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <span>Verified</span>
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        'Confirmed'
                      )}
                    </span>
                    <span className="head-hide-mobile">
                      <span className="status-badge-settled">
                        <ShieldCheck size={11} />
                        <span>Settled</span>
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Dynamic Donut Royalty Card */}
        <div className="dashboard-donut-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div className="donut-card-title">Royalty Distribution</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', background: '#EFF6FF', color: '#0062FF', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                <MousePointer2 size={11} />
                <span>You (Creator)</span>
              </div>
            </div>

            <div className="donut-chart-row">
              <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" stroke="#E2E8F0" strokeWidth="9" fill="none" />
                  {/* Creator Arc */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="#0062FF"
                    strokeWidth="9"
                    strokeDasharray="201.06"
                    strokeDashoffset={creatorOffset}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 40 40)"
                  />
                  {/* Community Hosts Arc */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="#10B981"
                    strokeWidth="9"
                    strokeDasharray="201.06"
                    strokeDashoffset={hostOffset}
                    strokeLinecap="round"
                    fill="none"
                    transform={`rotate(${hostRotation} 40 40)`}
                  />
                  <text
                    x="40"
                    y="45"
                    textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace"
                    fontSize="13"
                    fontWeight="700"
                    fill="#0062FF"
                  >
                    {creatorPct}%
                  </text>
                </svg>
              </div>

              <div className="donut-legend-wrap" style={{ flex: 1 }}>
                <div className="legend-item-row">
                  <span className="legend-dot-label">
                    <span className="legend-color-dot dot-creator-blue" />
                    <span>Creator</span>
                  </span>
                  <span className="legend-share-pct" style={{ color: '#0062FF' }}>{creatorPct}%</span>
                </div>

                <div className="legend-item-row">
                  <span className="legend-dot-label">
                    <span className="legend-color-dot dot-hosts-green" />
                    <span>Community Hosts</span>
                  </span>
                  <span className="legend-share-pct" style={{ color: '#10B981' }}>{hostPct}%</span>
                </div>

                <div className="legend-item-row">
                  <span className="legend-dot-label">
                    <span className="legend-color-dot dot-cloud-gray" />
                    <span>Middlemen</span>
                  </span>
                  <span className="legend-share-pct" style={{ color: '#64748B' }}>0%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="donut-footer-callout">
            <strong>Atomic Monad Settlement:</strong> Programmed directly into ModelRegistry on Monad Testnet. Every chunk download pays {creatorPct}% to your address and {hostPct}% to the seeder with 0% platform fees.
          </div>
        </div>
      </div>
    </div>
  )
}
