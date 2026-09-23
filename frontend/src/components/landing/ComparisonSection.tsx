import React from 'react'
import { Check, X, Radio, Server, Shield } from 'lucide-react'

export const ComparisonSection: React.FC = () => {
  return (
    <section className="comparison-section" id="comparison">
      <div className="section-eyebrow">The Paradigm Shift</div>
      <h2 className="section-heading-large">
        AI distribution has changed.<br />Have you?
      </h2>
      <p className="section-lead">
        Centralized hosts throttle bandwidth, charge crushing monthly egress fees, and de-list models at will.
        The modern AI stack runs on decentralized peer swarms where downloaders become earning seeders.
      </p>

      <div className="comparison-cards-grid">
        {/* Card 1: Centralized (Neutral Stone Badge) */}
        <div className="comparison-card">
          <div className="comparison-card-badge comparison-badge-neutral">
            <Server size={13} />
            <span>Legacy Central Hosting</span>
          </div>
          <h3 className="comparison-card-title">Centralized Repositories</h3>
          <p className="comparison-card-desc">
            Traditional cloud platforms (HuggingFace, AWS S3) force creators to foot enormous bandwidth bills as models grow popular.
          </p>

          <ul className="comparison-card-list">
            <li className="comparison-card-item">
              <X size={16} color="#78716C" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Creator pays for popularity ($0.09/GB egress fees)</span>
            </li>
            <li className="comparison-card-item">
              <X size={16} color="#78716C" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Single point of failure and server rate throttling</span>
            </li>
            <li className="comparison-card-item">
              <X size={16} color="#78716C" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Vulnerable to platform de-listing and policy changes</span>
            </li>
            <li className="comparison-card-item">
              <X size={16} color="#78716C" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Bandwidth bottlenecks degrade download speeds during peaks</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Torrentia Swarm (Highlighted Solid Charcoal Badge) */}
        <div className="comparison-card comparison-card-highlighted">
          <div className="comparison-card-badge comparison-badge-charcoal">
            <Radio size={13} />
            <span>Zero Infrastructure Cost</span>
          </div>
          <h3 className="comparison-card-title">Torrentia P2P Swarm</h3>
          <p className="comparison-card-desc">
            Decentralized peer swarms stream multi-gigabyte models directly over WebRTC and daemon seeders with zero server bandwidth fees.
          </p>

          <ul className="comparison-card-list">
            <li className="comparison-card-item">
              <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>$0 hosting bills:</strong> Swarm absorbs high-traffic loads</span>
            </li>
            <li className="comparison-card-item">
              <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>60+ MB/s:</strong> Multi-peer parallel chunk streaming</span>
            </li>
            <li className="comparison-card-item">
              <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Decentralized architecture:</strong> Browser WebRTC + CLI seeders + IndexedDB</span>
            </li>
            <li className="comparison-card-item">
              <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>SHA-256 verification:</strong> 100% tamper-proof weights</span>
            </li>
          </ul>
        </div>

        {/* Card 3: Monad Settlement (Neutral Stone Badge) */}
        <div className="comparison-card">
          <div className="comparison-card-badge comparison-badge-neutral">
            <Shield size={13} />
            <span>Atomic On-Chain Settlement</span>
          </div>
          <h3 className="comparison-card-title">Monad Payment Engine</h3>
          <p className="comparison-card-desc">
            Every 1MB chunk transfer is settled atomically in 1 second on Monad, splitting revenue directly between creators and seeders.
          </p>

          <ul className="comparison-card-list">
            <li className="comparison-card-item">
              <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Atomic splits:</strong> 70% Creator / 30% Seeder in 1 transaction</span>
            </li>
            <li className="comparison-card-item">
              <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Uniform chunk price:</strong> Hard protocol invariant prevents wars</span>
            </li>
            <li className="comparison-card-item">
              <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>1-second finality:</strong> Instant payment proof unlocks chunks</span>
            </li>
            <li className="comparison-card-item">
              <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Earning seeders:</strong> Everyday users monetize spare bandwidth</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="comparison-pullquote">
        &ldquo;When your AI model goes viral, you shouldn&apos;t get a bandwidth bill. You should get paid.&rdquo;
      </div>
    </section>
  )
}
