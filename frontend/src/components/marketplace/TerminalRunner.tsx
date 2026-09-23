import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, ChevronDown, Play, Sparkles } from 'lucide-react'
import type { IndexedModel } from '../../lib/types'

interface TerminalRunnerProps {
  model: IndexedModel
}

type TabType = 'webrtc' | 'cli' | 'curl' | 'python'

export const TerminalRunner: React.FC<TerminalRunnerProps> = ({ model }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('webrtc')
  const [isSwarmMode, setIsSwarmMode] = useState(true)
  const [passkeyMode, setPasskeyMode] = useState(true)
  const [copied, setCopied] = useState(false)

  const truncatedModelId = `${model.modelId.slice(0, 10)}...${model.modelId.slice(-8)}`

  const getSnippets = () => {
    switch (activeTab) {
      case 'webrtc':
        return [
          `import { TorrentiaStream } from '@torrentia/sdk'`,
          ``,
          `const swarm = await TorrentiaStream.connect({`,
          `  modelId: "${truncatedModelId}",`,
          `  network: "monad-testnet",`,
          `  p2pSwarm: ${isSwarmMode ? 'true' : 'false'},`,
          `  zeroPromptPasskey: ${passkeyMode ? 'true' : 'false'}`,
          `})`,
          ``,
          `await swarm.streamChunks((chunk) => {`,
          `  console.log(\`Verified chunk #\${chunk.index} via atomic split\`)`,
          `})`,
        ]
      case 'cli':
        return [
          `# Run persistent Go seeder daemon to stream & earn royalties`,
          `torrentia-seeder download \\`,
          `  --model ${model.modelId} \\`,
          `  --rpc https://testnet-rpc.monad.xyz \\`,
          `  --p2p ${isSwarmMode ? 'true' : 'false'} \\`,
          `  --chunks ${model.chunkCount} \\`,
          `  --output ./weights/${model.modelName || 'model'}/`,
        ]
      case 'curl':
        return [
          `curl -sS "https://signal.torrentia.xyz/v1/chunk/0" \\`,
          `  -H "Authorization: Bearer Monad-Wallet-Session" \\`,
          `  -H "Content-Type: application/json" \\`,
          `  -d '{`,
          `    "modelId": "${model.modelId}",`,
          `    "requireP2P": ${isSwarmMode ? 'true' : 'false'},`,
          `    "atomicSplit": "7000",`,
          `    "contract": "SplitPayment.sol"`,
          `  }'`,
        ]
      case 'python':
        return [
          `from torrentia import SwarmClient`,
          ``,
          `client = SwarmClient(chain="monad-testnet")`,
          `model = client.load_model("${truncatedModelId}")`,
          ``,
          `# Stream 1MB chunks across peer swarm`,
          `for chunk in model.stream_weights(swarm_mode=${isSwarmMode ? 'True' : 'False'}):`,
          `    print(f"Verified chunk {chunk.index} hash={chunk.sha256[:10]}")`,
        ]
    }
  }

  const lines = getSnippets()
  const fullText = lines.join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabLabels: Record<TabType, string> = {
    webrtc: '>_ WebRTC Stream',
    cli: '>_ CLI Daemon',
    curl: '>_ cURL',
    python: '>_ Python SDK',
  }

  return (
    <div
      style={{
        marginTop: '1.25rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid rgba(28, 25, 23, 0.08)',
      }}
    >
      {/* Expanded Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '0.85rem',
          fontSize: '0.8125rem',
        }}
      >
        {/* Left: Tab Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#8c857e', fontWeight: 600 }}>Copy &amp; Run</span>
          <div style={{ display: 'flex', gap: '0.35rem', background: '#f5f6f8', padding: '3px', borderRadius: '8px', border: '1px solid rgba(28, 25, 23, 0.06)' }}>
            {(Object.keys(tabLabels) as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#181615' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : '#57534e',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  boxShadow: activeTab === tab ? '0 1px 4px rgba(24, 22, 21, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Interactive Switches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* P2P Swarm Mode Toggle */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            onClick={() => setIsSwarmMode(!isSwarmMode)}
          >
            <span style={{ color: '#57534e', fontSize: '0.75rem', fontWeight: 500 }}>P2P Swarm</span>
            <div
              style={{
                width: '32px',
                height: '18px',
                borderRadius: '9999px',
                background: isSwarmMode ? '#181615' : '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                transition: 'background 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  transform: isSwarmMode ? 'translateX(14px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSwarmMode && <Check size={10} color="#181615" strokeWidth={3} />}
              </div>
            </div>
          </div>

          {/* Zero-Prompt Passkey Toggle */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            onClick={() => setPasskeyMode(!passkeyMode)}
          >
            <span style={{ color: '#57534e', fontSize: '0.75rem', fontWeight: 500 }}>Zero-Prompt</span>
            <div
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                background: passkeyMode ? 'rgba(99, 102, 241, 0.1)' : '#f5f6f8',
                border: passkeyMode ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(28, 25, 23, 0.08)',
                color: passkeyMode ? '#4f46e5' : '#57534e',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>{passkeyMode ? 'On' : 'Off'}</span>
              <ChevronDown size={11} />
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Code Window */}
      <div
        style={{
          position: 'relative',
          borderRadius: '12px',
          background: '#181615',
          border: '1px solid rgba(28, 25, 23, 0.12)',
          padding: '1rem 1.25rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          lineHeight: 1.55,
          color: '#e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 4px 16px rgba(24, 22, 21, 0.12)',
        }}
      >
        {/* Floating Copy Button */}
        <button
          onClick={handleCopy}
          title="Copy snippet"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
            color: copied ? '#34d399' : '#cbd5e1',
            borderRadius: '6px',
            padding: '0.35rem 0.55rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            transition: 'all 0.15s ease',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        {/* Code Lines with Line Numbers */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem' }}>
              <span
                style={{
                  color: 'rgba(255, 255, 255, 0.22)',
                  textAlign: 'right',
                  width: '18px',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <span
                style={{
                  color: line.startsWith('#')
                    ? 'rgba(255, 255, 255, 0.45)'
                    : line.includes('import') || line.includes('from') || line.includes('const') || line.includes('await')
                    ? '#93c5fd'
                    : line.includes('"')
                    ? '#86efac'
                    : '#f1f5f9',
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button
          onClick={() => navigate(`/model/${model.modelId}`)}
          style={{
            background: 'linear-gradient(135deg, hsl(265, 90%, 65%), hsl(200, 85%, 60%))',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.65rem 1.35rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px hsla(265, 90%, 65%, 0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 18px hsla(265, 90%, 65%, 0.45)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 14px hsla(265, 90%, 65%, 0.35)'
          }}
        >
          <Play size={15} fill="#ffffff" />
          <span>Stream Model Chunks Now</span>
          <Sparkles size={14} color="#fef08a" />
        </button>
      </div>
    </div>
  )
}
