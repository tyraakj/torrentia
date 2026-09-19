import { formatEther } from 'viem'

/**
 * Truncates an Ethereum address (e.g. 0x1234...abcd).
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ''
  if (address.length <= chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Formats a wei amount into a human-readable MON string.
 */
export function formatMon(weiAmount: bigint, maxDecimals = 4): string {
  try {
    const etherStr = formatEther(weiAmount)
    const num = parseFloat(etherStr)
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    })
  } catch {
    return '0'
  }
}

/**
 * Formats byte size into human-readable B, KB, MB, GB string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2))
  return `${formatted} ${sizes[i]}`
}

/**
 * Converts basis points to human-readable percentage string (e.g. 7000 -> "70%").
 */
export function bpsToPercent(bps: number): string {
  const percent = bps / 100
  return `${percent}%`
}

/**
 * Calculates atomic split matching the smart contract logic exactly:
 * creatorAmount = (totalWei * creatorShareBps) / 10000;
 * seederAmount = totalWei - creatorAmount;
 */
export function calculateSplit(
  totalWei: bigint,
  creatorShareBps: number
): { creatorAmount: bigint; seederAmount: bigint } {
  const creatorAmount = (totalWei * BigInt(creatorShareBps)) / 10000n
  const seederAmount = totalWei - creatorAmount
  return { creatorAmount, seederAmount }
}
