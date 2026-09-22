import type { Address, Hex } from 'viem'

export const PAYMENT_SESSION_DOMAIN = {
  name: 'Torrentia Payment Channel',
  version: '2',
  chainId: 10143,
} as const

export const CHUNK_CLAIM_TYPES = {
  ChunkPaymentClaim: [
    { name: 'sessionId', type: 'bytes32' },
    { name: 'chunkIndex', type: 'uint32' },
    { name: 'chunkHash', type: 'bytes32' },
    { name: 'seeder', type: 'address' },
    { name: 'deadline', type: 'uint48' },
  ],
} as const

export interface ChunkPaymentClaim {
  sessionId: Hex
  chunkIndex: number
  chunkHash: Hex
  seeder: Address
  deadline: number
}

export interface ChunkVoucherPayload {
  sessionId: Hex
  chunkIndex: number
  chunkHash: Hex
  seederAddress: Address
  deadline: number
}
