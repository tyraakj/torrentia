import { SPLIT_PAYMENT_ADDRESS } from '../lib/contracts'
import { monadTestnet } from '../lib/wagmi'
import { CHUNK_CLAIM_TYPES, PAYMENT_SESSION_DOMAIN } from '../lib/types/payment-session'
import type { ChunkVoucherPayload } from '../lib/types/payment-session'
import { MeraAuthService } from './auth/mera-auth'

export class MeraSessionSigner {
  /**
   * Signs an off-chain EIP-712 ChunkPaymentClaim voucher in memory (< 1ms) without popup interruptions.
   */
  public static async signChunkVoucher(
    payload: ChunkVoucherPayload,
    verifyingContract: `0x${string}` = SPLIT_PAYMENT_ADDRESS,
  ): Promise<`0x${string}`> {
    const auth = MeraAuthService.getInstance()
    const account = auth.getActiveAccount()

    if (!account) {
      throw new Error('No active Mera passkey session. Please authenticate with Face ID / Touch ID / PIN.')
    }

    const domain = {
      ...PAYMENT_SESSION_DOMAIN,
      chainId: BigInt(monadTestnet.id),
      verifyingContract,
    } as const

    const signature = await account.signTypedData({
      domain,
      types: CHUNK_CLAIM_TYPES,
      primaryType: 'ChunkPaymentClaim',
      message: {
        sessionId: payload.sessionId,
        chunkIndex: payload.chunkIndex,
        chunkHash: payload.chunkHash,
        seeder: payload.seederAddress,
        deadline: payload.deadline,
      },
    })

    return signature
  }

  /**
   * Determines if the current user session is powered by Mera Passkeys.
   */
  public static isPasskeySessionActive(): boolean {
    return Boolean(MeraAuthService.getInstance().getActiveAccount())
  }
}
