import { SPLIT_PAYMENT_ADDRESS } from '../lib/contracts'
import { monadTestnet } from '../lib/wagmi'
import type { ChunkVoucherPayload } from '../types/mera'
import { MeraAuthService } from './auth/mera-auth'

const CHUNK_PAYMENT_CLAIM_TYPES = {
  ChunkPaymentClaim: [
    { name: 'sessionId', type: 'bytes32' },
    { name: 'modelId', type: 'bytes32' },
    { name: 'chunkIndex', type: 'uint32' },
    { name: 'chunkHash', type: 'bytes32' },
    { name: 'seeder', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const

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
      name: 'TorrentiaSessionChannel',
      version: '1',
      chainId: BigInt(monadTestnet.id),
      verifyingContract,
    } as const

    const signature = await account.signTypedData({
      domain,
      types: CHUNK_PAYMENT_CLAIM_TYPES,
      primaryType: 'ChunkPaymentClaim',
      message: {
        sessionId: payload.sessionId,
        modelId: payload.modelId,
        chunkIndex: payload.chunkIndex,
        chunkHash: payload.chunkHash,
        seeder: payload.seederAddress,
        amount: payload.chunkPrice,
        nonce: payload.nonce,
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
