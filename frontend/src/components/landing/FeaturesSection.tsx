import React, { useState } from 'react'
import {
  Radio,
  Layers,
  Lock,
  ShieldCheck,
  TrendingUp,
  Check,
  MousePointer2,
} from 'lucide-react'

type TabKey = 'splits' | 'webrtc' | 'gate' | 'integrity'

interface TabConfig {
  id: TabKey
  title: string
  shortTitle: string
  icon: React.ReactNode
  desc: string
  ctaText: string
}

export const FeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('splits')

  const tabs: TabConfig[] = [
    {
      id: 'webrtc',
      title: 'Direct Device Sharing',
      shortTitle: 'Direct Sharing',
      icon: <Radio size={18} />,
      desc: 'Files download directly from nearby devices at lightning speed without passing through slow central servers.',
      ctaText: 'Browse Network ↗',
    },
    {
      id: 'splits',
      title: 'Creator-Set Revenue Splits',
      shortTitle: 'Custom Splits',
      icon: <Layers size={18} />,
      desc: 'You decide your own earnings split (up to 99%). Every download automatically pays you directly, while rewarding the community members who help host your model.',
      ctaText: 'See How Payouts Work ↗',
    },
    {
      id: 'gate',
      title: 'Batched Session Settlements',
      shortTitle: 'Batched Payouts',
      icon: <Lock size={18} />,
      desc: 'Off-chain chunk vouchers settle in gas-optimized batches on Monad—streaming models continuously without spamming the network.',
      ctaText: 'Learn Batched Streaming ↗',
    },
    {
      id: 'integrity',
      title: '100% Verified & Safe',
      shortTitle: 'Safe & Verified',
      icon: <ShieldCheck size={18} />,
      desc: 'Every download is automatically checked for security and authenticity to ensure models are never corrupted or tampered with.',
      ctaText: 'Security Details ↗',
    },
  ]

  return (
    <section className="features-editorial-section" id="features">
      <div className="features-editorial-container">
        {/* Section Header */}
        <div className="features-editorial-header">
          <div className="section-eyebrow">Core Capabilities</div>
          <h2 className="features-editorial-heading">
            Direct Sharing &amp; Instant Earnings
          </h2>
          <p className="features-editorial-lead">
            Essential tools that let you share large AI models directly between browsers, verify file safety, and get paid instantly without cloud middlemen.
          </p>
        </div>

        {/* 2-Column Split: Tabs on Left, Dynamic Showcase on Right */}
        <div className="features-editorial-body">
          {/* Left Column: Interactive Vertical Tabs */}
          <div className="features-tabs-stack">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`feature-tab-card ${isActive ? 'tab-card-active' : 'tab-card-inactive'}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveTab(tab.id)
                    }
                  }}
                >
                  <div className="tab-card-header">
                    <div className={`tab-icon-wrap ${isActive ? 'tab-icon-active' : 'tab-icon-inactive'}`}>
                      {tab.icon}
                    </div>
                    <span className="tab-card-title">{tab.title}</span>

                    {isActive && (
                      <div className="tab-active-spinner" title="Active selection" />
                    )}
                  </div>

                  {isActive && (
                    <div className="tab-card-details">
                      <p className="tab-card-description">{tab.desc}</p>
                      <div className="tab-card-cta">
                        <span>{tab.ctaText}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Column: Organic Rounded Ice Showcase Container */}
          <div className="features-showcase-wrapper">
            <div className="features-showcase-backdrop">
              {/* Dynamic Content: Tab 1 (Splits) */}
              {activeTab === 'splits' && (
                <div className="showcase-content-scene scene-splits">
                  {/* Floating Total Earning Card (Top Right) */}
                  <div className="floating-showcase-card showcase-earning-card">
                    <div className="earning-badge-pill">
                      <Lock size={12} />
                      <span>Instant Automatic Payouts</span>
                    </div>
                    <div className="earning-label">Example Model Earnings</div>
                    <div className="earning-amount-row">
                      <span className="earning-amount font-mono">14.20 MON</span>
                      <span className="earning-change">Per 1,000 DLs</span>
                    </div>
                    <div className="earning-subtext">Calculated at 85% creator split &bull; $0 cloud bills</div>
                  </div>

                  {/* Floating Left Pill */}
                  <div className="floating-showcase-pill showcase-security-pill">
                    <ShieldCheck size={13} color="#FFFFFF" />
                    <span>Instant Payouts &amp; Zero Lag</span>
                  </div>

                  {/* Main Transaction / Transfer Ledger Table Card */}
                  <div className="showcase-table-card">
                    <div className="showcase-table-head">
                      <span className="th-cell th-chunk">Model File</span>
                      <span className="th-cell th-peer">Community Host</span>
                      <span className="th-cell th-split">Your Split (e.g. 85%)</span>
                      <span className="th-cell th-time">Time</span>
                    </div>

                    <div className="showcase-table-rows">
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk">
                          <span className="chunk-chip">01</span>
                          <span className="chunk-label">Llama-3-8B.bin</span>
                        </span>
                        <span className="td-cell td-peer">0x72a9...e41b</span>
                        <span className="td-cell td-split font-mono">+0.085 MON</span>
                        <span className="td-cell td-time">0.8s ago</span>
                      </div>

                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk">
                          <span className="chunk-chip">02</span>
                          <span className="chunk-label">Mistral-7B.bin</span>
                        </span>
                        <span className="td-cell td-peer">0x38fe...9921</span>
                        <span className="td-cell td-split font-mono">+0.085 MON</span>
                        <span className="td-cell td-time">1.4s ago</span>
                      </div>

                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk">
                          <span className="chunk-chip">03</span>
                          <span className="chunk-label">Phi-3-Mini.bin</span>
                        </span>
                        <span className="td-cell td-peer">0x91d4...aa02</span>
                        <span className="td-cell td-split font-mono">+0.085 MON</span>
                        <span className="td-cell td-time">2.1s ago</span>
                      </div>

                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk">
                          <span className="chunk-chip">04</span>
                          <span className="chunk-label">Gemma-2-9B.bin</span>
                        </span>
                        <span className="td-cell td-peer">0x15bc...301f</span>
                        <span className="td-cell td-split font-mono">+0.085 MON</span>
                        <span className="td-cell td-time">2.9s ago</span>
                      </div>

                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk">
                          <span className="chunk-chip">05</span>
                          <span className="chunk-label">Qwen-2.5-7B.bin</span>
                        </span>
                        <span className="td-cell td-peer">0x88f2...10ce</span>
                        <span className="td-cell td-split font-mono">+0.085 MON</span>
                        <span className="td-cell td-time">3.6s ago</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Overlay Donut Ring Card (Bottom Left) */}
                  <div className="floating-donut-card">
                    <div className="donut-chart-wrap">
                      <svg width="76" height="76" viewBox="0 0 80 80" className="donut-svg">
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="#E2E8F0"
                          strokeWidth="9"
                          fill="none"
                        />
                        {/* 85% Creator Stroke */}
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="#0062FF"
                          strokeWidth="9"
                          strokeDasharray="201.06"
                          strokeDashoffset="30.15"
                          strokeLinecap="round"
                          fill="none"
                          transform="rotate(-90 40 40)"
                        />
                        {/* 15% Host Stroke */}
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="#10B981"
                          strokeWidth="9"
                          strokeDasharray="201.06"
                          strokeDashoffset="170.9"
                          strokeLinecap="round"
                          fill="none"
                          transform="rotate(216 40 40)"
                        />
                        <text
                          x="40"
                          y="45"
                          textAnchor="middle"
                          fontFamily="'JetBrains Mono', monospace"
                          fontSize="14"
                          fontWeight="700"
                          fill="#0062FF"
                        >
                          85%
                        </text>
                      </svg>
                    </div>

                    <div className="donut-details">
                      <div className="donut-title">Example Creator Split</div>
                      <div className="donut-legend-item">
                        <span className="legend-dot dot-creator" />
                        <span className="legend-name">Creator (You Choose)</span>
                        <span className="legend-val font-mono">85%</span>
                      </div>
                      <div className="donut-legend-item">
                        <span className="legend-dot dot-seeder" />
                        <span className="legend-name">Community Hosts</span>
                        <span className="legend-val font-mono">15%</span>
                      </div>
                      <div className="donut-legend-item">
                        <span className="legend-dot dot-cloud" />
                        <span className="legend-name">Cloud Middlemen</span>
                        <span className="legend-val font-mono">0%</span>
                      </div>
                    </div>

                    {/* Interactive "You" Pointer Cursor */}
                    <div className="donut-cursor-tag">
                      <MousePointer2 size={14} className="cursor-arrow" />
                      <span className="cursor-label">You</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Content: Tab 2 (WebRTC) */}
              {activeTab === 'webrtc' && (
                <div className="showcase-content-scene scene-webrtc">
                  <div className="floating-showcase-card showcase-earning-card">
                    <div className="earning-badge-pill">
                      <Radio size={12} />
                      <span>Zero Cloud Middlemen</span>
                    </div>
                    <div className="earning-label">Community Download Speed</div>
                    <div className="earning-amount-row">
                      <span className="earning-amount">64.8 MB/s</span>
                      <span className="earning-change">+42%</span>
                    </div>
                    <div className="earning-subtext">38 active community devices sharing</div>
                  </div>

                  <div className="floating-showcase-pill showcase-security-pill">
                    <TrendingUp size={13} color="#FFFFFF" />
                    <span>Direct Device-to-Device</span>
                  </div>

                  <div className="showcase-table-card">
                    <div className="showcase-table-head">
                      <span className="th-cell th-chunk">Device ID</span>
                      <span className="th-cell th-peer">Connection</span>
                      <span className="th-cell th-split">Speed</span>
                      <span className="th-cell th-time">Reliability</span>
                    </div>
                    <div className="showcase-table-rows">
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk font-mono">device_0x91fa</span>
                        <span className="td-cell td-peer"><span className="status-pill status-live">Connected</span></span>
                        <span className="td-cell td-split font-mono">18.4 MB/s</span>
                        <span className="td-cell td-time">99.9%</span>
                      </div>
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk font-mono">device_0x42b1</span>
                        <span className="td-cell td-peer"><span className="status-pill status-live">Connected</span></span>
                        <span className="td-cell td-split font-mono">16.2 MB/s</span>
                        <span className="td-cell td-time">100%</span>
                      </div>
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk font-mono">device_0x11c8</span>
                        <span className="td-cell td-peer"><span className="status-pill status-live">Connected</span></span>
                        <span className="td-cell td-split font-mono">15.8 MB/s</span>
                        <span className="td-cell td-time">100%</span>
                      </div>
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk font-mono">device_0x89ee</span>
                        <span className="td-cell td-peer"><span className="status-pill status-live">Connected</span></span>
                        <span className="td-cell td-split font-mono">14.4 MB/s</span>
                        <span className="td-cell td-time">99.8%</span>
                      </div>
                    </div>
                  </div>

                  <div className="floating-donut-card">
                    <div className="donut-details" style={{ width: '100%' }}>
                      <div className="donut-title">Multi-Device Community Mesh</div>
                      <p style={{ fontSize: '0.8rem', color: '#57534E', margin: '0.35rem 0 0.5rem', lineHeight: '1.4' }}>
                        Files download simultaneously from multiple nearby supporters for maximum speed.
                      </p>
                      <div className="donut-legend-item">
                        <span className="legend-name">Direct Peer Connections</span>
                        <span className="legend-val font-mono" style={{ color: '#0062FF' }}>Active (16)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Content: Tab 3 (Batched Session Settlement) */}
              {activeTab === 'gate' && (
                <div className="showcase-content-scene scene-gate">
                  <div className="floating-showcase-card showcase-earning-card">
                    <div className="earning-badge-pill">
                      <Lock size={12} />
                      <span>Zero Gas Waste</span>
                    </div>
                    <div className="earning-label">Batched Settlement</div>
                    <div className="earning-amount-row">
                      <span className="earning-amount">Batched</span>
                      <span className="earning-change">Session Stream</span>
                    </div>
                    <div className="earning-subtext">Signed off-chain vouchers &bull; Settled in batches on Monad</div>
                  </div>

                  <div className="floating-showcase-pill showcase-security-pill">
                    <ShieldCheck size={13} color="#FFFFFF" />
                    <span>Permissionless Batch Settlement</span>
                  </div>

                  <div className="showcase-table-card">
                    <div className="showcase-table-head">
                      <span className="th-cell th-chunk">Batch Stage</span>
                      <span className="th-cell th-peer">Execution</span>
                      <span className="th-cell th-split">Amount</span>
                      <span className="th-cell th-time">Efficiency</span>
                    </div>
                    <div className="showcase-table-rows">
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk"><span className="status-pill status-live">Voucher</span></span>
                        <span className="td-cell td-peer">1MB chunk voucher signed</span>
                        <span className="td-cell td-split font-mono">0.001 MON</span>
                        <span className="td-cell td-time">Instant (0 gas)</span>
                      </div>
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk"><span className="status-pill status-live">Buffer</span></span>
                        <span className="td-cell td-peer">Session voucher buffer</span>
                        <span className="td-cell td-split font-mono">50 chunks</span>
                        <span className="td-cell td-time">Aggregated</span>
                      </div>
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk"><span className="status-pill status-live">Settled</span></span>
                        <span className="td-cell td-peer">Single on-chain batch tx</span>
                        <span className="td-cell td-split font-mono">0.050 MON</span>
                        <span className="td-cell td-time">1s on Monad</span>
                      </div>
                    </div>
                  </div>

                  <div className="floating-donut-card">
                    <div className="donut-details" style={{ width: '100%' }}>
                      <div className="donut-title">Off-Chain Vouchers + On-Chain Batching</div>
                      <p style={{ fontSize: '0.8rem', color: '#57534E', margin: '0.35rem 0 0.5rem', lineHeight: '1.4' }}>
                        Chunks stream seamlessly over WebRTC with cryptographically signed vouchers, bundled into batch settlements to maximize throughput.
                      </p>
                      <div className="donut-legend-item">
                        <span className="legend-name">Batch Processing</span>
                        <span className="legend-val font-mono" style={{ color: '#0062FF' }}>50 chunks / batch</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Content: Tab 4 (SHA-256 Merkle Verification) */}
              {activeTab === 'integrity' && (
                <div className="showcase-content-scene scene-integrity">
                  <div className="floating-showcase-card showcase-earning-card">
                    <div className="earning-badge-pill">
                      <ShieldCheck size={12} />
                      <span>Tamper-Proof Check</span>
                    </div>
                    <div className="earning-label">Security &amp; Safety</div>
                    <div className="earning-amount-row">
                      <span className="earning-amount">SHA-256</span>
                      <span className="earning-change">Verified</span>
                    </div>
                    <div className="earning-subtext">Client-side cryptographic piece verification</div>
                  </div>

                  <div className="floating-showcase-pill showcase-security-pill">
                    <Check size={13} color="#FFFFFF" />
                    <span>Automatic Safety Verification</span>
                  </div>

                  <div className="showcase-table-card">
                    <div className="showcase-table-head">
                      <span className="th-cell th-chunk">File Piece</span>
                      <span className="th-cell th-peer">Digital Fingerprint</span>
                      <span className="th-cell th-split">Authenticity</span>
                      <span className="th-cell th-time">Safety</span>
                    </div>
                    <div className="showcase-table-rows">
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk">Piece #01</span>
                        <span className="td-cell td-peer font-mono">8f4e2b...9a01</span>
                        <span className="td-cell td-split"><span className="status-pill status-live">Verified</span></span>
                        <span className="td-cell td-time">100% Clean</span>
                      </div>
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk">Piece #02</span>
                        <span className="td-cell td-peer font-mono">1c09da...77e4</span>
                        <span className="td-cell td-split"><span className="status-pill status-live">Verified</span></span>
                        <span className="td-cell td-time">100% Clean</span>
                      </div>
                      <div className="showcase-table-row">
                        <span className="td-cell td-chunk">Piece #03</span>
                        <span className="td-cell td-peer font-mono">3a78fc...22b8</span>
                        <span className="td-cell td-split"><span className="status-pill status-live">Verified</span></span>
                        <span className="td-cell td-time">100% Clean</span>
                      </div>
                    </div>
                  </div>

                  <div className="floating-donut-card">
                    <div className="donut-details" style={{ width: '100%' }}>
                      <div className="donut-title">Guaranteed Original Files</div>
                      <p style={{ fontSize: '0.8rem', color: '#57534E', margin: '0.35rem 0 0.5rem', lineHeight: '1.4' }}>
                        Every byte is checked against the creator's original upload to prevent viruses and corrupted files.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
