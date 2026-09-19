import {
  parseEventLogs,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { SPLIT_PAYMENT_ABI } from '../lib/abis/SplitPaymentABI'
import { SPLIT_PAYMENT_ADDRESS } from '../lib/contracts'
import type { PaymentProvider } from './downloader'
import type { PaymentVerifier } from './seeder'

const asBytes32 = (value: string) => value as `0x${string}`

/** Executes and confirms a real native MON chunk payment on Monad. */
export function createOnChainPaymentProvider(
  walletClient: WalletClient,
  publicClient: PublicClient,
): PaymentProvider {
  return {
    async makePayment(modelId, _chunkIndex, chunkPrice, seederAddress) {
      if (!walletClient.account) {
        throw new Error('Connect a wallet before downloading')
      }

      const hash = await walletClient.writeContract({
        address: SPLIT_PAYMENT_ADDRESS,
        abi: SPLIT_PAYMENT_ABI,
        functionName: 'payForChunk',
        args: [asBytes32(modelId), seederAddress as Address],
        value: BigInt(chunkPrice),
        account: walletClient.account,
        chain: undefined,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') {
        throw new Error(`Payment transaction reverted: ${hash}`)
      }

      return hash
    },
  }
}

/** Verifies PaymentSplit emitted by the deployed SplitPayment contract. */
export function createOnChainPaymentVerifier(
  publicClient: PublicClient,
): PaymentVerifier {
  return {
    async verifyPayment(modelId, _chunkIndex, txHash, chunkPrice, seederAddress) {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash })
        if (receipt.status !== 'success') return false

        const events = parseEventLogs({
          abi: SPLIT_PAYMENT_ABI,
          eventName: 'PaymentSplit',
          logs: receipt.logs,
          strict: false,
        }) as Array<{
          address: Address
          args: {
            modelId?: `0x${string}`
            seeder?: Address
            totalPaid?: bigint
          }
        }>

        return events.some((event) =>
          event.address.toLowerCase() === SPLIT_PAYMENT_ADDRESS.toLowerCase() &&
          event.args.modelId?.toLowerCase() === modelId.toLowerCase() &&
          event.args.seeder?.toLowerCase() === seederAddress.toLowerCase() &&
          event.args.totalPaid === BigInt(chunkPrice),
        )
      } catch {
        return false
      }
    },
  }
}
