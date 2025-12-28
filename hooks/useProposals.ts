"use client"

import { useEffect, useState, useCallback } from "react"
import { ethers } from "ethers"
import type { Proposal } from "./web3State"
import { getProposals, getContract, getIsLoading, setProposals, setIsLoading, subscribe } from "./web3State"

export function useProposals() {
  const [proposals, setProposalsState] = useState(getProposals())
  const [isLoading, setIsLoadingState] = useState(getIsLoading())

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setProposalsState(getProposals())
      setIsLoadingState(getIsLoading())
    })
    return unsubscribe
  }, [])

  const loadProposals = useCallback(async (
    contract: ethers.Contract | null,
    decryptVoteCounts?: (proposalId: number) => Promise<{yesCount: number, noCount: number}>,
    fheInitialized?: boolean
  ) => {
    if (!contract) return

    try {
      setIsLoading(true)

      const count = await contract.proposalCount()
      const proposalCount = Number(count)

      const loadedProposals: Proposal[] = []
      let publicProposalsCount = 0

      for (let i = 0; i < proposalCount; i++) {
        try {
          const proposal = await contract.proposals(i)
          const [yesCount, noCount, isPublic] = await contract.getPublicVoteCounts(i)
      
          let actualYesCount = Number(yesCount)
          let actualNoCount = Number(noCount)
          let totalVotes = actualYesCount + actualNoCount
          const publicTotal = actualYesCount + actualNoCount
      
          let encryptedYesCount, encryptedNoCount
          
          if (isPublic && fheInitialized && decryptVoteCounts) {
            publicProposalsCount++
            
            if (publicTotal > 0) {
              try {
                const decrypted = await decryptVoteCounts(i)
                if (decrypted.yesCount !== actualYesCount || decrypted.noCount !== actualNoCount) {
                }
              } catch (err: any) {
              }
            } else {
              try {
                const decrypted = await decryptVoteCounts(i)
                actualYesCount = decrypted.yesCount
                actualNoCount = decrypted.noCount
                totalVotes = actualYesCount + actualNoCount
                
                if (totalVotes > 0) {
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  try {
                    const [updatedYes, updatedNo, updatedIsPublic] = await contract.getPublicVoteCounts(i)
                    const updatedTotal = Number(updatedYes) + Number(updatedNo)
                    if (updatedTotal > 0) {
                      actualYesCount = Number(updatedYes)
                      actualNoCount = Number(updatedNo)
                      totalVotes = updatedTotal
                    }
                  } catch (checkErr) {
                  }
                }
              } catch (err: any) {
                actualYesCount = 0
                actualNoCount = 0
                totalVotes = 0
                try {
                  const [encYes, encNo] = await contract.getEncryptedVoteCount(i)
                  encryptedYesCount = encYes
                  encryptedNoCount = encNo
                } catch (encErr) {
                }
              }
            }
          } else {
            try {
              const [encYes, encNo] = await contract.getEncryptedVoteCount(i)
              encryptedYesCount = encYes
              encryptedNoCount = encNo
            } catch (err) {
            }
          }
      
          const proposalData = {
            id: i,
            description: proposal.description,
            yesCount: actualYesCount,
            noCount: actualNoCount,
            isPublic,
            createdAt: new Date(),
            encryptedYesCount,
            encryptedNoCount,
            totalVotes,
          }
          
          loadedProposals.push(proposalData)
        } catch (error) {
        }
      }

      const reversedProposals = loadedProposals.reverse()
      setProposals(reversedProposals)
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshProposals = useCallback(async (
    contract: ethers.Contract | null,
    decryptVoteCounts?: (proposalId: number) => Promise<{yesCount: number, noCount: number}>,
    fheInitialized?: boolean
  ) => {
    await loadProposals(contract, decryptVoteCounts, fheInitialized)
  }, [loadProposals])

  return {
    proposals,
    isLoading,
    loadProposals,
    refreshProposals,
  }
}
