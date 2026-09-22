import type { LocalAccount } from 'viem'
import type { Secp256k1SigningSession } from '@category-labs/mera'

export type PasskeyAuthMode = 'create' | 'login'

export interface PasskeyAccountMetadata {
  address: `0x${string}`
  credentialId: string
  displayName: string
  createdAt: number
  lastActiveAt: number
}

export interface MeraSessionState {
  account: LocalAccount | null
  session: Secp256k1SigningSession | null
  metadata: PasskeyAccountMetadata | null
  isPrfSupported: boolean
  isConnecting: boolean
  error: string | null
}

export interface PasskeyDiagnostics {
  webAuthnAvailable: boolean
  prfSupported: boolean
  platformAuthenticatorAvailable: boolean
  browserInfo: string
}

export interface ExportedCredentials {
  mnemonic: string
  privateKey: `0x${string}`
  address: `0x${string}`
}
