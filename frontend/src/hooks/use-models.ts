/**
 * React Query hooks for fetching models, stats, and payment history
 * from the indexer / local fallback catalog.
 * Adheres to Spec 10 with 10s stale-while-revalidate caching.
 */

import { useQuery } from '@tanstack/react-query'
import {
  fetchModels,
  fetchModel,
  fetchStats,
  fetchPayments,
  type SwarmStats,
} from '../services/api-client'
import type { IndexedModel, PaymentSplitEvent } from '../lib/types'

export function useModels(search?: string, category?: string) {
  return useQuery<IndexedModel[], Error>({
    queryKey: ['models', search || '', category || 'All'],
    queryFn: () => fetchModels({ search, category }),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
}

export function useModel(modelId?: string) {
  return useQuery<IndexedModel | null, Error>({
    queryKey: ['model', modelId],
    queryFn: () => (modelId ? fetchModel(modelId) : Promise.resolve(null)),
    enabled: !!modelId,
    staleTime: 10_000,
  })
}

export function useStats() {
  return useQuery<SwarmStats, Error>({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useModelPayments(modelId?: string) {
  return useQuery<PaymentSplitEvent[], Error>({
    queryKey: ['payments', modelId],
    queryFn: () => (modelId ? fetchPayments(modelId) : Promise.resolve([])),
    enabled: !!modelId,
    staleTime: 10_000,
  })
}
