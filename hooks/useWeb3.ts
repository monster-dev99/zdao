"use client"

import { useEffect, useMemo } from "react"
import { useFHEOperations } from "@/hooks/useFHEOperations"
import { useWallet } from "./useWallet"
import { useProposals } from "./useProposals"
import { useVoting } from "./useVoting"

export type { Proposal } from "./web3State"

export function useWeb3() {
  // Wallet management
  const wallet = useWallet()

  // FHE operations
  const {
    isInitialized: fheInitialized,
    isLoading: fheLoading,
    error: fheError,
    encrypt: fheEncrypt,
    publicDecrypt: fhePublicDecrypt,
    publicDecryptMultiple: fhePublicDecryptMultiple,
    userDecrypt: fheUserDecrypt,
    userDecryptMultiple: fheUserDecryptMultiple
  } = useFHEOperations(wallet.account || undefined)

  const fheStatus = useMemo(() => ({
    initialized: fheInitialized,
    loading: fheLoading,
    error: fheError,
    sdkAvailable: fheInitialized && !fheError
  }), [fheInitialized, fheLoading, fheError])

  // Voting operations
  const voting = useVoting()

  // Proposals management
  const proposals = useProposals()

  // Create wrapper functions with proper dependencies
  const decryptVoteCounts = async (proposalId: number) => {
    return voting.decryptVoteCounts(proposalId, fheInitialized, fhePublicDecrypt, fhePublicDecryptMultiple)
  }

  const loadProposals = async () => {
    await proposals.loadProposals(
      wallet.contract,
      decryptVoteCounts,
      fheInitialized
    )
  }

  const createProposal = async (description: string) => {
    await voting.createProposal(description, loadProposals)
  }

  const vote = async (proposalId: number, voteValue: boolean) => {
    await voting.vote(
      proposalId,
      voteValue,
      fheInitialized,
      fheEncrypt,
      wallet.isCorrectNetwork,
      loadProposals
    )
  }

  const makeVoteCountsPublic = async (proposalId: number) => {
    await voting.makeVoteCountsPublic(
      proposalId,
      fheInitialized,
      decryptVoteCounts,
      loadProposals
    )
  }

  const refreshProposals = async () => {
    await proposals.refreshProposals(
      wallet.contract,
      decryptVoteCounts,
      fheInitialized
    )
  }

  // Load proposals when FHE is initialized
  useEffect(() => {
    if (fheInitialized && wallet.isConnected && wallet.contract && proposals.proposals.length === 0) {
      console.log('FHE initialized, loading proposals...')
      loadProposals()
    }
  }, [fheInitialized, wallet.isConnected, wallet.contract, proposals.proposals.length])

  return {
    // Wallet state
    account: wallet.account,
    isConnected: wallet.isConnected,
    isConnecting: wallet.isConnecting,
    chainId: wallet.chainId,
    isCorrectNetwork: wallet.isCorrectNetwork,
    networkName: wallet.networkName,
    contract: wallet.contract,
    
    // Proposals state
    proposals: proposals.proposals,
    isLoading: proposals.isLoading,
    
    // FHE state
    fheStatus,
    
    // Wallet functions
    connectWallet: wallet.connectWallet,
    disconnectWallet: wallet.disconnectWallet,
    switchToSepolia: wallet.switchToSepolia,
    
    // Voting functions
    createProposal,
    vote,
    makeVoteCountsPublic,
    hasUserVoted: voting.hasUserVoted,
    getMyVote: voting.getMyVote,
    getPublicVoteCounts: voting.getPublicVoteCounts,
    decryptVoteCounts,
    refreshProposals,
    isProposalOwner: voting.isProposalOwner,
    
    // FHE operations (backward compatibility)
    fheDecrypt: fhePublicDecrypt ? async (encryptedValue: any) => {
      const result = await fhePublicDecrypt(encryptedValue)
      return result.value
    } : undefined,
    fheUserDecrypt: fheUserDecrypt ? async (encryptedValue: any) => {
      return await fheUserDecrypt(encryptedValue)
    } : undefined,
    fheUserDecryptMultiple: fheUserDecryptMultiple,
  }
}
