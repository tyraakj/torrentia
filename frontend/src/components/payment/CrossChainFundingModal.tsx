import React, { useState, useEffect, useMemo } from 'react'
import {
  SUPPORTED_ORIGIN_CHAINS,
  SUPPORTED_ORIGIN_TOKENS,
  calculateIntentQuote,
  executeAuroraIntent,
  type IntentQuote,
  type IntentStatusUpdate,
} from '../../services/aurora/intents-client'
import { formatEther } from 'viem'

interface CrossChainFundingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (creditedWei: bigint) => void
  requiredAmountWei?: bigint
  recipientAddress?: string
  modelName?: string
}

export const CrossChainFundingModal: React.FC<CrossChainFundingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  requiredAmountWei = 10000000000000000n, // Default 0.01 MON
  recipientAddress = '0x0000000000000000000000000000000000000000',
  modelName = 'AI Model Weights',
}) => {
  const [selectedChainId, setSelectedChainId] = useState<string>('base')
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>('USDC')
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [statusUpdate, setStatusUpdate] = useState<IntentStatusUpdate | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset token when chain changes if token is not supported on new chain
  useEffect(() => {
    const available = SUPPORTED_ORIGIN_TOKENS[selectedChainId] || []
    if (!available.some((t) => t.symbol === selectedTokenSymbol)) {
      setSelectedTokenSymbol(available[0]?.symbol || 'USDC')
    }
  }, [selectedChainId, selectedTokenSymbol])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsExecuting(false)
      setStatusUpdate(null)
      setErrorMessage(null)
    }
  }, [isOpen])

  const quote: IntentQuote = useMemo(() => {
    return calculateIntentQuote({
      fromChainId: selectedChainId,
      fromTokenSymbol: selectedTokenSymbol,
      toAmountMonWei: requiredAmountWei,
      recipientAddress,
    })
  }, [selectedChainId, selectedTokenSymbol, requiredAmountWei, recipientAddress])

  if (!isOpen) return null

  const handleExecute = async () => {
    setIsExecuting(true)
    setErrorMessage(null)

    try {
      const finalResult = await executeAuroraIntent(quote, (update) => {
        setStatusUpdate(update)
      })

      if (finalResult.status === 'SETTLED') {
        setTimeout(() => {
          onSuccess(finalResult.creditedMonWei)
          onClose()
        }, 1200)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cross-chain intent execution failed'
      setErrorMessage(msg)
      setIsExecuting(false)
    }
  }

  const availableTokens = SUPPORTED_ORIGIN_TOKENS[selectedChainId] || []

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExecuting) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'hsl(230, 20%, 11%)',
          border: '1px solid hsla(265, 90%, 65%, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px hsla(265, 90%, 65%, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: 'hsl(0, 0%, 95%)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid hsla(0, 0%, 100%, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(180deg, hsla(265, 90%, 65%, 0.08) 0%, transparent 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
                1-Click Cross-Chain Funding
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'hsl(230, 15%, 65%)' }}>
              Powered by <strong style={{ color: 'hsl(265, 90%, 65%)' }}>Aurora / NEAR Intents</strong> • Instant Solver Settlement
            </p>
          </div>
          {!isExecuting && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'hsl(230, 15%, 65%)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {statusUpdate?.status === 'SETTLED' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 241, 149, 0.15)',
                  color: 'hsl(155, 75%, 55%)',
                  fontSize: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  border: '1px solid hsl(155, 75%, 55%)',
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'hsl(0, 0%, 95%)' }}>
                Funding Complete!
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'hsl(230, 15%, 65%)' }}>
                Credited <strong>{parseFloat(formatEther(statusUpdate.creditedMonWei)).toFixed(4)} MON</strong> on Monad Testnet.
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'hsl(155, 75%, 55%)' }}>
                Resuming model download streaming...
              </p>
            </div>
          ) : isExecuting ? (
            /* Animated Progress Stepper */
            <div style={{ padding: '16px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor: 'hsla(265, 90%, 65%, 0.15)',
                    color: 'hsl(265, 90%, 65%)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  {statusUpdate?.status === 'SIGNING_INTENT'
                    ? 'Step 1/2: Authorizing Intent on ' + quote.fromChain.name
                    : 'Step 2/2: Solver Routing to Monad'}
                </div>
                <h4 style={{ margin: 0, fontSize: '1.05rem' }}>
                  {statusUpdate?.status === 'SIGNING_INTENT'
                    ? 'Signing zero-gas intent voucher...'
                    : 'Solvers executing deposit & routing on Monad...'}
                </h4>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '6px',
                  backgroundColor: 'hsla(0, 0%, 100%, 0.08)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'hsl(265, 90%, 65%)',
                    width: statusUpdate?.status === 'SIGNING_INTENT' ? '45%' : '85%',
                    transition: 'width 0.4s ease-out',
                  }}
                />
              </div>

              {statusUpdate?.txHashOrigin && (
                <div
                  style={{
                    marginTop: '20px',
                    fontSize: '0.8rem',
                    color: 'hsl(230, 15%, 65%)',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  }}
                >
                  Origin Tx: {statusUpdate.txHashOrigin.slice(0, 10)}...{statusUpdate.txHashOrigin.slice(-8)}
                </div>
              )}
            </div>
          ) : (
            /* Configuration view */
            <>
              {/* Origin Chain Selector */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(230, 15%, 65%)', marginBottom: '8px' }}>
                  Select Origin Chain
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {SUPPORTED_ORIGIN_CHAINS.map((chain) => {
                    const isSelected = chain.id === selectedChainId
                    return (
                      <button
                        key={chain.id}
                        type="button"
                        onClick={() => setSelectedChainId(chain.id)}
                        style={{
                          backgroundColor: isSelected ? 'hsla(265, 90%, 65%, 0.2)' : 'hsl(230, 18%, 15%)',
                          border: isSelected ? '1px solid hsl(265, 90%, 65%)' : '1px solid hsla(0, 0%, 100%, 0.08)',
                          borderRadius: '8px',
                          padding: '10px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          color: isSelected ? 'hsl(0, 0%, 95%)' : 'hsl(230, 15%, 65%)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{chain.icon}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 600 : 400 }}>
                          {chain.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Token Selector & Amount Calculator */}
              <div
                style={{
                  backgroundColor: 'hsl(230, 18%, 14%)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid hsla(0, 0%, 100%, 0.06)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(230, 15%, 65%)' }}>
                    You Pay on {quote.fromChain.name}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {availableTokens.map((t) => (
                      <button
                        key={t.symbol}
                        type="button"
                        onClick={() => setSelectedTokenSymbol(t.symbol)}
                        style={{
                          backgroundColor: t.symbol === selectedTokenSymbol ? 'hsl(265, 90%, 65%)' : 'hsl(230, 20%, 18%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: t.symbol === selectedTokenSymbol ? '#fff' : 'hsl(230, 15%, 70%)',
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {t.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'hsl(0, 0%, 95%)' }}>
                    {quote.fromAmount} <span style={{ fontSize: '1rem', color: 'hsl(265, 90%, 65%)' }}>{quote.fromToken.symbol}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'hsl(230, 15%, 65%)' }}>
                    ≈ ${(parseFloat(quote.fromAmount) * quote.fromToken.priceUsd).toFixed(2)} USD
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid hsla(0, 0%, 100%, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    color: 'hsl(230, 15%, 65%)',
                  }}
                >
                  <span>Receiving on Monad:</span>
                  <span style={{ color: 'hsl(155, 75%, 55%)', fontWeight: 600 }}>
                    +{quote.toAmountMon} MON
                  </span>
                </div>
              </div>

              {/* Model & Routing Specs */}
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'hsl(230, 15%, 65%)',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Target Model:</span>
                  <span style={{ color: 'hsl(0, 0%, 90%)' }}>{modelName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rate:</span>
                  <span>{quote.exchangeRate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Estimated Time:</span>
                  <span>~{quote.estimatedTimeSeconds} seconds</span>
                </div>
              </div>

              {errorMessage && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    border: '1px solid rgba(255, 59, 48, 0.3)',
                    color: '#ff6b6b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '16px',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExecute}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: 'hsl(265, 90%, 65%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px hsla(265, 90%, 65%, 0.35)',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <span>Authorize & Stream</span>
                <span>→</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
