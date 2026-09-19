import React from 'react'

export const WorkflowAndCalculator: React.FC = () => {
  return (
    <section className="workflow-section" id="workflow">
      <div className="section-eyebrow">How It Works</div>
      <h2 className="section-heading-large">
        From weight tensors to earning seeders
      </h2>
      <p className="section-lead">
        A seamless 4-step decentralized lifecycle that turns high-bandwidth distribution into automatic revenue.
      </p>

      {/* 4-Step Process Cards */}
      <div className="workflow-steps-grid">
        <div className="workflow-step-card">
          <div className="step-number-badge">1</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Upload &amp; Slice</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.55 }}>
            Browser slices your model into 1MB blocks, calculates SHA-256 hashes, pins the manifest to IPFS, and registers metadata on Monad.
          </p>
        </div>

        <div className="workflow-step-card">
          <div className="step-number-badge" style={{ background: '#faf5ff', color: '#9333ea' }}>2</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Swarm Discovery</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.55 }}>
            Downloaders connect to the lightweight Go signaling tracker over WebSocket to locate peers holding the desired chunks and exchange SDP offers.
          </p>
        </div>

        <div className="workflow-step-card">
          <div className="step-number-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>3</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>x402 Atomic Split</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.55 }}>
            Payment is executed on Monad in 1 second. The smart contract atomically splits funds between the original creator and the serving seeder.
          </p>
        </div>

        <div className="workflow-step-card">
          <div className="step-number-badge" style={{ background: '#fff7ed', color: '#ea580c' }}>4</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Stream &amp; Reseed</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.55 }}>
            Chunk data streams over WebRTC into IndexedDB. The downloader instantly joins the swarm as a seeder to earn MON for serving future peers.
          </p>
        </div>
      </div>
    </section>
  )
}
