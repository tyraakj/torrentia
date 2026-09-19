import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { MODEL_REGISTRY_ADDRESS, SPLIT_PAYMENT_ADDRESS } from '../lib/contracts'
import { MODEL_REGISTRY_ABI } from '../lib/abis/ModelRegistryABI'
import { SPLIT_PAYMENT_ABI } from '../lib/abis/SplitPaymentABI'

export function useModelRegistry() {
  return {
    address: MODEL_REGISTRY_ADDRESS,
    abi: MODEL_REGISTRY_ABI,
  }
}

export function useSplitPayment() {
  return {
    address: SPLIT_PAYMENT_ADDRESS,
    abi: SPLIT_PAYMENT_ABI,
  }
}

/**
 * Reads a model's on-chain data from ModelRegistry.
 */
export function useReadModel(modelId?: `0x${string}`) {
  return useReadContract({
    address: MODEL_REGISTRY_ADDRESS,
    abi: MODEL_REGISTRY_ABI,
    functionName: 'getModel',
    args: modelId ? [modelId] : undefined,
    query: {
      enabled: Boolean(modelId && modelId.length === 66 && modelId !== '0x0000000000000000000000000000000000000000000000000000000000000000'),
    },
  })
}

/**
 * Writes model registration to ModelRegistry on Monad.
 */
export function useRegisterModel() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash })

  const register = async (params: {
    modelId: `0x${string}`
    metadataURI: string
    chunkPrice: bigint
    creatorShareBps: number
    chunkCount: number
  }) => {
    return await writeContractAsync({
      address: MODEL_REGISTRY_ADDRESS,
      abi: MODEL_REGISTRY_ABI,
      functionName: 'registerModel',
      args: [
        params.modelId,
        params.metadataURI,
        params.chunkPrice,
        params.creatorShareBps,
        params.chunkCount,
      ],
    })
  }

  return {
    register,
    hash,
    receipt,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}

/**
 * Settles atomic chunk payment split between seeder and creator.
 */
export function usePayForChunk() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash })

  const pay = async (params: {
    modelId: `0x${string}`
    seederAddress: `0x${string}`
    chunkPrice: bigint
  }) => {
    return await writeContractAsync({
      address: SPLIT_PAYMENT_ADDRESS,
      abi: SPLIT_PAYMENT_ABI,
      functionName: 'payForChunk',
      args: [params.modelId, params.seederAddress],
      value: params.chunkPrice,
    })
  }

  return {
    pay,
    hash,
    receipt,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}

/**
 * Deactivates a model in ModelRegistry on Monad.
 */
export function useDeactivateModel() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash })

  const deactivate = async (modelId: `0x${string}`) => {
    return await writeContractAsync({
      address: MODEL_REGISTRY_ADDRESS,
      abi: MODEL_REGISTRY_ABI,
      functionName: 'deactivateModel',
      args: [modelId],
    })
  }

  return {
    deactivate,
    hash,
    receipt,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}

