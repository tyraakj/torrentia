import { createConnector } from 'wagmi'
import type { Address } from 'viem'
import { getAddress, hexToString, isHex, toHex } from 'viem'
import { MeraAuthService } from '../services/auth/mera-auth'
import { monadTestnet } from './wagmi'

interface RpcRequest {
  method: string
  params?: unknown[] | Record<string, unknown>
}

/**
 * Creates an EIP-1193 provider backed by the active Mera signing session and Monad RPC.
 */
function createMeraProvider() {
  const auth = MeraAuthService.getInstance()
  const rpcUrl = monadTestnet.rpcUrls.default.http[0]

  return {
    async request({ method, params }: RpcRequest): Promise<unknown> {
      const account = auth.getActiveAccount()

      // Handle account queries
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
        if (!account) return []
        return [account.address]
      }

      // Handle chainId queries
      if (method === 'eth_chainId') {
        return toHex(monadTestnet.id)
      }
      if (method === 'net_version') {
        return String(monadTestnet.id)
      }

      // Handle personal_sign / eth_sign
      if (method === 'personal_sign' || method === 'eth_sign') {
        if (!account) throw new Error('No active Mera passkey session.')
        const p = params as [string, string]
        // In personal_sign: params[0] is message, params[1] is address (or reversed)
        const msgRaw = isHex(p[0]) && p[0].length !== 42 ? p[0] : p[1]
        const message = isHex(msgRaw) ? hexToString(msgRaw) : msgRaw
        return account.signMessage({ message })
      }

      // Handle EIP-712 typed data signing
      if (method === 'eth_signTypedData_v4' || method === 'eth_signTypedData') {
        if (!account) throw new Error('No active Mera passkey session.')
        const p = params as [string, string]
        const typedDataJson = typeof p[1] === 'string' ? p[1] : (typeof p[0] === 'string' ? p[0] : JSON.stringify(p[1]))
        const parsed = JSON.parse(typedDataJson)
        return account.signTypedData(parsed)
      }

      // Forward read calls and raw transactions to Monad JSON-RPC
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params: params || [],
        }),
      })

      if (!response.ok) {
        throw new Error(`Monad RPC error (${response.status}): ${response.statusText}`)
      }

      const json = await response.json()
      if (json.error) {
        throw new Error(json.error.message || 'RPC execution error')
      }
      return json.result
    },

    on(_event: string, _listener: (...args: unknown[]) => void) {
      // Event subscription stub
    },
    removeListener(_event: string, _listener: (...args: unknown[]) => void) {
      // Event unsubscription stub
    },
  }
}

/**
 * Wagmi Connector for Category Labs' Mera Passkey accounts.
 */
export function meraPasskey() {
  return createConnector((config) => ({
    id: 'mera-passkey',
    name: 'Passkey (Mera)',
    type: 'passkey',

    async connect<withCapabilities extends boolean = false>({
      chainId,
      withCapabilities,
    }: {
      chainId?: number
      isReconnecting?: boolean
      withCapabilities?: withCapabilities | boolean
    } = {}): Promise<{
      accounts: withCapabilities extends true
        ? readonly { address: Address; capabilities: Record<string, unknown> }[]
        : readonly Address[]
      chainId: number
    }> {
      const auth = MeraAuthService.getInstance()
      let account = auth.getActiveAccount()

      if (!account) {
        // If user already registered a passkey on this device, prompt login; otherwise register
        if (auth.hasSavedPasskey()) {
          const res = await auth.login()
          account = res.account
        } else {
          const res = await auth.register('Torrentia User')
          account = res.account
        }
      }

      const activeAddress = getAddress(account.address)
      const accountsList = [activeAddress]
      const activeChainId = chainId ?? monadTestnet.id

      config.emitter.emit('connect', {
        accounts: accountsList,
        chainId: activeChainId,
      })

      const accounts = (withCapabilities
        ? accountsList.map((address) => ({ address, capabilities: {} }))
        : accountsList) as unknown as (withCapabilities extends true
        ? readonly { address: Address; capabilities: Record<string, unknown> }[]
        : readonly Address[])

      return {
        accounts,
        chainId: activeChainId,
      }
    },

    async disconnect() {
      const auth = MeraAuthService.getInstance()
      auth.disconnect()
      config.emitter.emit('disconnect')
    },

    async getAccounts() {
      const auth = MeraAuthService.getInstance()
      const account = auth.getActiveAccount()
      if (!account) return []
      return [account.address as Address]
    },

    async getChainId() {
      return monadTestnet.id
    },

    async isAuthorized() {
      const auth = MeraAuthService.getInstance()
      return Boolean(auth.getActiveAccount())
    },

    async switchChain({ chainId }) {
      if (chainId !== monadTestnet.id) {
        throw new Error(`Chain ${chainId} not supported. Torrentia operates on Monad Testnet (${monadTestnet.id}).`)
      }
      config.emitter.emit('change', { chainId })
      return monadTestnet
    },

    async getProvider() {
      return createMeraProvider()
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        config.emitter.emit('disconnect')
      } else {
        config.emitter.emit('change', { accounts: accounts as readonly Address[] })
      }
    },

    onChainChanged(chain) {
      config.emitter.emit('change', { chainId: Number(chain) })
    },

    onDisconnect() {
      config.emitter.emit('disconnect')
    },
  }))
}
