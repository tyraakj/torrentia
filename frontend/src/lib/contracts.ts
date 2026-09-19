export const MONAD_TESTNET_CHAIN_ID = 10143 as const

// Contract addresses: read from environment variables (populated when Spec 02 is deployed)
export const MODEL_REGISTRY_ADDRESS = (String(import.meta.env.VITE_MODEL_REGISTRY_ADDRESS ||
  '0xe2cEDee4817B11716728aed3C3d7AD0438813340').trim()) as `0x${string}`

export const SPLIT_PAYMENT_ADDRESS = (String(import.meta.env.VITE_SPLIT_PAYMENT_ADDRESS ||
  '0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa').trim()) as `0x${string}`

export const MONADSCAN_BASE_URL = 'https://testnet.monadscan.com' as const

/**
 * Returns the Monadscan block explorer URL for a given transaction hash.
 */
export function getMonadscanTxUrl(txHash: string): string {
  return `${MONADSCAN_BASE_URL}/tx/${txHash}`
}

/**
 * Returns the Monadscan block explorer URL for a given address.
 */
export function getMonadscanAddressUrl(address: string): string {
  return `${MONADSCAN_BASE_URL}/address/${address}`
}
