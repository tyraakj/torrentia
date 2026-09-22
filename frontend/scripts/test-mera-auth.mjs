import assert from 'node:assert/strict'
import { createSecp256k1SigningSession, getEvmAddress } from '@category-labs/mera'
import { toViemAccount } from '@category-labs/mera/viem'
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { HDKey } from '@scure/bip32'
import { recoverTypedDataAddress, toHex } from 'viem'

console.log('🧪 Running Mera Passkey & Swarm Streaming Signer Test Suite...')

// Test 1: Deterministic Account Derivation from PRF Entropy
console.log('1. Testing WebAuthn PRF entropy -> BIP-44 key derivation...')
const prfEntropy = new Uint8Array(32).fill(42)
const mnemonic = entropyToMnemonic(prfEntropy, wordlist)
assert.equal(mnemonic.split(' ').length, 24, 'Must produce exactly 24 mnemonic words for 256-bit PRF entropy')

const seed = mnemonicToSeedSync(mnemonic)
const hdKey = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0")
assert.ok(hdKey.privateKey, 'Private key must be derived')

const session = createSecp256k1SigningSession({ privateKey: hdKey.privateKey })
const derivedAddress = getEvmAddress(session.publicKey)
const account = toViemAccount(session)

assert.equal(derivedAddress, account.address, 'Mera address and Viem account address must match')
assert.ok(account.address.startsWith('0x'), 'Address must start with 0x')
assert.equal(account.address.length, 42, 'Address must be 42 characters')
console.log(`   ✓ Derived Monad EOA: ${account.address}`)

// Test 2: In-Memory Message Signing
console.log('2. Testing in-memory personal message signing...')
const message = 'Torrentia P2P AI Swarm Model Download'
const signature = await account.signMessage({ message })
assert.ok(signature.startsWith('0x'), 'Signature must be hex')
assert.equal(signature.length, 132, 'Signature must be 65 bytes (130 hex + 0x)')
console.log(`   ✓ Signature (65 bytes): ${signature.slice(0, 20)}...${signature.slice(-10)}`)

// Test 3: EIP-712 Micro-Voucher Signing & Recovery
console.log('3. Testing EIP-712 ChunkPaymentClaim voucher signing & verification...')
const domain = {
  name: 'TorrentiaSessionChannel',
  version: '1',
  chainId: 10143n,
  verifyingContract: '0xFF9c3ce76Eba5647a7d22DF9A8b699d91F4bbdDa',
}

const types = {
  ChunkPaymentClaim: [
    { name: 'sessionId', type: 'bytes32' },
    { name: 'modelId', type: 'bytes32' },
    { name: 'chunkIndex', type: 'uint32' },
    { name: 'chunkHash', type: 'bytes32' },
    { name: 'seeder', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
}

const voucherMessage = {
  sessionId: '0x1111111111111111111111111111111111111111111111111111111111111111',
  modelId: '0x2222222222222222222222222222222222222222222222222222222222222222',
  chunkIndex: 12,
  chunkHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
  seeder: '0x50BD6d079EFc47afdf3FfE8a5387E7156b568B90',
  amount: 1000000000000000n, // 0.001 MON
  nonce: 42n,
}

const voucherSig = await account.signTypedData({
  domain,
  types,
  primaryType: 'ChunkPaymentClaim',
  message: voucherMessage,
})

assert.ok(voucherSig.startsWith('0x'), 'Voucher signature must be hex')
assert.equal(voucherSig.length, 132, 'Voucher signature must be 65 bytes')

// Recover address from signature to cryptographically prove correctness
const recoveredAddress = await recoverTypedDataAddress({
  domain,
  types,
  primaryType: 'ChunkPaymentClaim',
  message: voucherMessage,
  signature: voucherSig,
})

assert.equal(
  recoveredAddress.toLowerCase(),
  account.address.toLowerCase(),
  'Recovered signer address must match the passkey account address',
)
console.log(`   ✓ Recovered signer verified: ${recoveredAddress}`)

// Test 4: Mnemonic & Private Key Export Integrity
console.log('4. Testing self-sovereign key export integrity...')
const rawPrivateKey = toHex(hdKey.privateKey)
assert.equal(rawPrivateKey.length, 66, 'Private key must be 32 bytes (64 hex + 0x)')
console.log(`   ✓ 24-word Mnemonic: ${mnemonic}`)
console.log(`   ✓ Raw Private Key:  ${rawPrivateKey.slice(0, 10)}...${rawPrivateKey.slice(-6)}`)

console.log('\n🎉 ALL MERA PASSKEY & STREAMING SIGNER TESTS PASSED (100% SUCCESS)!')
