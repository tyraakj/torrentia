import {
  createPasskeyWithPrfOutput,
  getPasskeyPrfOutput,
  createSecp256k1SigningSession,
  getEvmAddress,
  type PasskeyRelyingParty,
} from '@category-labs/mera'
import { toViemAccount } from '@category-labs/mera/viem'
import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync, entropyToMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import type { LocalAccount } from 'viem'
import { toHex } from 'viem'
import type {
  ExportedCredentials,
  PasskeyAccountMetadata,
  PasskeyDiagnostics,
} from '../../types/mera'

const RP_NAME = 'Torrentia'

export class MeraAuthService {
  private static instance: MeraAuthService
  private activeSessionAccount: LocalAccount | null = null
  private activeMnemonic: string | null = null
  private activePrivateKey: `0x${string}` | null = null
  private cachedMetadata: PasskeyAccountMetadata | null = null

  private constructor() {
    this.cachedMetadata = this.getSavedMetadata()
  }

  public static getInstance(): MeraAuthService {
    if (!MeraAuthService.instance) {
      MeraAuthService.instance = new MeraAuthService()
    }
    return MeraAuthService.instance
  }

  private getRelyingParty(): PasskeyRelyingParty {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    return {
      id: hostname,
      name: RP_NAME,
    }
  }

  /**
   * Diagnostic check to determine browser and OS support for WebAuthn PRF.
   */
  public async checkDiagnostics(): Promise<PasskeyDiagnostics> {
    const webAuthnAvailable = typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined'
    let platformAuthenticatorAvailable = false
    let prfSupported = false

    if (webAuthnAvailable && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      try {
        platformAuthenticatorAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      } catch {
        platformAuthenticatorAvailable = false
      }
    }

    // Modern Chrome/Edge 122+ and Safari 18+ support PRF
    if (webAuthnAvailable && 'getClientCapabilities' in window.PublicKeyCredential) {
      try {
        const pkAny = window.PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<{ prf?: boolean }> }
        if (typeof pkAny.getClientCapabilities === 'function') {
          const caps = await pkAny.getClientCapabilities()
          prfSupported = Boolean(caps?.prf)
        } else {
          prfSupported = platformAuthenticatorAvailable
        }
      } catch {
        prfSupported = platformAuthenticatorAvailable
      }
    } else {
      prfSupported = platformAuthenticatorAvailable
    }

    return {
      webAuthnAvailable,
      prfSupported,
      platformAuthenticatorAvailable,
      browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    }
  }

  /**
   * Creates a new passkey credential with PRF output and derives a standard Monad EVM EOA.
   */
  public async register(userName = 'Torrentia User'): Promise<{ account: LocalAccount; metadata: PasskeyAccountMetadata }> {
    const rp = this.getRelyingParty()
    const sanitizedName = userName.toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'torrentia-user'

    const result = await createPasskeyWithPrfOutput({
      rp,
      user: {
        name: sanitizedName,
        displayName: userName,
      },
      timeout: 60000,
    })

    const { account, metadata } = this.deriveAccountFromPrf(result.prfOutput, result.credentialId, userName)
    this.activeSessionAccount = account
    this.cachedMetadata = metadata
    this.saveMetadata(metadata)
    return { account, metadata }
  }

  /**
   * Performs an assertion ceremony to retrieve PRF entropy and re-establish the signing session.
   */
  public async login(): Promise<{ account: LocalAccount; metadata: PasskeyAccountMetadata }> {
    const rp = this.getRelyingParty()
    const result = await getPasskeyPrfOutput({
      rpId: rp.id,
      timeout: 60000,
    })

    const stored = this.getSavedMetadata()
    const credentialId = result.credentialId || stored?.credentialId || 'passkey-account'
    const displayName = stored?.displayName || 'Torrentia User'

    const { account, metadata } = this.deriveAccountFromPrf(result.prfOutput, credentialId, displayName)
    this.activeSessionAccount = account
    this.cachedMetadata = metadata
    this.saveMetadata(metadata)
    return { account, metadata }
  }

  /**
   * Derives standard BIP-44 key m/44'/60'/0'/0/0 from 32 bytes of PRF entropy.
   */
  public deriveAccountFromPrf(
    prfEntropy: Uint8Array,
    credentialId: string,
    displayName: string,
  ): { account: LocalAccount; metadata: PasskeyAccountMetadata } {
    const mnemonic = entropyToMnemonic(prfEntropy, wordlist)
    const seed = mnemonicToSeedSync(mnemonic)
    const hdKey = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0")

    if (!hdKey.privateKey) {
      throw new Error('Failed to derive private key from WebAuthn PRF entropy')
    }

    this.activeMnemonic = mnemonic
    this.activePrivateKey = toHex(hdKey.privateKey)

    const session = createSecp256k1SigningSession({
      privateKey: hdKey.privateKey,
    })

    const address = getEvmAddress(session.publicKey) as `0x${string}`
    const viemAccount = toViemAccount(session)

    const metadata: PasskeyAccountMetadata = {
      address,
      credentialId,
      displayName,
      createdAt: this.cachedMetadata?.createdAt ?? Date.now(),
      lastActiveAt: Date.now(),
    }

    return { account: viemAccount, metadata }
  }

  /**
   * Biometrically gated export of mnemonic and private key for self-sovereign migration.
   */
  public async exportCredentials(): Promise<ExportedCredentials> {
    if (!this.activeMnemonic || !this.activePrivateKey || !this.activeSessionAccount) {
      // Prompt biometric passkey to retrieve PRF and re-populate in-memory credentials
      await this.login()
    }

    if (!this.activeMnemonic || !this.activePrivateKey || !this.activeSessionAccount) {
      throw new Error('No active passkey session available for key export.')
    }

    return {
      mnemonic: this.activeMnemonic,
      privateKey: this.activePrivateKey,
      address: this.activeSessionAccount.address,
    }
  }

  public getActiveAccount(): LocalAccount | null {
    return this.activeSessionAccount
  }

  public getSavedMetadata(): PasskeyAccountMetadata | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('torrentia_mera_metadata')
      return raw ? (JSON.parse(raw) as PasskeyAccountMetadata) : null
    } catch {
      return null
    }
  }

  public hasSavedPasskey(): boolean {
    return Boolean(this.getSavedMetadata()?.address)
  }

  public disconnect(): void {
    this.activeSessionAccount = null
    this.activeMnemonic = null
    this.activePrivateKey = null
  }

  private saveMetadata(metadata: PasskeyAccountMetadata): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('torrentia_mera_metadata', JSON.stringify(metadata))
    } catch {
      // Ignore storage errors in sandboxed environments
    }
  }
}
