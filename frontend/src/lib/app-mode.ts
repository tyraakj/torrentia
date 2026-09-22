/**
 * Application Deployment Mode Governance for Torrentia.
 * Governs strict behavior across 'demo' | 'testnet' | 'mainnet'.
 * Defined in Spec 25 and docs/ux-product-flow.md.
 */

export type AppMode = 'demo' | 'testnet' | 'mainnet'

const rawMode = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_MODE
    ? String(import.meta.env.VITE_APP_MODE).trim().toLowerCase()
    : 'testnet'
) as string

export const APP_MODE: AppMode =
  rawMode === 'demo' || rawMode === 'mainnet' ? (rawMode as AppMode) : 'testnet'

/**
 * Returns true if the application is running in 'demo' mode.
 * In demo mode, clearly-labeled fallback models, illustrative animations,
 * and offline simulation data are permitted.
 */
export function isDemoMode(): boolean {
  return APP_MODE === 'demo'
}

/**
 * Returns true if running on Monad testnet.
 * In testnet, real smart contracts, real IPFS manifests, and live signaling
 * are strictly required. Mock fallbacks are eliminated.
 */
export function isTestnet(): boolean {
  return APP_MODE === 'testnet'
}

/**
 * Returns true if running on Monad mainnet.
 */
export function isMainnet(): boolean {
  return APP_MODE === 'mainnet'
}

/**
 * Whether mock fallbacks (synthetic CIDs, fake txs, unpinned manifests)
 * are allowed. Hard blocked in testnet and mainnet.
 */
export function allowMockFallbacks(): boolean {
  return APP_MODE === 'demo'
}
