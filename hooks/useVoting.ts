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
      console.error("Error creating proposal:", error)
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
      
      console.log('FHE encryption successful:', encryptedVote)

      const tx = await contract.vote(proposalId, encryptedVote.encryptedValue, encryptedVote.proof)
      await tx.wait()

      await loadProposals()
    } catch (error: any) {
      console.error("Error voting:", error)
      
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

      console.log(`Making vote counts public for proposal ${proposalId}...`)
      
      try {
        const proposal = await contract.proposals(proposalId)
        const [yesCount, noCount, isPublic] = await contract.getPublicVoteCounts(proposalId)
        
        if (isPublic) {
          throw new Error('Vote counts are already public')
        }
      } catch (checkError) {
        console.log('Error checking proposal state:', checkError)
      }

      try {
        const gasEstimate = await contract.makeVoteCountsPublic.estimateGas(proposalId)
        console.log('Gas estimate:', gasEstimate.toString())
      } catch (estimateError: any) {
        console.error('Gas estimation failed:', estimateError)
        
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
      console.log('Transaction sent:', tx.hash)
      const receipt = await tx.wait()
      console.log('Transaction confirmed, block:', receipt.blockNumber)

      // Đợi một chút để đảm bảo contract state đã được cập nhật
      // Đặc biệt quan trọng với FHE operations
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Waited 2s after transaction confirmation')

      if (fheInitialized) {
        try {
          console.log(`🔓 Đang decrypt và submit vote counts cho proposal ${proposalId}...`)
          const decryptedCounts = await decryptVoteCounts(proposalId);
          console.log(`✅ Decrypted vote counts sau khi make public:`, decryptedCounts);
          
          // Đợi thêm một chút để đảm bảo submit transaction (nếu có) đã được confirm
          if (decryptedCounts.yesCount + decryptedCounts.noCount > 0) {
            console.log(`⏳ Đợi submit transaction confirm...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error: any) {
          console.error(`❌ Could not decrypt vote counts sau khi make public cho proposal ${proposalId}:`, error);
          // Không throw error ở đây vì makeVoteCountsPublic đã thành công
          // Frontend sẽ tự động decrypt khi load proposals
          if (error?.message?.includes('CORS') || error?.message?.includes('cors')) {
            console.error(`❌ Lỗi CORS khi decrypt proposal ${proposalId} - có thể do relayer server không cho phép CORS`)
          } else if (error?.message) {
            console.error(`Error message: ${error.message}`)
          } else {
            console.error(`Unknown error type:`, typeof error, error)
          }
        }
      } else {
        console.warn(`⚠️ FHE chưa initialized, không thể decrypt ngay. Sẽ decrypt khi load proposals.`)
      }

      await loadProposals()
    } catch (error: any) {
      console.error("Error making vote counts public:", error)
      
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
      console.log(`User ${account} has voted on proposal ${proposalId}:`, voted)
      return voted
    } catch (error: any) {
      console.error("Error checking if user voted:", error)
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
      console.log(`Encrypted vote for proposal ${proposalId}:`, encryptedVote)
      return encryptedVote
    } catch (error: any) {
      console.error("Error getting my vote:", error)
      
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
      console.error("Error getting public vote counts:", error)
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
      console.error("Error checking proposal ownership:", error);
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
      // Check if already submitted
      const [publicYesCount, publicNoCount, isPublic] = await contract.getPublicVoteCounts(proposalId)
      const alreadySubmitted = isPublic && (Number(publicYesCount) + Number(publicNoCount) > 0)
      
      if (alreadySubmitted) {
        console.log(`📊 Proposal ${proposalId} đã được submit rồi: Yes=${publicYesCount}, No=${publicNoCount}`)
      }

      const [encryptedYes, encryptedNo] = await contract.getEncryptedVoteCount(proposalId)
      
      console.log('Encrypted vote counts:', { encryptedYes, encryptedNo })
      
      // Use publicDecryptMultiple if available (following HeadsOrTails pattern)
      // This ensures we get a single proof for both values
      if (fhePublicDecryptMultiple) {
        const decryptResult = await fhePublicDecryptMultiple([encryptedYes, encryptedNo])
        
        const decryptedYes = Number(decryptResult.clearValues[encryptedYes])
        const decryptedNo = Number(decryptResult.clearValues[encryptedNo])
        
        console.log('Decrypted vote counts with proof (multiple):', {
          yes: decryptedYes,
          no: decryptedNo,
          total: decryptedYes + decryptedNo
        })
        
        // Only submit if there are votes and not already submitted
        if ((decryptedYes + decryptedNo) > 0 && !alreadySubmitted) {
          try {
            // Submit with ABI-encoded values and proof (following HeadsOrTails pattern)
            console.log(`📤 Submitting decrypted vote counts cho proposal ${proposalId}...`)
            const tx = await contract.submitDecryptedVoteCounts(
              proposalId,
              decryptResult.abiEncodedClearValues,
              decryptResult.decryptionProof
            )
            const receipt = await tx.wait()
            console.log(`✅ Decrypted vote counts submitted and verified on-chain cho proposal ${proposalId}, block: ${receipt.blockNumber}`)
            
            // Verify submission by checking contract
            await new Promise(resolve => setTimeout(resolve, 500))
            try {
              const [verifyYes, verifyNo, verifyIsPublic] = await contract.getPublicVoteCounts(proposalId)
              const verifyTotal = Number(verifyYes) + Number(verifyNo)
              if (verifyTotal > 0) {
                console.log(`✅ Verified: Proposal ${proposalId} đã được submit thành công - Yes=${verifyYes}, No=${verifyNo}`)
              } else {
                console.warn(`⚠️ Warning: Proposal ${proposalId} submit transaction thành công nhưng contract vẫn = 0`)
              }
            } catch (verifyErr) {
              console.warn(`⚠️ Không thể verify submit cho proposal ${proposalId}`, verifyErr)
            }
          } catch (submitError: any) {
            console.error(`❌ Failed to submit decrypted counts to contract cho proposal ${proposalId}:`, submitError)
            // Vẫn trả về decrypted values để frontend có thể hiển thị
            // Không throw error vì decrypt đã thành công
            if (submitError?.message) {
              console.error(`Submit error details: ${submitError.message}`)
            }
            if (submitError?.data) {
              console.error(`Submit error data:`, submitError.data)
            }
          }
        } else if (alreadySubmitted) {
          console.log(`ℹ️ Proposal ${proposalId} đã được submit rồi, không cần submit lại`)
        } else {
          console.log(`ℹ️ Proposal ${proposalId} không có votes (Yes=${decryptedYes}, No=${decryptedNo}), không cần submit`)
        }
        
        return {
          yesCount: decryptedYes,
          noCount: decryptedNo
        }
      } else if (fhePublicDecrypt) {
        // Fallback to single value decryption (backward compatibility)
        const decryptYesResult = await fhePublicDecrypt(encryptedYes)
        const decryptNoResult = await fhePublicDecrypt(encryptedNo)
        
        const decryptedYes = Number(decryptYesResult.value)
        const decryptedNo = Number(decryptNoResult.value)
        
        console.log('Decrypted vote counts with proofs (single):', { 
          yes: decryptedYes, 
          no: decryptedNo,
          total: decryptedYes + decryptedNo
        })
        
        // Note: Single value decryption cannot submit to contract (contract requires multiple values with single proof)
        // This is kept for backward compatibility only
        console.warn(`⚠️ Using single value decryption - cannot submit to contract. Proposal ${proposalId} values: Yes=${decryptedYes}, No=${decryptedNo}`)
        
        return {
          yesCount: decryptedYes,
          noCount: decryptedNo
        }
      } else {
        throw new Error("FHE decrypt functions not available")
      }
    } catch (error: any) {
      console.error(`❌ Error decrypting vote counts cho proposal ${proposalId}:`, error)
      if (error?.message?.includes('CORS') || error?.message?.includes('cors')) {
        console.error(`❌ Lỗi CORS khi decrypt proposal ${proposalId}`)
      }
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
