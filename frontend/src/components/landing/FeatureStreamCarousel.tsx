import React, { useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Zap,
  Check,
  FileCode,
  CheckCircle2,
  Database,
} from 'lucide-react'

interface FeatureItem {
  id: string
  title: string
  desc: string
  visual: React.ReactNode
}

export const FeatureStreamCarousel: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const features: FeatureItem[] = [
    {
      id: 'webrtc',
      title: 'WebRTC peer channels',
      desc: 'Browser-to-browser data channels stream weights in parallel slices with zero centralized relay servers.',
      visual: (
        <div className="stream-mock-pill">
          <div className="stream-mock-pill-dot" />
          <span className="stream-mock-pill-text">peer://0x72a9...e41b</span>
          <span className="stream-mock-pill-badge">16 KB/s</span>
          <div className="stream-mock-pill-btn">
            <ArrowUpRight size={13} />
          </div>
        </div>
      ),
    },
    {
      id: 'splits',
      title: 'Atomic on-chain splits',
      desc: 'Monad smart contracts execute creator and seeder revenue splits simultaneously with zero accounting lag.',
      visual: (
        <div className="stream-mock-doc-card">
          <div className="stream-mock-doc-header">
            <span className="stream-mock-doc-title">Monad Royalty Split</span>
            <span className="stream-mock-doc-tag">0.10 MON</span>
          </div>
          <div className="stream-mock-split-bar">
            <div className="split-creator-bar" style={{ width: '70%' }} />
            <div className="split-seeder-bar" style={{ width: '30%' }} />
          </div>
          <div className="stream-mock-doc-rows">
            <div className="stream-mock-doc-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }} />
                Creator (70%)
              </span>
              <span style={{ fontWeight: 600, color: '#1c1917' }}>+0.070 MON</span>
            </div>
            <div className="stream-mock-doc-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Seeder (30%)
              </span>
              <span style={{ fontWeight: 600, color: '#1c1917' }}>+0.030 MON</span>
            </div>
          </div>
          <div className="stream-mock-doc-footer">
            <Sparkles size={12} color="#6366f1" />
            <span>Split settled in 0.8s on Monad</span>
          </div>
        </div>
      ),
    },
    {
      id: 'x402',
      title: 'x402 payment handshake',
      desc: 'HTTP 402 micro-payment gates verify on-chain receipts on Monad before releasing weights to peer channels.',
      visual: (
        <div className="stream-mock-code-card">
          <div className="stream-mock-code-title">transfer_session.ts</div>
          <div className="stream-mock-code-line">
            <span className="code-kw">await</span> stream.requestPiece(42)
          </div>
          <div className="stream-mock-highlight-wrap">
            <div className="stream-mock-tooltip-pill">
              <Zap size={11} color="#f59e0b" />
              <span>Auto-sign: 0.001 MON</span>
            </div>
            <div className="stream-mock-highlighted-text">
              status: 402 Payment Required
            </div>
          </div>
          <div className="stream-mock-code-ok">
            <Check size={12} color="#10b981" />
            <span>Receipt verified · Chunk released</span>
          </div>
        </div>
      ),
    },
    {
      id: 'integrity',
      title: 'SHA-256 integrity verification',
      desc: 'Every 1MB piece is cryptographically validated client-side against immutable IPFS manifests before disk writes.',
      visual: (
        <div className="stream-mock-stack">
          <div className="stream-mock-stack-back stream-mock-stack-card-3" />
          <div className="stream-mock-stack-back stream-mock-stack-card-2" />
          <div className="stream-mock-stack-front">
            <div className="stack-card-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileCode size={13} color="#6366f1" />
                <span className="stack-filename">chunk_0042.bin</span>
              </div>
              <span className="stack-size">1,048,576 B</span>
            </div>
            <div className="stack-hash-row">
              <span style={{ color: '#94a3b8' }}>SHA-256</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>4e2a7b8c...c890</span>
            </div>
            <div className="stack-badge-verified">
              <CheckCircle2 size={12} color="#059669" />
              <span>Merkle Root Matched</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'reseed',
      title: 'Auto-reseed swarm',
      desc: 'Downloaders automatically become active seeders, continuously multiplying swarm bandwidth as models gain popularity.',
      visual: (
        <div className="stream-mock-squircle-wrap">
          <div className="stream-mock-squircle">
            <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="18" stroke="#1c1917" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.22" />
              <path d="M14 18C14 14.6863 16.6863 12 20 12H28M28 12L25 9M28 12L25 15" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M30 26C30 29.3137 27.3137 32 24 32H16M16 32L19 29M16 32L19 35" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="14" cy="18" r="3.5" fill="#1c1917" />
              <circle cx="30" cy="26" r="3.5" fill="#10b981" />
            </svg>
          </div>
          <div className="stream-mock-squircle-badge">
            <span className="squircle-badge-pulse" />
            <span>3 Seeders Active · 48 MB/s</span>
          </div>
        </div>
      ),
    },
    {
      id: 'storage',
      title: 'Direct browser IndexedDB',
      desc: 'Weights are stored directly in high-capacity browser IndexedDB, eliminating external software or CLI setups.',
      visual: (
        <div className="stream-mock-storage-card">
          <div className="storage-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Database size={13} color="#6366f1" />
              <span className="storage-db-name">IndexedDB: weights</span>
            </div>
            <span className="storage-status-pill">Active</span>
          </div>
          <div className="storage-model-name">llama-3-8b-instruct.gguf</div>
          <div className="storage-progress-bar">
            <div className="storage-progress-fill" style={{ width: '100%' }} />
          </div>
          <div className="storage-card-footer">
            <span>4.2 GB cached</span>
            <span className="storage-highlight">Zero CLI needed</span>
          </div>
        </div>
      ),
    },
    {
      id: 'monad',
      title: '10,000 TPS Monad engine',
      desc: 'Sub-second finality and micro-gas execution power continuous micro-settlements for high-throughput model streaming.',
      visual: (
        <div className="stream-mock-monad-card">
          <div className="monad-card-badge">
            <Zap size={12} color="#6366f1" />
            <span>MONAD TESTNET</span>
          </div>
          <div className="monad-big-stat">
            0.8s <span className="stat-unit">Finality</span>
          </div>
          <div className="monad-specs-grid">
            <div className="monad-spec-item">
              <span className="spec-label">Throughput</span>
              <span className="spec-val">10,000 TPS</span>
            </div>
            <div className="monad-spec-item">
              <span className="spec-label">Gas</span>
              <span className="spec-val" style={{ color: '#059669' }}>&lt; $0.0001</span>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -350 : 350
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  return (
    <section id="features" className="carousel-section">
      <div className="carousel-header-row">
        <div className="carousel-title-group">
          <h2 className="carousel-main-heading">
            Built different.
          </h2>
        </div>

        <div className="carousel-controls">
          <button
            onClick={() => handleScroll('left')}
            className="carousel-arrow-btn"
            title="Scroll left"
            aria-label="Previous"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="carousel-arrow-btn"
            title="Scroll right"
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="carousel-cards-scroll-container" ref={scrollRef}>
        {features.map((item) => (
          <div key={item.id} className="feature-stream-card">
            <div className="stream-card-visual">
              {item.visual}
            </div>

            <p className="stream-card-caption">
              <strong className="stream-card-bold">{item.title}.</strong>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
