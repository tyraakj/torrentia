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
import { Layers, Check, X, ArrowRight } from 'lucide-react'

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
        backgroundColor: 'rgba(28, 25, 23, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(28, 25, 23, 0.08)',
          borderRadius: '20px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#181615',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(28, 25, 23, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(0, 98, 255, 0.04) 0%, transparent 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(0, 98, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={16} color="#0062FF" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#181615' }}>
                1-Click Cross-Chain Funding
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78125rem', color: '#78716C' }}>
              Powered by <strong style={{ color: '#0062FF' }}>Aurora / NEAR Intents</strong> &bull; Instant Solver Settlement
            </p>
          </div>
          {!isExecuting && (
            <button
              onClick={onClose}
              style={{
                background: '#F5F5F4',
                border: 'none',
                color: '#78716C',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E7E5E4'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5F5F4'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {statusUpdate?.status === 'SETTLED' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  border: '1px solid #A7F3D0',
                }}
              >
                <Check size={28} strokeWidth={2.5} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700, color: '#181615' }}>
                Funding Complete!
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#57534E' }}>
                Credited <strong>{parseFloat(formatEther(statusUpdate.creditedMonWei)).toFixed(4)} MON</strong> on Monad Testnet.
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8125rem', color: '#059669', fontWeight: 600 }}>
                Resuming model download streaming...
              </p>
            </div>
          ) : isExecuting ? (
            /* Animated Progress Stepper */
            <div style={{ padding: '1rem 0' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(0, 98, 255, 0.08)',
                    color: '#0062FF',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  {statusUpdate?.status === 'SIGNING_INTENT'
                    ? 'Step 1/2: Authorizing Intent on ' + quote.fromChain.name
                    : 'Step 2/2: Solver Routing to Monad'}
                </div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#181615' }}>
                  {statusUpdate?.status === 'SIGNING_INTENT'
                    ? 'Signing zero-gas intent voucher...'
                    : 'Solvers executing deposit & routing on Monad...'}
                </h4>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '6px',
                  backgroundColor: '#F5F5F4',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(28, 25, 23, 0.06)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#0062FF',
                    width: statusUpdate?.status === 'SIGNING_INTENT' ? '45%' : '85%',
                    transition: 'width 0.4s ease-out',
                  }}
                />
              </div>

              {statusUpdate?.txHashOrigin && (
                <div
                  style={{
                    marginTop: '20px',
                    fontSize: '0.75rem',
                    color: '#78716C',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
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
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#57534E', marginBottom: '8px' }}>
                  Select Origin Chain
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {SUPPORTED_ORIGIN_CHAINS.map((chain) => {
                    const isSelected = chain.id === selectedChainId
                    const logoDevToken = import.meta.env.VITE_LOGO_DEV_TOKEN || 'pk_BZOhereATUe11DHE7ILvBg'
                    return (
                      <button
                        key={chain.id}
                        type="button"
                        onClick={() => setSelectedChainId(chain.id)}
                        style={{
                          backgroundColor: isSelected ? 'rgba(0, 98, 255, 0.06)' : '#FAF9F5',
                          border: isSelected ? '2px solid #0062FF' : '1px solid rgba(28, 25, 23, 0.08)',
                          borderRadius: '12px',
                          padding: '10px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          color: isSelected ? '#0062FF' : '#57534E',
                          boxShadow: isSelected ? '0 2px 8px rgba(0, 98, 255, 0.12)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#FFFFFF',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={`https://img.logo.dev/${chain.domain}?token=${logoDevToken}&size=64&format=png`}
                            alt={`${chain.name} logo`}
                            width={20}
                            height={20}
                            style={{ objectFit: 'contain' }}
                            onError={(e) => {
                              const target = e.currentTarget
                              target.style.display = 'none'
                              if (target.parentElement) {
                                target.parentElement.textContent = chain.icon
                              }
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: isSelected ? 700 : 500 }}>
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
                  backgroundColor: '#F7F5F0',
                  borderRadius: '14px',
                  padding: '1.125rem',
                  border: '1px solid rgba(28, 25, 23, 0.08)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#78716C', fontWeight: 500 }}>
                    You Pay on {quote.fromChain.name}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {availableTokens.map((t) => {
                      const logoDevToken = import.meta.env.VITE_LOGO_DEV_TOKEN || 'pk_BZOhereATUe11DHE7ILvBg'
                      const tokenDomain = t.symbol === 'USDC' ? 'circle.com' : t.symbol === 'ETH' ? 'ethereum.org' : 'solana.com'
                      const isTokenSelected = t.symbol === selectedTokenSymbol
                      return (
                        <button
                          key={t.symbol}
                          type="button"
                          onClick={() => setSelectedTokenSymbol(t.symbol)}
                          style={{
                            backgroundColor: isTokenSelected ? '#0062FF' : '#FFFFFF',
                            border: isTokenSelected ? '1px solid #0062FF' : '1px solid rgba(28, 25, 23, 0.1)',
                            borderRadius: '8px',
                            color: isTokenSelected ? '#FFFFFF' : '#57534E',
                            padding: '3px 9px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: isTokenSelected ? '0 2px 6px rgba(0, 98, 255, 0.25)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <img
                            src={`https://img.logo.dev/${tokenDomain}?token=${logoDevToken}&size=32&format=png`}
                            alt={t.symbol}
                            width={13}
                            height={13}
                            style={{ borderRadius: '50%', objectFit: 'contain' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <span>{t.symbol}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#181615', fontFamily: 'var(--font-mono)' }}>
                    {quote.fromAmount}{' '}
                    <span style={{ fontSize: '1rem', color: '#0062FF', fontWeight: 700 }}>
                      {quote.fromToken.symbol}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#78716C', fontWeight: 500 }}>
                    &asymp; ${(parseFloat(quote.fromAmount) * quote.fromToken.priceUsd).toFixed(2)} USD
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(28, 25, 23, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    color: '#57534E',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Receiving on Monad:</span>
                  <span style={{ color: '#059669', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    +{quote.toAmountMon} MON
                  </span>
                </div>
              </div>

              {/* Model & Routing Specs */}
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: '#78716C',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: '#FFFFFF',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(28, 25, 23, 0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Target Model:</span>
                  <span style={{ color: '#181615', fontWeight: 600 }}>{modelName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rate:</span>
                  <span style={{ color: '#181615', fontFamily: 'var(--font-mono)' }}>{quote.exchangeRate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Estimated Time:</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>~{quote.estimatedTimeSeconds} seconds</span>
                </div>
              </div>

              {errorMessage && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#EF4444',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
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
                  padding: '0.85rem',
                  backgroundColor: '#0062FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 98, 255, 0.35)',
                  transition: 'background 0.15s ease, transform 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0052D9'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0062FF'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <span>Authorize &amp; Stream</span>
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
