import React, { useState } from 'react'
import { useAccount, useConnect, useSignTypedData } from 'wagmi'
import { parseEther } from 'viem'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { FileDropZone } from '../components/upload/FileDropZone'
import { ShareSlider } from '../components/upload/ShareSlider'
import { UploadProgress } from '../components/upload/UploadProgress'
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
import { MODEL_REGISTRY_ADDRESS } from '../lib/contracts'
import { saveLocalUploadedModel } from '../services/api-client'
import { UploadCloud, CheckCircle, ArrowRight, Wallet, Sparkles, ShieldCheck } from 'lucide-react'

export const Upload: React.FC = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { register } = useRegisterModel()
  const { signTypedDataAsync } = useSignTypedData()

  // Form State
  const [modelName, setModelName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [chunkPriceMon, setChunkPriceMon] = useState('0.0001')
  const [creatorShareBps, setCreatorShareBps] = useState(7000) // 70% default

  // Upload Execution State
  const [isUploading, setIsUploading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 })
  const [ipfsCid, setIpfsCid] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [registeredModelId, setRegisteredModelId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Computed Live Metrics
  const estimatedChunks = file ? Math.max(1, Math.ceil(file.size / DEFAULT_CHUNK_SIZE)) : 0
  const pricePerChunkWei = (() => {
    try {
      return parseEther(chunkPriceMon || '0')
    } catch {
      return 0n
    }
  })()
  const totalCostMon = file ? (parseFloat(chunkPriceMon || '0') * estimatedChunks).toFixed(4) : '0.0000'
  const creatorPercent = Math.round(creatorShareBps / 100)
  const seederPercent = 100 - creatorPercent
  const { isSeeding, startSeeding, stopSeeding } = useSeeding(
    registeredModelId || undefined,
    address,
    pricePerChunkWei.toString(),
  )

  // Handle Wallet Connect
  const handleConnectWallet = () => {
    const injected = connectors.find((c) => c.type === 'injected') || connectors[0]
    if (injected) connect({ connector: injected })
  }

  // Multi-step Upload Execution
  const handleStartUpload = async () => {
    if (!address || !file || !modelName.trim()) return

    setIsUploading(true)
    setError(null)
    setCurrentStep(1)

    const timestamp = Date.now()
    const modelId = generateModelId(address, modelName, timestamp)
    setRegisteredModelId(modelId)

    const chunksInfo: ChunkInfo[] = []
    const total = estimatedChunks
    setChunkProgress({ current: 0, total })

    try {
      // Step 1: Chunking, Hashing & Storing in IndexedDB
      let processed = 0
      for await (const chunk of chunkFile(file, DEFAULT_CHUNK_SIZE)) {
        await storeChunk(modelId, chunk.index, chunk.data, address)
        chunksInfo.push({
          index: chunk.index,
          hash: chunk.hash,
          size: chunk.data.byteLength,
        })
        processed++
        setChunkProgress({ current: processed, total })
      }

      // Step 2: Build & Pin Manifest to IPFS via Upload Broker
      setCurrentStep(2)
      const manifest: ChunkManifest = {
        modelId,
        modelName: modelName.trim(),
        totalSize: file.size,
        chunkSize: DEFAULT_CHUNK_SIZE,
        chunks: chunksInfo,
        modelCard: `# ${modelName.trim()}\n\nUploaded by ${address} to Torrentia P2P Swarm.`,
        createdAt: timestamp,
      }

      const rawJSON = JSON.stringify(manifest)
      const manifestHash = await computeManifestHash(rawJSON)

      const intent = buildUploadIntent({
        creator: address as `0x${string}`,
        modelId: modelId as `0x${string}`,
        totalSize: file.size,
        chunkCount: chunksInfo.length,
        manifestHash,
      })

      let signature: `0x${string}` = '0x'
      try {
        signature = await signTypedDataAsync({
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
      } catch (sigErr) {
        throw new Error(
          `Upload authorization rejected: ${
            sigErr instanceof Error ? sigErr.message : 'User rejected signature'
          }`
        )
      }

      const brokerResult = await submitToUploadBroker(intent, signature, manifest)
      const cid = brokerResult.cid
      setIpfsCid(cid)

      // Step 3: Register Model On-Chain via ModelRegistry
      setCurrentStep(3)
      const metadataURI = `ipfs://${cid}`
      let hash = '0xmocktx' + Math.random().toString(16).substring(2).padEnd(56, '0')

      if (MODEL_REGISTRY_ADDRESS && MODEL_REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        hash = await register({
          modelId,
          metadataURI,
          chunkPrice: pricePerChunkWei,
          creatorShareBps,
          chunkCount: chunksInfo.length,
        })
      } else {
        console.warn('ModelRegistry address not configured — registering in local swarm demo mode')
      }
      setTxHash(hash)

      // Save model locally so it instantly reflects in the Marketplace
      saveLocalUploadedModel({
        modelId,
        modelName: modelName.trim(),
        originalCreator: address,
        metadataURI,
        chunkPrice: pricePerChunkWei,
        creatorShareBps,
        chunkCount: chunksInfo.length,
        totalSize: file.size,
        active: true,
        seederCount: 0,
        totalDownloads: 0,
        registeredAt: Date.now(),
        category: file.name.toLowerCase().includes('lora') ? 'LoRA' : 'Vision',
        format: file.name.endsWith('.safetensors') ? 'Safetensors' : 'ONNX',
      })

      // Step 4: Ready to Seed
      setCurrentStep(4)
    } catch (err: unknown) {
      console.error('Upload flow error:', err)
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during upload.'
      setError(message)
    }
  }

  const handleRetry = () => {
    handleStartUpload()
  }

  // Render Disconnected State
  if (!isConnected || !address) {
    return (
      <div style={{ maxWidth: '640px', margin: 'var(--space-12) auto', padding: 'var(--space-8)', width: '100%' }}>
        <Card glow={true}>
          <CardBody style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
              }}
            >
              <Wallet size={32} />
            </div>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Connect Wallet to Upload
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              To distribute AI models and receive automatic on-chain revenue splits, connect your wallet to Monad Testnet.
            </p>
            <Button variant="primary" size="lg" onClick={handleConnectWallet}>
              Connect Wallet
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: 'var(--space-8)', width: '100%' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-2)' }}>
          <Sparkles size={16} color="var(--color-accent-bright)" />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-accent-bright)' }}>
            P2P MODEL REGISTRATION
          </span>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Upload & Seed AI Model
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Your file is chunked and hashed directly in your browser. No centralized server ever hosts your model.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isUploading ? '1fr' : '1.4fr 1fr', gap: 'var(--space-8)' }}>
        {/* Left Column: Form or Stepper Progress */}
        <div>
          {isUploading ? (
            <Card glow={true}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <UploadCloud size={20} color="var(--color-accent)" />
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>
                    Uploading "{modelName}"
                  </span>
                </div>
                {currentStep === 4 && <Badge variant={isSeeding ? 'active' : 'seeding'}>{isSeeding ? 'Live & Seeding' : 'Ready to Seed'}</Badge>}
              </CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <UploadProgress
                  currentStep={currentStep}
                  chunkProgress={chunkProgress}
                  ipfsCid={ipfsCid}
                  txHash={txHash}
                  error={error}
                  onRetry={handleRetry}
                />

                {currentStep === 4 && (
                  <div
                    style={{
                      padding: 'var(--space-6)',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-success)' }}>
                      <CheckCircle size={20} />
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>
                        Model Successfully Registered & Initialized!
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      All {chunkProgress.total} chunks have been content-hashed and stored in your wallet-scoped browser cache. Start seeding to announce them to the swarm.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            if (isSeeding) stopSeeding()
                            else await startSeeding()
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Unable to start seeding.')
                          }
                        }}
                      >
                        {isSeeding ? 'Stop Seeding' : 'Start Seeding to Swarm'}
                      </Button>
                      <Link to={`/model/${registeredModelId}`}>
                        <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                          View Model Page
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsUploading(false)
                          setFile(null)
                          setModelName('')
                        }}
                      >
                        Upload Another Model
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>
                  Model Configuration
                </span>
                <Badge variant="seeding">Monad Swarm</Badge>
              </CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {/* Model Name */}
                <Input
                  label="Model Repository / Name"
                  placeholder="e.g. meta-llama/Llama-3-8B-Instruct"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  helperText="Unique name for your model manifest"
                />

                {/* File DropZone */}
                <div>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                    Model File
                  </label>
                  <FileDropZone file={file} onFileSelect={setFile} />
                </div>

                {/* Chunk Price */}
                <Input
                  label="Chunk Price (in MON)"
                  type="number"
                  step="0.00001"
                  min="0.000001"
                  value={chunkPriceMon}
                  onChange={(e) => setChunkPriceMon(e.target.value)}
                  helperText="Uniform price paid by downloaders per 1MB chunk"
                />

                {/* Revenue Split Slider */}
                <ShareSlider
                  valueBps={creatorShareBps}
                  onChange={setCreatorShareBps}
                />

                <Button
                  variant="primary"
                  size="lg"
                  disabled={!file || !modelName.trim()}
                  onClick={handleStartUpload}
                  leftIcon={<UploadCloud size={18} />}
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  Start Chunking & Register Model
                </Button>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right Column: Live Economics & Summary Card */}
        {!isUploading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card>
              <CardHeader>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  Swarm Economics Preview
                </span>
                <ShieldCheck size={16} color="var(--color-accent-bright)" />
              </CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Selected File Size:</span>
                  <span style={{ fontWeight: 600 }}>{file ? formatFileSize(file.size) : 'No file selected'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Total Chunk Count:</span>
                  <span style={{ fontWeight: 600 }}>{estimatedChunks} chunks (1 MB each)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Price per Chunk:</span>
                  <span style={{ fontWeight: 600 }}>{chunkPriceMon} MON</span>
                </div>

                <div style={{ height: '1px', background: 'var(--color-border-glass)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--color-creator-share)', fontWeight: 600 }}>Your Royalty (Creator {creatorPercent}%):</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-creator-share)' }}>
                    {(parseFloat(chunkPriceMon || '0') * (creatorPercent / 100)).toFixed(6)} MON / chunk
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--color-seeder-share)', fontWeight: 600 }}>Seeder Earns ({seederPercent}%):</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-seeder-share)' }}>
                    {(parseFloat(chunkPriceMon || '0') * (seederPercent / 100)).toFixed(6)} MON / chunk
                  </span>
                </div>

                <div style={{ height: '1px', background: 'var(--color-border-glass)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                  <span>Total Full Model Cost:</span>
                  <span className="gradient-text">{totalCostMon} MON</span>
                </div>
              </CardBody>
            </Card>

            <div
              className="glass"
              style={{
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                fontSize: 'var(--text-xs)',
                color: '#57534e',
                lineHeight: 1.4,
                background: 'rgba(255, 255, 255, 0.78)',
                border: '1px solid rgba(28, 25, 23, 0.08)',
              }}
            >
              <div style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.25rem' }}>
                Why chunking matters
              </div>
              Downloader browsers fetch chunks in parallel from whoever is closest or fastest. With every chunk payment, the smart contract on Monad automatically splits the fee between you and that serving peer.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
