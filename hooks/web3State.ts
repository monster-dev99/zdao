// Module-level state management for Web3 (singleton pattern)
// Shared across all hook instances

import { ethers } from "ethers"

export interface Proposal {
  id: number
  description: string
  yesCount: number
  noCount: number
  isPublic: boolean
  createdAt: Date
  encryptedYesCount?: string
  encryptedNoCount?: string
  totalVotes?: number
}

// Global state
let globalAccount: string | null = null
let globalIsConnected = false
let globalIsConnecting = false
let globalChainId: number | null = null
let globalContract: ethers.Contract | null = null
let globalProposals: Proposal[] = []
let globalIsLoading = false
let globalHasAttemptedAutoConnect = false

// Listeners for state changes
const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach(listener => listener())
}

// State setters
export const setAccount = (value: string | null) => {
  globalAccount = value
  notifyListeners()
}

export const setIsConnected = (value: boolean) => {
  globalIsConnected = value
  notifyListeners()
}

export const setIsConnecting = (value: boolean) => {
  globalIsConnecting = value
  notifyListeners()
}

export const setChainId = (value: number | null) => {
  globalChainId = value
  notifyListeners()
}

export const setContract = (value: ethers.Contract | null) => {
  globalContract = value
  notifyListeners()
}

export const setProposals = (value: Proposal[]) => {
  globalProposals = value
  notifyListeners()
}

export const setIsLoading = (value: boolean) => {
  globalIsLoading = value
  notifyListeners()
}

export const setHasAttemptedAutoConnect = (value: boolean) => {
  globalHasAttemptedAutoConnect = value
}

// State getters
export const getAccount = () => globalAccount
export const getIsConnected = () => globalIsConnected
export const getIsConnecting = () => globalIsConnecting
export const getChainId = () => globalChainId
export const getContract = () => globalContract
export const getProposals = () => globalProposals
export const getIsLoading = () => globalIsLoading
export const getHasAttemptedAutoConnect = () => globalHasAttemptedAutoConnect

// Subscribe to state changes
export const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Get all state at once
export const getState = () => ({
  account: globalAccount,
  isConnected: globalIsConnected,
  isConnecting: globalIsConnecting,
  chainId: globalChainId,
  contract: globalContract,
  proposals: globalProposals,
  isLoading: globalIsLoading,
  hasAttemptedAutoConnect: globalHasAttemptedAutoConnect,
})
