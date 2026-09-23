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
          <div className="step-number-badge">01</div>
          <h3 className="workflow-step-title">Upload &amp; Slice</h3>
          <p className="workflow-step-desc">
            Browser slices your model into 1MB blocks, calculates SHA-256 hashes, pins the manifest to IPFS, and registers metadata on Monad.
          </p>
        </div>

        <div className="workflow-step-card">
          <div className="step-number-badge">02</div>
          <h3 className="workflow-step-title">Swarm Discovery</h3>
          <p className="workflow-step-desc">
            Downloaders connect to the lightweight Go signaling tracker over WebSocket to locate peers holding the desired chunks and exchange SDP offers.
          </p>
        </div>

        <div className="workflow-step-card">
          <div className="step-number-badge">03</div>
          <h3 className="workflow-step-title">402 Atomic Split</h3>
          <p className="workflow-step-desc">
            Payment is executed on Monad in 1 second. The smart contract atomically splits funds between the original creator and the serving seeder.
          </p>
        </div>

        <div className="workflow-step-card">
          <div className="step-number-badge">04</div>
          <h3 className="workflow-step-title">Stream &amp; Reseed</h3>
          <p className="workflow-step-desc">
            Chunk data streams over WebRTC into IndexedDB. The downloader instantly joins the swarm as a seeder to earn MON for serving future peers.
          </p>
        </div>
      </div>
    </section>
  )
}
