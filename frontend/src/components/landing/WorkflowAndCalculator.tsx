import React, { useState } from 'react'
import { Terminal, Copy, Check, Server, Cpu, ShieldCheck } from 'lucide-react'

type OsType = 'unix' | 'windows' | 'docker'

interface OsConfig {
  id: OsType
  label: string
  prompt: string
  installCmd: string
  runCmd: string
  comment: string
}

const OS_CONFIGS: Record<OsType, OsConfig> = {
  unix: {
    id: 'unix',
    label: 'macOS / Linux',
    prompt: '$',
    installCmd: 'curl -sSL https://torrentiaa.vercel.app/install.sh | sh',
    runCmd: 'torrentia-seeder run',
    comment: '# Starts persistent background seeding node with automatic Monad split rewards',
  },
  windows: {
    id: 'windows',
    label: 'Windows (PowerShell)',
    prompt: 'PS>',
    installCmd: 'irm https://torrentiaa.vercel.app/install.ps1 | iex',
    runCmd: '.\\torrentia-seeder.exe run',
    comment: '# Starts background seeding service on Monad',
  },
  docker: {
    id: 'docker',
    label: 'Docker',
    prompt: '$',
    installCmd: 'docker pull torrentia/seeder:latest',
    runCmd: 'docker run -d --restart=always -p 9090:9090 -e SEEDER_ADDRESS=0x... torrentia/seeder:latest',
    comment: '# Runs detached container with auto-restart on system boot',
  },
}

export const WorkflowAndCalculator: React.FC = () => {
  const [selectedOs, setSelectedOs] = useState<OsType>('unix')
  const [copied, setCopied] = useState(false)

  const currentOs = OS_CONFIGS[selectedOs]

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="workflow-editorial-section" id="workflow">
      {/* Background Architectural Skyline Outline Sketch */}
      <div className="workflow-skyline-bg" aria-hidden="true">
        <svg
          viewBox="0 0 1200 600"
          className="skyline-sketch-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Building Outlines (Delicate Pencil/Tan Architectural Sketch) */}
          <path d="M 60 600 L 60 140 L 190 140 L 190 600" stroke="#DDD5C8" strokeWidth="1.5" />
          <path d="M 90 140 L 90 90 L 160 90 L 160 140" stroke="#DDD5C8" strokeWidth="1.5" />
          <path d="M 115 90 L 115 50 L 135 50 L 135 90" stroke="#DDD5C8" strokeWidth="1.5" />
          <rect x="85" y="170" width="80" height="40" stroke="#E6DFD4" strokeWidth="1.2" rx="4" />
          <rect x="85" y="230" width="80" height="40" stroke="#E6DFD4" strokeWidth="1.2" rx="4" />
          <rect x="85" y="290" width="80" height="40" stroke="#E6DFD4" strokeWidth="1.2" rx="4" />
          <rect x="85" y="350" width="80" height="40" stroke="#E6DFD4" strokeWidth="1.2" rx="4" />
          <rect x="85" y="410" width="80" height="40" stroke="#E6DFD4" strokeWidth="1.2" rx="4" />

          <path d="M 320 600 L 320 380 L 520 380 L 520 600" stroke="#DDD5C8" strokeWidth="1.5" />
          <rect x="345" y="415" width="38" height="60" stroke="#E6DFD4" strokeWidth="1.2" rx="3" />
          <rect x="395" y="415" width="38" height="60" stroke="#E6DFD4" strokeWidth="1.2" rx="3" />
          <rect x="445" y="415" width="38" height="60" stroke="#E6DFD4" strokeWidth="1.2" rx="3" />

          <path d="M 860 600 L 860 260 L 1120 260 L 1120 600" stroke="#DDD5C8" strokeWidth="1.5" />
          <path d="M 920 260 L 920 210 L 1060 210 L 1060 260" stroke="#DDD5C8" strokeWidth="1.5" />
          <line x1="885" y1="290" x2="1095" y2="290" stroke="#E6DFD4" strokeWidth="1.2" />
          <line x1="885" y1="330" x2="1095" y2="330" stroke="#E6DFD4" strokeWidth="1.2" />
          <line x1="885" y1="370" x2="1095" y2="370" stroke="#E6DFD4" strokeWidth="1.2" />
          <line x1="885" y1="410" x2="1095" y2="410" stroke="#E6DFD4" strokeWidth="1.2" />
        </svg>
      </div>

      <div className="workflow-content-container">
        {/* Centered Editorial Title */}
        <div className="section-eyebrow">How It Works</div>
        <h2 className="workflow-editorial-heading">
          Get started with Torrentia in three easy steps
        </h2>

        {/* 3 Cascading Stepped Staircase Cards */}
        <div className="workflow-staircase-grid">
          {/* Step 01 (Elevated Top-Left, Soft Stone Gray) */}
          <div className="staircase-step-card step-card-01">
            <div className="step-card-header">
              <div className="step-circle-badge">01</div>
            </div>
            <div className="step-card-body">
              <p className="step-card-text">
                <strong>Publish via Web or CLI.</strong> Drag and drop your AI model in the web app or run <code>torrentia-seeder add</code> from the terminal. Your package is registered on Monad with a tamper-proof digital fingerprint.
              </p>
            </div>
          </div>

          {/* Step 02 (Middle Stepped Lower, Light Blue-Gray) */}
          <div className="staircase-step-card step-card-02">
            <div className="step-card-header">
              <div className="step-circle-badge">02</div>
            </div>
            <div className="step-card-body">
              <p className="step-card-text">
                <strong>Community &amp; CLI nodes share bandwidth.</strong> Downloaders fetch directly from nearby browser supporters and 24/7 headless CLI nodes, keeping downloads fast with zero cloud bills.
              </p>
            </div>
          </div>

          {/* Step 03 (Lowest Bottom-Right, Soft Sky Blue) */}
          <div className="staircase-step-card step-card-03">
            <div className="step-card-header">
              <div className="step-circle-badge">03</div>
            </div>
            <div className="step-card-body">
              <p className="step-card-text">
                <strong>Instant pay-as-you-download earnings.</strong> Payments split automatically in 1 second on Monad: you choose your creator royalty (up to 99%), and community nodes earn for serving bandwidth.
              </p>
            </div>
          </div>
        </div>

        {/* Developer & Node Operator CLI Section */}
        <div className="workflow-cli-showcase">
          <div className="workflow-cli-topbar">
            <div className="cli-topbar-left">
              <div className="cli-terminal-dots">
                <span className="cli-dot dot-red" />
                <span className="cli-dot dot-yellow" />
                <span className="cli-dot dot-green" />
              </div>
              <span className="cli-window-title">
                <Terminal size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                torrentia-seeder &mdash; Go CLI Daemon
              </span>
            </div>
            <div className="cli-badge-pill">
              <Server size={12} />
              <span>Multi-Platform Go Daemon</span>
            </div>
          </div>

          <div className="workflow-cli-body">
            <div className="cli-intro-row">
              <div className="cli-intro-text">
                <strong>Prefer the command line?</strong> Run a persistent edge node 24/7 on your home workstation, VPS, or GPU cluster to seed models and earn automatic bandwidth rewards.
              </div>
            </div>

            {/* Platform Selector Tabs */}
            <div className="cli-os-tabs">
              {(Object.keys(OS_CONFIGS) as OsType[]).map((osKey) => {
                const cfg = OS_CONFIGS[osKey]
                const isActive = selectedOs === osKey
                return (
                  <button
                    key={osKey}
                    type="button"
                    className={`cli-os-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedOs(osKey)}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            <div className="cli-code-block">
              <div className="cli-code-line">
                <div className="cli-line-content">
                  <span className="cli-prompt">{currentOs.prompt}</span>
                  <span className="cli-cmd">{currentOs.installCmd}</span>
                </div>
                <button
                  type="button"
                  className="cli-copy-btn"
                  onClick={() => handleCopy(currentOs.installCmd)}
                  title="Copy install command"
                >
                  {copied ? (
                    <>
                      <Check size={13} color="#10B981" />
                      <span style={{ color: '#10B981' }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="cli-code-line secondary-cmd">
                <div className="cli-line-content">
                  <span className="cli-prompt">{currentOs.prompt}</span>
                  <span className="cli-cmd">{currentOs.runCmd}</span>
                </div>
                <span className="cli-comment">{currentOs.comment}</span>
              </div>
            </div>

            <div className="cli-features-footer">
              <div className="cli-feature-tag">
                <Cpu size={13} color="#60A5FA" />
                <span>Headless 24/7 Background Seeding</span>
              </div>
              <div className="cli-feature-tag">
                <ShieldCheck size={13} color="#34D399" />
                <span>Automatic SHA-256 Hash Verification</span>
              </div>
              <div className="cli-feature-tag">
                <Server size={13} color="#A78BFA" />
                <span>Direct WebRTC Streaming to Browsers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
