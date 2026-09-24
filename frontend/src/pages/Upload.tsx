import React, { useState, useRef } from 'react'
import { useAccount, useConnect, useSignTypedData } from 'wagmi'
import { parseEther } from 'viem'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Wallet,
  ShieldCheck,
  HardDrive,
  FileCode,
  Share2,
  Terminal,
  Check,
  AlertTriangle,
  Flame,
  Radio,
  ExternalLink,
} from 'lucide-react'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { FileDropZone } from '../components/upload/FileDropZone'
import { ShareSlider } from '../components/upload/ShareSlider'
import { chunkFile, generateModelId, DEFAULT_CHUNK_SIZE } from '../services/chunker'
import { storeChunk } from '../services/chunk-store'
import {
  UPLOAD_BROKER_DOMAIN,
  UPLOAD_INTENT_TYPES,
  buildUploadIntent,
  computeManifestHash,
  submitToUploadBroker,
} from '../services/broker-client'
import { useRegisterModel } from '../hooks/use-contracts'
import { useSeeding } from '../hooks/use-p2p'
import { ChunkManifest, ChunkInfo } from '../lib/types'
import { formatFileSize } from '../lib/utils'
import { MODEL_REGISTRY_ADDRESS, getMonadscanTxUrl } from '../lib/contracts'
import { saveLocalUploadedModel } from '../services/api-client'
import { allowMockFallbacks } from '../lib/app-mode'

const POPULAR_LICENSES = [
  'MIT',
  'Apache-2.0',
  'OpenRAIL-M',
  'Llama-3-Community',
  'CC-BY-4.0',
  'GPL-3.0',
]

export const Upload: React.FC = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { register } = useRegisterModel()
  const { signTypedDataAsync } = useSignTypedData()

  // 5-Step Wizard State: 1 | 2 | 3 | 4 | 5
  const [activeStep, setActiveStep] = useState<number>(1)

  // Step 1: File Selection
  const [file, setFile] = useState<File | null>(null)

  // Step 2: Hashing State
  const [isHashing, setIsHashing] = useState(false)
  const [hashProgress, setHashProgress] = useState({ current: 0, total: 0, mbps: 0 })
  const [chunksInfo, setChunksInfo] = useState<ChunkInfo[]>([])
  const [hashingComplete, setHashingComplete] = useState(false)
  const cancelHashingRef = useRef(false)

  // Step 3: Model Passport Metadata
  const [modelName, setModelName] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [license, setLicense] = useState('Apache-2.0')
  const [lineage, setLineage] = useState('')
  const [registeredModelId, setRegisteredModelId] = useState<`0x${string}` | null>(null)
  const [ipfsCid, setIpfsCid] = useState<string | null>(null)
  const [isPinning, setIsPinning] = useState(false)

  // Step 4: Economics
  const [chunkPriceMon, setChunkPriceMon] = useState('0.0001')
  const [creatorShareBps, setCreatorShareBps] = useState(7000) // 70% default

  // Step 5: Publishing & Seeding
  const [isRegistering, setIsRegistering] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [copiedCli, setCopiedCli] = useState(false)

  // Seeding Hook
  const { isSeeding, startSeeding, stopSeeding } = useSeeding(
    registeredModelId || undefined,
    address,
    chunkPriceMon ? parseEther(chunkPriceMon).toString() : '100000000000000'
  )

  // Auto-fill model name from selected file
  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile)
    setHashingComplete(false)
    setChunksInfo([])
    setIpfsCid(null)
    setTxHash(null)
    setPublishError(null)

    if (selectedFile) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setModelName(baseName.charAt(0).toUpperCase() + baseName.slice(1))
    }
  }

  // Computed Metrics
  const estimatedChunks = file ? Math.max(1, Math.ceil(file.size / DEFAULT_CHUNK_SIZE)) : 0
  const creatorPercent = Math.round(creatorShareBps / 100)
  const seederPercent = 100 - creatorPercent
  const priceNum = parseFloat(chunkPriceMon || '0')
  const creatorEarnPerPiece = (priceNum * (creatorPercent / 100)).toFixed(6)
  const seederEarnPerPiece = (priceNum * (seederPercent / 100)).toFixed(6)
  const totalRevenue = (priceNum * estimatedChunks).toFixed(4)
  const creatorTotalEarn = (priceNum * estimatedChunks * (creatorPercent / 100)).toFixed(4)
  const seederTotalEarn = (priceNum * estimatedChunks * (seederPercent / 100)).toFixed(4)

  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.type === 'injected') || connectors[0]
    if (injected) connect({ connector: injected })
  }

  // Step 2 Action: Stream Slice, Hash & Store in Local IndexedDB
  const handleStartHashing = async () => {
    if (!file || !address) return
    setIsHashing(true)
    setPublishError(null)
    cancelHashingRef.current = false

    const timestamp = Date.now()
    const modelId = generateModelId(address, modelName || file.name, timestamp)
    setRegisteredModelId(modelId)

    const pieces: ChunkInfo[] = []
    const total = estimatedChunks
    setHashProgress({ current: 0, total, mbps: 0 })

    const startTime = performance.now()
    let bytesProcessed = 0

    try {
      let processed = 0
      for await (const chunk of chunkFile(file, DEFAULT_CHUNK_SIZE)) {
        if (cancelHashingRef.current) {
          setIsHashing(false)
          return
        }

        await storeChunk(modelId, chunk.index, chunk.data, address)
        pieces.push({
          index: chunk.index,
          hash: chunk.hash,
          size: chunk.data.byteLength,
        })
        processed++
        bytesProcessed += chunk.data.byteLength

        const elapsedSec = (performance.now() - startTime) / 1000
        const mbps = elapsedSec > 0 ? (bytesProcessed / (1024 * 1024)) / elapsedSec : 0

        setHashProgress({
          current: processed,
          total,
          mbps: Math.round(mbps * 10) / 10,
        })
      }

      setChunksInfo(pieces)
      setHashingComplete(true)
      setIsHashing(false)
      setActiveStep(3)
    } catch (err: unknown) {
      setIsHashing(false)
      const msg = err instanceof Error ? err.message : String(err)
      setPublishError(`Local hashing error: ${msg}`)
    }
  }

  // Step 3 Action: Pin Model Passport via Upload Broker
  const handlePinPassport = async () => {
    if (!file || !address || !registeredModelId || chunksInfo.length === 0) return
    setIsPinning(true)
    setPublishError(null)

    try {
      const manifest: ChunkManifest = {
        modelId: registeredModelId,
        modelName: modelName.trim() || file.name,
        totalSize: file.size,
        chunkSize: DEFAULT_CHUNK_SIZE,
        chunks: chunksInfo,
      modelCard: `# ${modelName.trim() || file.name} (v${version})\n\n- **License**: ${license}\n- **Based on**: ${lineage || 'Original model'}\n- **Verified pieces**: ${chunksInfo.length}\n\nPublished by \`${address}\` to the Torrentia network.`,
        createdAt: Date.now(),
      }

      const rawJSON = JSON.stringify(manifest)
      const manifestHash = await computeManifestHash(rawJSON)

      const intent = buildUploadIntent({
        creator: address as `0x${string}`,
        modelId: registeredModelId as `0x${string}`,
        totalSize: file.size,
        chunkCount: chunksInfo.length,
        manifestHash,
      })

      const signature = await signTypedDataAsync({
        domain: UPLOAD_BROKER_DOMAIN,
        types: UPLOAD_INTENT_TYPES,
        primaryType: 'UploadIntent',
        message: {
          creator: intent.creator,
          modelId: intent.modelId,
          totalSize: intent.totalSize,
          chunkCount: intent.chunkCount,
          manifestHash: intent.manifestHash,
          nonce: intent.nonce,
          deadline: intent.deadline,
        },
      })

      const brokerResult = await submitToUploadBroker(intent, signature, manifest)
      setIpfsCid(brokerResult.cid)
      setIsPinning(false)
      setActiveStep(4)
    } catch (err: unknown) {
      setIsPinning(false)
      const msg = err instanceof Error ? err.message : String(err)

      // Strict Mode Governance (Spec 25): No fake fallback CIDs in testnet/mainnet
      if (!allowMockFallbacks()) {
        setPublishError(`Could not save the model information: ${msg}`)
        return
      }

      // Demo fallback only
      const demoCid = `bafkreidemo${Math.random().toString(16).substring(2, 34)}`
      setIpfsCid(demoCid)
      setActiveStep(4)
    }
  }

  // Step 5 Action: Register on Monad
  const handleRegisterOnChain = async () => {
    if (!registeredModelId || !ipfsCid || !file || !address) return
    setIsRegistering(true)
    setPublishError(null)

    const metadataURI = `ipfs://${ipfsCid}`
    const priceWei = parseEther(chunkPriceMon || '0.0001')

    try {
      if (MODEL_REGISTRY_ADDRESS && MODEL_REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        const hash = await register({
          modelId: registeredModelId,
          metadataURI,
          chunkPrice: priceWei,
          creatorShareBps,
          chunkCount: chunksInfo.length,
        })
        setTxHash(hash)
      } else {
        if (!allowMockFallbacks()) {
          throw new Error('ModelRegistry contract address not configured on Monad testnet.')
        }
        setTxHash('0xmocktx' + Math.random().toString(16).substring(2).padEnd(56, '0'))
      }

      // Save locally to immediate catalog
      saveLocalUploadedModel({
        modelId: registeredModelId,
        modelName: modelName.trim() || file.name,
        originalCreator: address,
        metadataURI,
        chunkPrice: priceWei,
        creatorShareBps,
        chunkCount: chunksInfo.length,
        totalSize: file.size,
        active: true,
        seederCount: 1,
        totalDownloads: 0,
        registeredAt: Date.now(),
        category: file.name.toLowerCase().includes('lora') ? 'LoRA' : 'Vision',
        format: file.name.endsWith('.safetensors') ? 'Safetensors' : file.name.endsWith('.gguf') ? 'GGUF' : 'ONNX',
      })

      setIsRegistering(false)
    } catch (err: unknown) {
      setIsRegistering(false)
      const msg = err instanceof Error ? err.message : String(err)
      setPublishError(`On-chain registration failed: ${msg}`)
    }
  }

  const handleCopyCli = () => {
    if (!registeredModelId) return
    const cmd = `torrentia-seeder --model ${registeredModelId}`
    navigator.clipboard.writeText(cmd)
    setCopiedCli(true)
    setTimeout(() => setCopiedCli(false), 2000)
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-8)', width: '100%' }}>
      {/* Page Title & Breadcrumb */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: "'Apfel Grotezk', 'Plus Jakarta Sans', sans-serif", fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Publish AI Model
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          Prepare your model files, choose your custom creator royalty split (up to 99%), and register on Monad with zero cloud middlemen.
        </p>
      </div>

      {/* 5-Step Step Indicator */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-8)',
        }}
      >
        {[
          { num: 1, label: '1. Select File' },
          { num: 2, label: '2. Prepare & Hash' },
          { num: 3, label: '3. Model Passport' },
          { num: 4, label: '4. Set Economics' },
          { num: 5, label: '5. Publish & Seed' },
        ].map((s) => {
          const isCurrent = activeStep === s.num
          const isDone = activeStep > s.num
          return (
            <div
              key={s.num}
              style={{
                padding: '0.625rem 0.75rem',
                borderRadius: '12px',
                background: isCurrent
                  ? 'rgba(124, 58, 237, 0.1)'
                  : isDone
                  ? 'rgba(16, 185, 129, 0.08)'
                  : 'rgba(28, 25, 23, 0.03)',
                border: isCurrent
                  ? '1px solid #7c3aed'
                  : isDone
                  ? '1px solid rgba(16, 185, 129, 0.25)'
                  : '1px solid rgba(28, 25, 23, 0.08)',
                color: isCurrent ? '#7c3aed' : isDone ? '#059669' : '#78716c',
                fontWeight: isCurrent ? 700 : 600,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
            >
              {isDone ? <Check size={13} /> : <span>{s.num}.</span>}
              <span>{s.label.split('. ')[1]}</span>
            </div>
          )
        })}
      </div>

      {/* Error Alert */}
      {publishError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#b91c1c',
            fontSize: '0.875rem',
          }}
        >
          <AlertTriangle size={20} />
          <div style={{ flex: 1 }}>{publishError}</div>
        </div>
      )}

      {/* Main Grid: Wizard Form on Left (1.6fr), Sticky Summary on Right (1fr) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 1fr)',
          gap: 'var(--space-8)',
          alignItems: 'start',
        }}
      >
        {/* WIZARD CARD */}
        <Card>
          <CardBody style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* STEP 1: SELECT MODEL FILE */}
            {activeStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Step 1: Select Model File
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Select your model file in an open format (.gguf, .safetensors, .onnx). Executables and scripts are blocked for safety.
                  </p>
                </div>

                <FileDropZone file={file} onFileSelect={handleFileSelect} />

                {file && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                    <Button
                      variant="primary"
                      onClick={() => setActiveStep(2)}
                      rightIcon={<ArrowRight size={16} />}
                    >
                      Continue to Slicing & Hashing
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: LOCAL STREAMING & HASHING */}
            {activeStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Step 2: Prepare & Local Streaming
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Prepare your model into uniform 1 MB pieces with cryptographic SHA-256 verification in your browser.
                  </p>
                </div>

                {/* Hashing Stats Box */}
                <div
                  style={{
                    background: 'rgba(28, 25, 23, 0.03)',
                    border: '1px solid rgba(28, 25, 23, 0.08)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      {hashingComplete
                        ? 'All Pieces Sliced & Hashed!'
                        : isHashing
                        ? `Processing Pieces: ${hashProgress.current} / ${hashProgress.total}`
                        : 'Ready to slice file into 1 MB pieces'}
                    </span>
                    {isHashing && (
                      <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: '#7c3aed', fontWeight: 700 }}>
                        {hashProgress.mbps} MB/s
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: '8px',
                      background: 'rgba(28, 25, 23, 0.08)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${estimatedChunks > 0 ? (hashProgress.current / estimatedChunks) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, #7c3aed, #10b981)',
                        transition: 'width 0.15s ease-out',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#78716c' }}>
                    <span>Target Storage: Local Model Storage (IndexedDB)</span>
                    <span>Footprint: ~{formatFileSize(file?.size || 0)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="ghost" onClick={() => setActiveStep(1)} leftIcon={<ArrowLeft size={16} />}>
                    Back
                  </Button>

                  {!hashingComplete ? (
                    <Button
                      variant="primary"
                      onClick={handleStartHashing}
                      isLoading={isHashing}
                      disabled={isHashing}
                      leftIcon={<HardDrive size={16} />}
                    >
                      {isHashing ? 'Hashing Pieces...' : 'Start Slicing & Hashing'}
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={() => setActiveStep(3)} rightIcon={<ArrowRight size={16} />}>
                      Continue to Passport
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW MODEL PASSPORT */}
            {activeStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Step 3: Review Model Passport
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Define the cryptographic passport metadata, licensing, and upstream base model lineage.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '4px' }}>
                      Model Name
                    </label>
                    <Input
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g. Llama-3-8B-Instruct-GGUF"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '4px' }}>
                        Version (SemVer)
                      </label>
                      <Input
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '4px' }}>
                        SPDX License
                      </label>
                      <select
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(28, 25, 23, 0.16)',
                          background: '#ffffff',
                          fontSize: '0.875rem',
                          color: '#1c1917',
                        }}
                      >
                        {POPULAR_LICENSES.map((lic) => (
                          <option key={lic} value={lic}>
                            {lic}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '4px' }}>
                      Upstream Lineage / Ancestry (Optional)
                    </label>
                    <Input
                      value={lineage}
                      onChange={(e) => setLineage(e.target.value)}
                      placeholder="e.g. meta-llama/Meta-Llama-3-8B"
                    />
                  </div>

                  {/* Passport IPFS Pinning Status */}
                  <div
                    style={{
                      background: ipfsCid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(28, 25, 23, 0.03)',
                      border: ipfsCid ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(28, 25, 23, 0.08)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#78716c', fontWeight: 600 }}>
                    Saved model information
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: ipfsCid ? '#059669' : '#1c1917', wordBreak: 'break-all' }}>
                        {ipfsCid || 'Not pinned yet (requires wallet signature)'}
                      </div>
                    </div>

                    {!ipfsCid && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handlePinPassport}
                        isLoading={isPinning}
                        leftIcon={<FileCode size={14} />}
                      >
                        Save information
                      </Button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="ghost" onClick={() => setActiveStep(2)} leftIcon={<ArrowLeft size={16} />}>
                    Back
                  </Button>

                  <Button
                    variant="primary"
                    disabled={!ipfsCid}
                    onClick={() => setActiveStep(4)}
                    rightIcon={<ArrowRight size={16} />}
                  >
                    Continue to pricing
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: SET ECONOMICS & ROYALTY SPLIT */}
            {activeStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Step 4: Set price and earnings
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Choose the price per piece and how earnings are shared with people who provide your model.
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '4px' }}>
                    Price per piece (MON)
                  </label>
                  <Input
                    type="number"
                    step="0.00001"
                    min="0"
                    value={chunkPriceMon}
                    onChange={(e) => setChunkPriceMon(e.target.value)}
                    placeholder="0.0001"
                  />
                </div>

                <ShareSlider
                  valueBps={creatorShareBps}
                  onChange={(bps) => setCreatorShareBps(bps)}
                />

                {/* Plain Language Economics Card (Spec 25) */}
                <div
                  style={{
                    background: 'rgba(28, 25, 23, 0.03)',
                    borderRadius: '12px',
                    padding: '1rem',
                    border: '1px solid rgba(28, 25, 23, 0.08)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#1c1917' }}>Your estimated earnings:</div>
                  <div style={{ color: '#44403c' }}>
                    • <strong>Per piece:</strong> You receive <strong>{creatorEarnPerPiece} MON</strong> ({creatorPercent}%) and community hosts receive <strong>{seederEarnPerPiece} MON</strong> ({seederPercent}%).
                  </div>
                  <div style={{ color: '#44403c' }}>
                    • <strong>Full download ({estimatedChunks} pieces):</strong> You earn <strong>{creatorTotalEarn} MON</strong>; community hosts earn <strong>{seederTotalEarn} MON</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="ghost" onClick={() => setActiveStep(3)} leftIcon={<ArrowLeft size={16} />}>
                    Back
                  </Button>

                  <Button variant="primary" onClick={() => setActiveStep(5)} rightIcon={<ArrowRight size={16} />}>
                    Continue to publish
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: PUBLISH & SEED */}
            {activeStep === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Step 5: Publish and share
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Publish your model and choose whether to keep sharing it from this browser.
                  </p>
                </div>

                {/* Action Card A: Register on Monad */}
                <div
                  style={{
                    background: txHash ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.9)',
                    border: txHash ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(28, 25, 23, 0.12)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Share2 size={18} color="#7c3aed" />
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                        Publish model
                      </span>
                    </div>
                    {txHash && (
                      <Badge variant="active">
                        <CheckCircle2 size={12} /> Confirmed on Monad
                      </Badge>
                    )}
                  </div>

                  <p style={{ fontSize: 'var(--text-xs)', color: '#57534e', margin: 0 }}>
                    Publishes your model details, price, and earnings split to the network.
                  </p>

                  {!txHash ? (
                    <Button
                      variant="primary"
                      onClick={handleRegisterOnChain}
                      isLoading={isRegistering}
                      disabled={isRegistering || !isConnected}
                    >
                      {!isConnected ? 'Connect account to publish' : 'Publish model'}
                    </Button>
                  ) : (
                    <div style={{ fontSize: 'var(--text-xs)', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Transaction confirmed:</span>
                      <a
                        href={getMonadscanTxUrl(txHash)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#7c3aed', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        {txHash.slice(0, 14)}...{txHash.slice(-8)}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Card B: Swarm Seeding */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(28, 25, 23, 0.12)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Flame size={18} color="var(--color-warning)" />
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                        Keep sharing this model
                      </span>
                    </div>
                    {isSeeding && (
                      <Badge variant="seeding">
                        <Radio size={12} /> Sharing from this browser
                      </Badge>
                    )}
                  </div>

                  <p style={{ fontSize: 'var(--text-xs)', color: '#57534e', margin: 0 }}>
                    Keep this page open to help others download the model, or use the optional desktop seeder later.
                  </p>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {isSeeding ? (
                      <Button variant="secondary" size="sm" onClick={stopSeeding}>
                        Stop sharing
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={startSeeding}
                        leftIcon={<Flame size={14} color="var(--color-warning)" />}
                      >
                        Start sharing from this browser
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCli}
                      leftIcon={copiedCli ? <Check size={14} /> : <Terminal size={14} />}
                    >
                      {copiedCli ? 'Command copied' : 'Advanced setup'}
                    </Button>
                  </div>
                </div>

                {/* Success Next Steps */}
                {txHash && (
                  <div
                    style={{
                      background: 'hsla(155, 75%, 45%, 0.1)',
                      border: '1px solid hsla(155, 75%, 45%, 0.3)',
                      borderRadius: '14px',
                      padding: '1rem',
                      fontSize: 'var(--text-xs)',
                      color: '#065f46',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>🎉 Model Published!</strong> View your live model on the{' '}
                    <Link to={`/model/${registeredModelId}`} style={{ color: '#7c3aed', fontWeight: 700 }}>
                      Model Detail page
                    </Link>{' '}
                    or check your creator stats in the{' '}
                    <Link to="/dashboard" style={{ color: '#7c3aed', fontWeight: 700 }}>
                      Creator Dashboard
                    </Link>
                    .
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Button variant="ghost" onClick={() => setActiveStep(4)} leftIcon={<ArrowLeft size={16} />}>
                  Back to pricing
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* PERSISTENT RIGHT-HAND SUMMARY PANEL (Spec 25) */}
        <div
          className="glass"
          style={{
            position: 'sticky',
            top: '84px',
            borderRadius: '20px',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(28, 25, 23, 0.1)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} color="#7c3aed" />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
              Model summary
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(28, 25, 23, 0.06)', paddingBottom: '6px' }}>
              <span style={{ color: '#78716c' }}>Model Name</span>
              <span style={{ fontWeight: 600, color: '#1c1917' }}>{modelName || '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(28, 25, 23, 0.06)', paddingBottom: '6px' }}>
              <span style={{ color: '#78716c' }}>Total Size</span>
              <span style={{ fontWeight: 600, color: '#1c1917' }}>{file ? formatFileSize(file.size) : '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(28, 25, 23, 0.06)', paddingBottom: '6px' }}>
              <span style={{ color: '#78716c' }}>Pieces</span>
              <span style={{ fontWeight: 600, color: '#1c1917' }}>{estimatedChunks > 0 ? `${estimatedChunks} pieces (1 MB ea)` : '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(28, 25, 23, 0.06)', paddingBottom: '6px' }}>
              <span style={{ color: '#78716c' }}>Piece Price</span>
              <span style={{ fontWeight: 600, color: 'var(--color-accent-bright)', fontFamily: 'var(--font-mono)' }}>
                {chunkPriceMon ? `${chunkPriceMon} MON` : '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(28, 25, 23, 0.06)', paddingBottom: '6px' }}>
              <span style={{ color: '#78716c' }}>Earnings split</span>
              <span style={{ fontWeight: 600, color: '#1c1917' }}>
                {creatorPercent}% creator / {seederPercent}% provider
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(28, 25, 23, 0.06)', paddingBottom: '6px' }}>
              <span style={{ color: '#78716c' }}>Est. Total Revenue</span>
              <span style={{ fontWeight: 700, color: '#059669', fontFamily: 'var(--font-mono)' }}>
                {totalRevenue} MON
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(28, 25, 23, 0.06)', paddingBottom: '6px' }}>
              <span style={{ color: '#78716c' }}>Creator Account</span>
              {isConnected && address ? (
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConnectWallet}
                  leftIcon={<Wallet size={12} />}
                  style={{ fontSize: '11px', padding: '2px 8px', height: 'auto' }}
                >
                  Connect
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#78716c' }}>Model information</span>
              <span style={{ fontWeight: 600, color: ipfsCid ? '#059669' : '#78716c', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                {ipfsCid ? `${ipfsCid.slice(0, 10)}...${ipfsCid.slice(-6)}` : 'Pending Step 3'}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '10px',
              borderRadius: '10px',
              background: 'rgba(124, 58, 237, 0.05)',
              border: '1px solid rgba(124, 58, 237, 0.15)',
              fontSize: '11px',
              color: '#57534e',
              lineHeight: 1.4,
            }}
          >
            <ShieldCheck size={14} color="#7c3aed" style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
            <strong>Your files stay yours:</strong> Model information is saved for discovery; the model itself is shared directly between people.
          </div>
        </div>
      </div>
    </div>
  )
}
