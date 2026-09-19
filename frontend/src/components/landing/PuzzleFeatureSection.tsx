import React from 'react'
import { CheckCircle2, Layers, Cpu, Share2 } from 'lucide-react'

export const PuzzleFeatureSection: React.FC = () => {
  return (
    <section className="puzzle-feature-section" id="features">
      <div className="puzzle-feature-container">
        {/* Left Column: Visual with user's puzzle image */}
        <div className="puzzle-feature-image-card">
          <img
            src="/puzzle-chunks.png"
            alt="P2P Model Chunks Assembly"
            className="puzzle-feature-img"
          />
          <div className="puzzle-feature-badge-float">
            <Layers size={18} color="var(--puzzle-yellow-accent)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#ffffff' }}>1MB Cryptographic Chunks</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>Multi-Peer Parallel Assembly</div>
            </div>
          </div>
        </div>

        {/* Right Column: Architectural Explanation */}
        <div className="puzzle-feature-content">
          <div className="section-eyebrow">The Chunked Swarm Architecture</div>
          <h2 className="section-heading-large" style={{ textAlign: 'left', marginBottom: '1rem' }}>
            Every model is a puzzle. The swarm puts it together.
          </h2>
          <p style={{ fontSize: '1.0625rem', lineHeight: 1.6, color: 'var(--puzzle-text-secondary)', marginBottom: '1.5rem' }}>
            Multi-gigabyte neural network weights no longer bottleneck through a single centralized host.
            Torrentia slices models into uniform 1MB pieces, verifies each chunk with SHA-256 against an immutable
            IPFS manifest, and streams them from dozens of peers simultaneously over WebRTC.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Step 1: Yellow */}
            <div className="puzzle-step-item">
              <div
                className="puzzle-step-icon-box"
                style={{ background: 'var(--puzzle-yellow-bg)', color: 'var(--puzzle-yellow-text)', border: '1px solid var(--puzzle-yellow-border)' }}
              >
                <Cpu size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--puzzle-text-primary)', marginBottom: '0.25rem' }}>
                  1MB Content-Addressed Slices
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--puzzle-text-secondary)', lineHeight: 1.5 }}>
                  Every chunk is cryptographically hashed with SHA-256 before leaving the creator's machine. Downloaders
                  verify each byte upon arrival—poisoned or altered weights are mathematically impossible.
                </p>
              </div>
            </div>

            {/* Step 2: Green */}
            <div className="puzzle-step-item">
              <div
                className="puzzle-step-icon-box"
                style={{ background: 'var(--puzzle-green-bg)', color: 'var(--puzzle-green-text)', border: '1px solid var(--puzzle-green-border)' }}
              >
                <Share2 size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--puzzle-text-primary)', marginBottom: '0.25rem' }}>
                  Multi-Source Parallel Swarm
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--puzzle-text-secondary)', lineHeight: 1.5 }}>
                  Download chunk #1 from London, chunk #2 from Singapore, and chunk #3 from San Francisco at the same time.
                  Multi-peer data channels maximize bandwidth throughput and eliminate single-point outages.
                </p>
              </div>
            </div>

            {/* Step 3: Pink */}
            <div className="puzzle-step-item">
              <div
                className="puzzle-step-icon-box"
                style={{ background: 'var(--puzzle-pink-bg)', color: 'var(--puzzle-pink-text)', border: '1px solid var(--puzzle-pink-border)' }}
              >
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--puzzle-text-primary)', marginBottom: '0.25rem' }}>
                  Organic Auto-Reseed Economy
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--puzzle-text-secondary)', lineHeight: 1.5 }}>
                  The moment your browser receives and stores a chunk in IndexedDB, you become a seeder. When future peers
                  request that chunk, you earn MON automatically on Monad.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
