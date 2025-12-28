"use client"

import { useCallback } from "react"
import { ethers } from "ethers"
import { VOTE_OPTIONS, handleFHEError } from "@/lib/utils"
import { getAccount, getContract, setIsLoading } from "./web3State"

const SEPOLIA_NETWORK_NAME = "Sepolia"

export function useVoting() {
  const createProposal = useCallback(async (description: string, loadProposals: () => Promise<void>) => {
    const contract = getContract()
    const account = getAccount()
    
    if (!contract || !account) {
      throw new Error("Wallet not connected")
    }

    try {
      setIsLoading(true)

      const tx = await contract.createProposal(description)
      await tx.wait()

      await loadProposals()
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const vote = useCallback(async (
    proposalId: number,
    voteValue: boolean,
    fheInitialized: boolean,
    fheEncrypt: ((value: number) => Promise<{ encryptedValue: string; proof: string }>) | undefined,
    isCorrectNetwork: boolean,
    loadProposals: () => Promise<void>
  ) => {
    const contract = getContract()
    const account = getAccount()
    
    if (!contract || !account) {
      throw new Error("Wallet not connected")
    }

    if (!fheInitialized) {
      throw new Error("FHE service not initialized. Please wait for initialization to complete.")
    }

    if (!isCorrectNetwork) {
      alert(`This app only supports ${SEPOLIA_NETWORK_NAME} network. Please switch to ${SEPOLIA_NETWORK_NAME} in your wallet.`)
      return
    }

    try {
      setIsLoading(true)

      const [yesCount, noCount, isPublic] = await contract.getPublicVoteCounts(proposalId)
      if (isPublic) {
        throw new Error("Voting is closed for this proposal. Results have been made public.")
      }

      const numericVote = voteValue ? VOTE_OPTIONS.YES : VOTE_OPTIONS.NO
      
      if (numericVote !== 0 && numericVote !== 1) {
        throw new Error(`Invalid vote value: ${numericVote}. Must be 0 (Yes) or 1 (No)`);
      }
      
      if (!fheEncrypt) {
        throw new Error("FHE encrypt function not available")
      }
      
      const encryptedVote = await fheEncrypt(numericVote)

      const tx = await contract.vote(proposalId, encryptedVote.encryptedValue, encryptedVote.proof)
      await tx.wait()

      await loadProposals()
    } catch (error: any) {
      if (error?.message?.includes('Already voted')) {
        throw new Error('You have already voted on this proposal. Each user can only vote once.')
      }
      
      if (error?.message?.includes('Invalid proposal')) {
        throw new Error('Invalid proposal ID. Please refresh and try again.')
      }
      
      if (error?.message?.includes('Voting is closed')) {
        throw new Error('Voting is closed for this proposal. Results have been made public.')
      }
      
      const errorMessage = handleFHEError(error)
      throw new Error(`Voting failed: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const makeVoteCountsPublic = useCallback(async (
    proposalId: number,
    fheInitialized: boolean,
    decryptVoteCounts: (proposalId: number) => Promise<{yesCount: number, noCount: number}>,
    loadProposals: () => Promise<void>
  ) => {
    const contract = getContract()
    const account = getAccount()
    
    if (!contract || !account) {
      throw new Error("Wallet not connected")
    }

    try {
      setIsLoading(true)

      try {
        const proposal = await contract.proposals(proposalId)
        const [yesCount, noCount, isPublic] = await contract.getPublicVoteCounts(proposalId)
        
        if (isPublic) {
          throw new Error('Vote counts are already public')
        }
      } catch (checkError) {
      }

      try {
        const gasEstimate = await contract.makeVoteCountsPublic.estimateGas(proposalId)
      } catch (estimateError: any) {
        if (estimateError?.data) {
          const errorData = estimateError.data
          
          if (errorData.includes('0xd0d25976')) {
            throw new Error('Custom error: Vote counts cannot be made public (possibly no votes cast yet)')
          }
          
          if (errorData.includes('0x4e487b71')) {
            throw new Error('Custom error: Invalid proposal ID')
          }
        }
        
        throw new Error(`Gas estimation failed: ${estimateError?.message || 'Unknown error'}`)
      }

      const tx = await contract.makeVoteCountsPublic(proposalId)
      const receipt = await tx.wait()

      await new Promise(resolve => setTimeout(resolve, 2000))

      if (fheInitialized) {
        try {
          const decryptedCounts = await decryptVoteCounts(proposalId);
          
          if (decryptedCounts.yesCount + decryptedCounts.noCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error: any) {
        }
      }

      await loadProposals()
    } catch (error: any) {
      if (error?.message?.includes('Vote counts already public')) {
        throw new Error('Vote counts are already public for this proposal.')
      }
      
      if (error?.message?.includes('Invalid proposal')) {
        throw new Error('Invalid proposal ID. Please refresh and try again.')
      }
      
      if (error?.message?.includes('Custom error:')) {
        throw error
      }
      
      throw new Error(`Failed to make vote counts public: ${error?.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const hasUserVoted = useCallback(async (proposalId: number): Promise<boolean> => {
    const contract = getContract()
    const account = getAccount()
    
    if (!contract || !account) {
      return false
    }

    try {
      const voted = await contract.hasUserVoted(proposalId, account)
      return voted
    } catch (error: any) {
      return false
    }
  }, [])

  const getMyVote = useCallback(async (proposalId: number): Promise<string> => {
    const contract = getContract()
    const account = getAccount()
    
    if (!contract || !account) {
      throw new Error("Wallet not connected")
    }

    try {
      const encryptedVote = await contract.getMyVote(proposalId)
      return encryptedVote
    } catch (error: any) {
      if (error?.data) {
        const errorData = error.data
        
        if (errorData.includes('0x4e487b71')) {
          throw new Error('Invalid proposal ID')
        }
        
        if (errorData.includes('0x4e487b72')) {
          throw new Error('You have not voted on this proposal yet')
        }
        
        if (errorData.includes('0xd0d25976')) {
          throw new Error('FHE permission denied - you may not have voted or FHE is not properly initialized')
        }
      }
      
      throw new Error(`Failed to get my vote: ${error?.message || 'Unknown error'}`)
    }
  }, [])

  const getPublicVoteCounts = useCallback(async (proposalId: number): Promise<{yesCount: number, noCount: number, isPublic: boolean}> => {
    const contract = getContract()
    
    if (!contract) {
      throw new Error("Contract not connected")
    }

    try {
      const [yesCount, noCount, isPublic] = await contract.getPublicVoteCounts(proposalId)
      return {
        yesCount: Number(yesCount),
        noCount: Number(noCount),
        isPublic: Boolean(isPublic)
      }
    } catch (error) {
      return { yesCount: 0, noCount: 0, isPublic: false }
    }
  }, [])

  const isProposalOwner = useCallback(async (proposalId: number): Promise<boolean> => {
    const contract = getContract()
    const account = getAccount()
    
    if (!contract || !account) return false;
    try {
      const result = await contract.isProposalOwner(proposalId, account);
      return result;
    } catch (error: any) {
      return false;
    }
  }, []);

  const decryptVoteCounts = useCallback(async (
    proposalId: number,
    fheInitialized: boolean,
    fhePublicDecrypt: ((encryptedValue: string) => Promise<{ value: number; proof: string }>) | undefined,
    fhePublicDecryptMultiple?: ((encryptedValues: string[]) => Promise<{ 
      abiEncodedClearValues: string; 
      decryptionProof: string;
      clearValues: Record<string, number>;
    }>) | undefined
  ): Promise<{yesCount: number, noCount: number}> => {
    const contract = getContract()
    
    if (!contract || !fheInitialized) {
      throw new Error("Contract or FHE not initialized")
    }

    try {
      const [publicYesCount, publicNoCount, isPublic] = await contract.getPublicVoteCounts(proposalId)
      const alreadySubmitted = isPublic && (Number(publicYesCount) + Number(publicNoCount) > 0)

      const [encryptedYes, encryptedNo] = await contract.getEncryptedVoteCount(proposalId)
      
      if (fhePublicDecryptMultiple) {
        const decryptResult = await fhePublicDecryptMultiple([encryptedYes, encryptedNo])
        
        const decryptedYes = Number(decryptResult.clearValues[encryptedYes])
        const decryptedNo = Number(decryptResult.clearValues[encryptedNo])
        
        if ((decryptedYes + decryptedNo) > 0 && !alreadySubmitted) {
          try {
            const tx = await contract.submitDecryptedVoteCounts(
              proposalId,
              decryptResult.abiEncodedClearValues,
              decryptResult.decryptionProof
            )
            const receipt = await tx.wait()
            
            await new Promise(resolve => setTimeout(resolve, 500))
            try {
              const [verifyYes, verifyNo, verifyIsPublic] = await contract.getPublicVoteCounts(proposalId)
              const verifyTotal = Number(verifyYes) + Number(verifyNo)
            } catch (verifyErr) {
            }
          } catch (submitError: any) {
          }
        }
        
        return {
          yesCount: decryptedYes,
          noCount: decryptedNo
        }
      } else if (fhePublicDecrypt) {
        const decryptYesResult = await fhePublicDecrypt(encryptedYes)
        const decryptNoResult = await fhePublicDecrypt(encryptedNo)
        
        const decryptedYes = Number(decryptYesResult.value)
        const decryptedNo = Number(decryptNoResult.value)
        
        return {
          yesCount: decryptedYes,
          noCount: decryptedNo
        }
      } else {
        throw new Error("FHE decrypt functions not available")
      }
    } catch (error: any) {
      throw new Error(`Failed to decrypt vote counts: ${error?.message || 'Unknown error'}`)
    }
  }, [])

  return {
    createProposal,
    vote,
    makeVoteCountsPublic,
    hasUserVoted,
    getMyVote,
    getPublicVoteCounts,
    isProposalOwner,
    decryptVoteCounts,
  }
}
