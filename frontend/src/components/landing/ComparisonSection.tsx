import React, { useState } from 'react'
import { Bell, ShieldCheck, CheckCircle2, Clock } from 'lucide-react'

export const ComparisonSection: React.FC = () => {
  const [activeTooltip, setActiveTooltip] = useState(true)

  return (
    <section className="comparison-editorial-section" id="comparison">
      <div className="section-eyebrow">The Difference</div>
      <h2 className="comparison-editorial-heading">
        How Torrentia compares to traditional cloud hosting
      </h2>
      <p className="comparison-editorial-lead">
        Traditional cloud platforms charge exponential bandwidth fees as models scale, and centralized hosts can de-list work at will.
        Torrentia enables community-powered distribution—eliminating egress bills while giving creators direct control over their royalties.
      </p>

      <div className="comparison-editorial-grid">
        {/* Card 1: Cuts Cloud Hosting Bills to $0 */}
        <div className="comparison-editorial-card">
          <div className="comparison-card-content">
            <h3 className="comparison-card-title">Cuts Cloud Hosting Bills to $0</h3>
            <p className="comparison-card-desc">
              Eliminate egress fees entirely. Community hosts distribute model chunks peer-to-peer while creators retain up to 99% royalties on every download.
            </p>
          </div>

          <div className="comparison-mockup-stage mockup-stage-revenue">
            {/* Floating Metric Badge (Top Left) */}
            <div className="floating-metric-pill">
              <div className="metric-pill-header">
                <CheckCircle2 size={13} className="metric-pill-icon" />
                <span>Cloud Bandwidth Bills</span>
              </div>
              <div className="metric-pill-body">
                <span className="metric-pill-number">$0</span>
                <span className="metric-pill-subtag">Zero Cloud Egress ↑</span>
              </div>
            </div>

            {/* Floating Notification Badge (Top Right) */}
            <div className="floating-notify-pill">
              <div className="notify-bell-wrap">
                <Bell size={13} color="#FFFFFF" />
              </div>
              <span className="notify-text">Automated Split Settlement</span>
              <span className="notify-dot-pulse" title="1-Second Finality on Monad">!</span>
            </div>

            {/* Embedded Revenue & Yield Widget */}
            <div
              className="comparison-revenue-widget"
              onMouseEnter={() => setActiveTooltip(true)}
            >
              <div className="revenue-widget-header">
                <div className="revenue-title-row">
                  <span className="revenue-label">Example Model Settlement</span>
                  <div className="revenue-stat-row">
                    <span className="revenue-amount font-mono">86.40 MON</span>
                    <span className="revenue-growth-badge">You Set Royalty ↑</span>
                  </div>
                </div>
              </div>

              {/* Dual-Curve Interactive SVG Chart */}
              <div className="revenue-chart-container">
                <svg
                  viewBox="0 0 340 120"
                  className="revenue-chart-svg"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="creatorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="seederGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="340" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="0.8" />
                  <line x1="0" y1="55" x2="340" y2="55" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="0.8" />
                  <line x1="0" y1="90" x2="340" y2="90" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="0.8" />

                  {/* Seeder Curve Area & Line (Green) */}
                  <path
                    d="M 10 100 Q 60 98, 110 92 T 210 75 T 280 62 T 330 54 L 330 115 L 10 115 Z"
                    fill="url(#seederGrad)"
                  />
                  <path
                    d="M 10 100 Q 60 98, 110 92 T 210 75 T 280 62 T 330 54"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Creator Curve Area & Line (Blue) */}
                  <path
                    d="M 10 95 Q 70 94, 120 84 T 195 62 T 260 28 T 330 22 L 330 115 L 10 115 Z"
                    fill="url(#creatorGrad)"
                  />
                  <path
                    d="M 10 95 Q 70 94, 120 84 T 195 62 T 260 28 T 330 22"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Highlight Anchor Dot */}
                  <circle cx="195" cy="62" r="5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                </svg>

                {/* Chart Floating Tooltip */}
                {activeTooltip && (
                  <div className="chart-tooltip-bubble">
                    <div className="tooltip-date">Protocol Split • 1s Monad Finality</div>
                    <div className="tooltip-row">
                      <span className="tooltip-dot dot-creator" />
                      <span>You (Creator): You set your split (up to 99%)</span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-dot dot-seeder" />
                      <span>Community Hosts: Rewarded for hosting</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Built for Creators & Community Hosts */}
        <div className="comparison-editorial-card">
          <div className="comparison-card-content">
            <h3 className="comparison-card-title">Built for Creators &amp; Community Hosts</h3>
            <p className="comparison-card-desc">
              Torrentia replaces centralized cloud bandwidth bills with an open incentive network where community members host weights and earn automated piece-by-piece rewards.
            </p>
          </div>

          <div className="comparison-mockup-stage mockup-stage-trust">
            {/* Pencil/Line-Art Partnership Handshake SVG */}
            <div className="trust-handshake-wrap" aria-hidden="true">
              <svg
                viewBox="0 0 380 240"
                className="trust-handshake-svg"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Left Arm / Sleeve */}
                <path
                  d="M 15 130 L 105 138 C 122 140 135 148 145 158 L 165 178 L 175 168 L 150 142 C 142 134 135 125 132 114 L 115 55 L 20 85 Z"
                  stroke="#C5BCB1"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
                <path
                  d="M 115 55 L 126 102 C 128 112 135 119 144 125 L 195 156"
                  stroke="#C5BCB1"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.8"
                />

                {/* Left Hand Fingers Grasping */}
                <path
                  d="M 175 168 C 182 174 192 172 198 165 C 204 158 206 148 204 138 L 202 128"
                  stroke="#A89E92"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M 188 178 C 196 182 206 179 212 171 C 218 162 218 152 215 142"
                  stroke="#A89E92"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M 200 185 C 208 188 218 185 224 176 C 229 168 228 158 225 150"
                  stroke="#A89E92"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />

                {/* Right Arm / Sleeve */}
                <path
                  d="M 365 160 L 290 145 C 275 142 262 134 252 122 L 230 95 L 218 105 L 238 130 C 246 140 252 150 254 162 L 265 210 L 360 195 Z"
                  stroke="#C5BCB1"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />

                {/* Right Hand Clasp & Thumb */}
                <path
                  d="M 218 105 C 210 98 198 102 192 110 C 186 118 184 130 188 140 L 198 158"
                  stroke="#A89E92"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M 230 95 C 224 90 214 92 208 98 C 202 105 200 114 202 124"
                  stroke="#A89E92"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />

                {/* Subtle Cuff Seams */}
                <line x1="110" y1="62" x2="102" y2="132" stroke="#D7CFC5" strokeWidth="1.3" strokeDasharray="3 2" />
                <line x1="285" y1="148" x2="268" y2="205" stroke="#D7CFC5" strokeWidth="1.3" strokeDasharray="3 2" />
              </svg>
            </div>

            {/* Floating Pill (Top Right): 100% Authentic & Safe */}
            <div className="floating-partner-pill">
              <ShieldCheck size={14} className="partner-icon" />
              <span>100% Authentic &amp; Safe</span>
            </div>

            {/* Floating Card (Bottom Left): Instant 1-Second Payouts */}
            <div className="floating-trust-badge">
              <div className="laurel-wreath-wrap">
                <Clock size={22} color="#0062FF" />
              </div>
              <div className="trust-badge-texts">
                <span className="trust-badge-number">1-Second</span>
                <span className="trust-badge-sub">Automatic Payouts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
