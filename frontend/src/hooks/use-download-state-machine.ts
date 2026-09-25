/**
 * Deterministic 10-State Download State Machine Hook for Torrentia.
 * Governs wallet checks, peer discovery, payment authorization,
 * piecewise frame streaming, SHA-256 passport verification, and local storage.
 * Defined in Spec 25 and docs/ux-product-flow.md.
 */

import { useCallback, useMemo } from 'react'
import { useAccount, useSwitchChain, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import type {
  DownloadStateMachineState,
  StateDetails,
  ActiveTransportType,
  IndexedModel,
  ChunkManifest,
  DownloadStatus,
} from '../lib/types'
import { monadTestnet } from '../lib/wagmi'

export interface UseDownloadStateMachineProps {
  model: IndexedModel
  manifest?: ChunkManifest | null
  heldChunkCount: number
  downloadStatus: DownloadStatus
  downloadError?: string
  activeTransport?: ActiveTransportType
  currentChunkIndex: number
  totalChunks: number
  isSeederOnline?: boolean
  onStartDownload: () => Promise<void>
  onConnectWallet: () => void
  onExportLocalFile: () => void
  onRetry: () => void
  onOpenCrossChainFunding?: () => void
}

export function useDownloadStateMachine({
  model,
  manifest: _manifest,
  heldChunkCount,
  downloadStatus,
  downloadError,
  activeTransport = 'none',
  currentChunkIndex,
  totalChunks,
  isSeederOnline,
  onStartDownload,
  onConnectWallet,
  onExportLocalFile,
  onRetry,
  onOpenCrossChainFunding,
}: UseDownloadStateMachineProps): {
  stateDetails: StateDetails
  handlePrimaryAction: () => void
  canDownload: boolean
} {
  const { isConnected, address, chainId: walletChainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const { data: balanceData } = useBalance({
    address,
    chainId: monadTestnet.id,
  })

  const isWrongChain = isConnected && walletChainId !== undefined && walletChainId !== monadTestnet.id
  const totalCostWei = model.chunkPrice * BigInt(totalChunks > 0 ? totalChunks : 1)
  const userBalanceWei = balanceData?.value ?? 0n
  const isInsufficientBalance = isConnected && !isWrongChain && userBalanceWei < totalCostWei

  // Map low-level downloader status to the 10-state machine
  const computedState = useMemo<DownloadStateMachineState>(() => {
    if (downloadStatus === 'error') {
      return 'error'
    }

    if (downloadStatus === 'complete' || (heldChunkCount >= totalChunks && totalChunks > 0)) {
      return 'complete'
    }

    if (downloadStatus === 'discovering') {
      return 'discovering_peers'
    }

    if (downloadStatus === 'paying') {
      return 'payment_pending'
    }

    if (downloadStatus === 'downloading') {
      return 'receiving_piece'
    }

    if (downloadStatus === 'verifying') {
      return 'verifying_hash'
    }

    if (downloadStatus === 'reassembling') {
      return 'saved_locally'
    }

    // Pre-flight checks when user attempts to download
    if (!isConnected) {
      return 'checking_wallet'
    }

    if (isWrongChain) {
      return 'checking_wallet'
    }

    if (isInsufficientBalance) {
      return 'checking_wallet'
    }

    return 'idle'
  }, [
    downloadStatus,
    downloadError,
    heldChunkCount,
    totalChunks,
    isConnected,
    isWrongChain,
    isInsufficientBalance,
  ])

  // Build the rich StateDetails with canonical vocabulary and recovery actions
  const stateDetails = useMemo<StateDetails>(() => {
    const currentPieceNum = Math.min(currentChunkIndex + 1, totalChunks)

    switch (computedState) {
      case 'checking_wallet': {
        if (!isConnected) {
          return {
            state: 'checking_wallet',
            currentChunk: currentPieceNum,
            totalChunks,
            activeTransport: 'none',
            message: 'Connect an account to pay for missing pieces',
            recoveryAction: {
              label: 'Connect Wallet',
              action: onConnectWallet,
            },
          }
        }
        if (isWrongChain) {
          return {
            state: 'checking_wallet',
            currentChunk: currentPieceNum,
            totalChunks,
            activeTransport: 'none',
            message: 'Switch to Monad Testnet (Chain ID 10143) to continue',
            recoveryAction: {
              label: 'Switch Network',
              action: () => switchChain({ chainId: monadTestnet.id }),
            },
          }
        }
        if (isInsufficientBalance) {
          return {
            state: 'checking_wallet',
            currentChunk: currentPieceNum,
            totalChunks,
            activeTransport: 'none',
            message: `Insufficient MON balance (${formatEther(userBalanceWei)} MON available, ${formatEther(totalCostWei)} MON required)`,
            recoveryAction: {
              label: onOpenCrossChainFunding
                ? 'Pay from Any Chain (USDC / ETH)'
                : 'Open Monad Faucet',
              action:
                onOpenCrossChainFunding ||
                (() => window.open('https://testnet.monad.xyz', '_blank')),
            },
          }
        }
        return {
          state: 'checking_wallet',
          currentChunk: currentPieceNum,
          totalChunks,
          activeTransport: 'none',
          message: 'Validating Monad account and session balance...',
        }
      }

      case 'discovering_peers': {
        return {
          state: 'discovering_peers',
          currentChunk: currentPieceNum,
          totalChunks,
          activeTransport: 'none',
          message: downloadError || 'Discovering active network seeders via Go WebSocket tracker...',
        }
      }

      case 'preparing_payment': {
        return {
          state: 'preparing_payment',
          currentChunk: currentPieceNum,
          totalChunks,
          activeTransport,
          message: `Formulating instant split payment for Verified Piece #${currentPieceNum}...`,
        }
      }

      case 'payment_pending': {
        return {
          state: 'payment_pending',
          currentChunk: currentPieceNum,
          totalChunks,
          activeTransport,
          message: `Waiting for Monad block confirmation for Piece #${currentPieceNum}...`,
        }
      }

      case 'receiving_piece': {
        const transportLabel =
          activeTransport === 'persistent_seeder'
            ? 'Persistent Seeder Node (HTTP/QUIC)'
            : 'Direct Browser Peer (WebRTC)'
        return {
          state: 'receiving_piece',
          currentChunk: currentPieceNum,
          totalChunks,
          activeTransport,
          message: `Streaming 16 KB frames for Piece #${currentPieceNum} of ${totalChunks} via ${transportLabel}...`,
        }
      }

      case 'verifying_hash': {
        return {
          state: 'verifying_hash',
          currentChunk: currentPieceNum,
          totalChunks,
          activeTransport,
          message: `Verifying cryptographic SHA-256 byte hash against Model Passport for Piece #${currentPieceNum}...`,
        }
      }

      case 'saved_locally': {
        return {
          state: 'saved_locally',
          currentChunk: currentPieceNum,
          totalChunks,
          activeTransport,
          message: `Persisting Piece #${currentPieceNum} into Local Model Storage (IndexedDB)...`,
        }
      }

      case 'complete': {
        return {
          state: 'complete',
          currentChunk: totalChunks,
          totalChunks,
          activeTransport,
          message: `Model verified and saved locally (${totalChunks}/${totalChunks} pieces match SHA-256 Passport)`,
          recoveryAction: {
            label: 'Save Assembled Model (.bin)',
            action: onExportLocalFile,
          },
        }
      }

      case 'error': {
        const errText = downloadError || 'Download interrupted unexpectedly.'
        let actionLabel = 'Retry Download'
        let actionFn = onRetry

        const normalizedError = errText.toLowerCase()
        if (normalizedError.includes('switch to') || normalizedError.includes('chain id') || isWrongChain) {
          actionLabel = 'Switch to Monad Testnet'
          actionFn = () => switchChain({ chainId: monadTestnet.id })
        } else if (!isConnected && (normalizedError.includes('wallet') || normalizedError.includes('connect'))) {
          actionLabel = 'Connect Wallet'
          actionFn = onConnectWallet
        } else if (normalizedError.includes('signer unavailable') || normalizedError.includes('initialize transaction signer')) {
          actionLabel = 'Retry Download'
          actionFn = onRetry
        } else if (errText.toLowerCase().includes('storage') || errText.toLowerCase().includes('quota')) {
          actionLabel = 'Clear Local Storage'
          actionFn = () => {
            if (typeof window !== 'undefined') window.indexedDB?.deleteDatabase('torrentia_chunks_db')
            onRetry()
          }
        }

        return {
          state: 'error',
          currentChunk: currentPieceNum,
          totalChunks,
          activeTransport,
          message: errText,
          recoveryAction: {
            label: actionLabel,
            action: actionFn,
          },
        }
      }

      case 'idle':
      default: {
        return {
          state: 'idle',
          currentChunk: heldChunkCount,
          totalChunks,
          activeTransport: 'none',
          message:
            heldChunkCount > 0
              ? `${heldChunkCount}/${totalChunks} pieces held in Local Model Storage. Ready to resume.`
              : 'Ready to connect to Monad network and stream verified pieces.',
        }
      }
    }
  }, [
    computedState,
    currentChunkIndex,
    totalChunks,
    activeTransport,
    heldChunkCount,
    isConnected,
    isWrongChain,
    isInsufficientBalance,
    userBalanceWei,
    totalCostWei,
    isSeederOnline,
    downloadError,
    onConnectWallet,
    switchChain,
    onRetry,
    onExportLocalFile,
  ])

  const handlePrimaryAction = useCallback(() => {
    if (!isConnected) {
      onConnectWallet()
      return
    }
    if (isWrongChain) {
      switchChain({ chainId: monadTestnet.id })
      return
    }
    if (computedState === 'complete') {
      onExportLocalFile()
      return
    }
    if (computedState === 'error') {
      if (stateDetails.recoveryAction) {
        stateDetails.recoveryAction.action()
      } else {
        onRetry()
      }
      return
    }

    void onStartDownload()
  }, [
    isConnected,
    isWrongChain,
    computedState,
    stateDetails,
    onConnectWallet,
    switchChain,
    onExportLocalFile,
    onRetry,
    onStartDownload,
  ])

  const canDownload = isConnected && !isWrongChain && (!model.chunkCount || model.chunkCount > 0)

  return {
    stateDetails,
    handlePrimaryAction,
    canDownload,
  }
}
