import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { fetchModels } from '../services/api-client'
import type { IndexedModel } from '../lib/types'

export interface CreatorEarningsSummary {
  totalEarningsWei: bigint
  totalEarningsMon: string
  totalDownloads: number
  totalActiveSeeders: number
  totalModels: number
}

/**
 * Fetches models registered by the specific creator address.
 */
export function useCreatorModels(address?: string) {
  return useQuery<IndexedModel[], Error>({
    queryKey: ['creator-models', address?.toLowerCase() || ''],
    queryFn: async () => {
      if (!address) return []
      const allModels = await fetchModels({ creator: address })
      return allModels.filter(
        (m) => m.originalCreator.toLowerCase() === address.toLowerCase()
      )
    },
    enabled: Boolean(address),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Calculates aggregate royalty earnings and swarm metrics for a creator's models.
 */
export function useCreatorEarnings(models: IndexedModel[] = []): CreatorEarningsSummary {
  return useMemo(() => {
    let totalEarningsWei = 0n
    let totalDownloads = 0
    let totalActiveSeeders = 0

    for (const m of models) {
      const chunkCount = BigInt(m.chunkCount || 1)
      const downloads = BigInt(m.totalDownloads || 0)
      const chunkPrice = m.chunkPrice || 0n
      const creatorRoyaltyPerChunk = (chunkPrice * BigInt(m.creatorShareBps)) / 10000n

      totalEarningsWei += creatorRoyaltyPerChunk * chunkCount * downloads
      totalDownloads += m.totalDownloads || 0
      totalActiveSeeders += m.seederCount || 0
    }

    const formattedMon = parseFloat(formatEther(totalEarningsWei)).toFixed(6)

    return {
      totalEarningsWei,
      totalEarningsMon: formattedMon,
      totalDownloads,
      totalActiveSeeders,
      totalModels: models.length,
    }
  }, [models])
}
