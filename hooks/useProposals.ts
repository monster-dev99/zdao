"use client"

import { useEffect, useState, useCallback } from "react"
import { ethers } from "ethers"
import type { Proposal } from "./web3State"
import { getProposals, getContract, getIsLoading, setProposals, setIsLoading, subscribe } from "./web3State"

export function useProposals() {
  const [proposals, setProposalsState] = useState(getProposals())
  const [isLoading, setIsLoadingState] = useState(getIsLoading())

  // Subscribe to state changes
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

      console.log(`📋 Tổng số proposal: ${proposalCount}`)

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
            console.log(`🔓 Đang xử lý public proposal ${i} (public proposal #${publicProposalsCount}/${proposalCount})`)
            console.log(`📊 Public counts từ contract: Yes=${actualYesCount}, No=${actualNoCount}, Total=${publicTotal}`)
            
            // Check đã submit chưa
            if (publicTotal > 0) {
              // Đã submit rồi - có thể dùng giá trị từ contract hoặc decrypt lại để verify
              console.log(`✅ Proposal ${i} đã được submit (publicTotal=${publicTotal}), decrypt lại để verify...`)
              try {
                const decrypted = await decryptVoteCounts(i)
                // Verify: nếu decrypt khác với contract, log warning nhưng vẫn dùng giá trị từ contract
                if (decrypted.yesCount !== actualYesCount || decrypted.noCount !== actualNoCount) {
                  console.warn(`⚠️ Proposal ${i}: Decrypted values khác với contract values`, {
                    contract: { yes: actualYesCount, no: actualNoCount },
                    decrypted: { yes: decrypted.yesCount, no: decrypted.noCount }
                  })
                  // Vẫn dùng giá trị từ contract vì đã được verify on-chain
                } else {
                  console.log(`✅ Proposal ${i}: Decrypted values khớp với contract values`)
                }
              } catch (err: any) {
                console.warn(`⚠️ Failed to decrypt proposal ${i} để verify, nhưng đã có giá trị từ contract`, err)
                // Vẫn dùng giá trị từ contract
              }
            } else {
              // Chưa submit (publicTotal = 0) - cần decrypt để phân biệt "chưa có vote" vs "chưa submit"
              console.log(`🔍 Proposal ${i} chưa submit (publicTotal=0), decrypt để kiểm tra...`)
              try {
                const decrypted = await decryptVoteCounts(i)
                actualYesCount = decrypted.yesCount
                actualNoCount = decrypted.noCount
                totalVotes = actualYesCount + actualNoCount
                
                if (totalVotes > 0) {
                  // Có votes nhưng chưa submit - decryptVoteCounts đã tự động submit
                  console.log(`✅ Decrypted và submitted proposal ${i}:`, { 
                    actualYesCount, 
                    actualNoCount, 
                    totalVotes
                  })
                  
                  // Đợi một chút rồi check lại từ contract để đảm bảo submit đã thành công
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  try {
                    const [updatedYes, updatedNo, updatedIsPublic] = await contract.getPublicVoteCounts(i)
                    const updatedTotal = Number(updatedYes) + Number(updatedNo)
                    if (updatedTotal > 0) {
                      // Submit thành công, dùng giá trị từ contract
                      console.log(`✅ Proposal ${i} đã được submit thành công, dùng giá trị từ contract: Yes=${updatedYes}, No=${updatedNo}`)
                      actualYesCount = Number(updatedYes)
                      actualNoCount = Number(updatedNo)
                      totalVotes = updatedTotal
                    } else {
                      // Submit có thể thất bại, nhưng vẫn dùng decrypted values để hiển thị
                      console.warn(`⚠️ Proposal ${i}: Submit có thể thất bại (contract vẫn = 0), nhưng dùng decrypted values để hiển thị`)
                    }
                  } catch (checkErr) {
                    console.warn(`⚠️ Không thể check lại contract sau submit cho proposal ${i}, dùng decrypted values`, checkErr)
                  }
                } else {
                  // Thực sự không có votes
                  console.log(`✅ Proposal ${i} không có votes (đúng rồi)`)
                }
                console.log(`📊 Proposal ${i} vote counts - Yes: ${actualYesCount}, No: ${actualNoCount}, Total: ${totalVotes}`)
              } catch (err: any) {
                console.warn(`⚠️ Failed to decrypt proposal ${i}`, err)
                if (err?.message?.includes('CORS') || err?.message?.includes('cors')) {
                  console.error(`❌ Lỗi CORS khi decrypt proposal ${i} - có thể do relayer server không cho phép CORS`)
                }
                // Nếu decrypt thất bại, giữ giá trị 0 (có thể là lỗi hoặc thực sự không có votes)
                actualYesCount = 0
                actualNoCount = 0
                totalVotes = 0
                try {
                  const [encYes, encNo] = await contract.getEncryptedVoteCount(i)
                  encryptedYesCount = encYes
                  encryptedNoCount = encNo
                } catch (encErr) {
                  console.warn(`⚠️ Could not fetch encrypted counts for proposal ${i}`, encErr)
                }
              }
            }
          } else {
            // Not public hoặc FHE chưa initialized - chỉ lấy encrypted counts
            try {
              const [encYes, encNo] = await contract.getEncryptedVoteCount(i)
              encryptedYesCount = encYes
              encryptedNoCount = encNo
            } catch (err) {
              console.warn(`⚠️ Could not fetch encrypted counts for proposal ${i}`, err)
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
          
          console.log(`📝 Proposal ${i} data before push:`, {
            yesCount: proposalData.yesCount,
            noCount: proposalData.noCount,
            totalVotes: proposalData.totalVotes
          })
          
          loadedProposals.push(proposalData)
        } catch (error) {
          console.error(`❌ Error loading proposal ${i}:`, error)
        }
      }

      console.log(`📊 Tổng số public proposals cần decrypt: ${publicProposalsCount}`)
      console.log(`✅ Đã load ${loadedProposals.length} proposal(s)`)
      
      // Calculate total votes for debugging
      const calculatedTotalVotes = loadedProposals.reduce((acc, p) => acc + p.yesCount + p.noCount, 0)
      console.log(`📊 Calculated total votes from loaded proposals: ${calculatedTotalVotes}`)
      console.log(`📊 Proposal vote counts breakdown:`, loadedProposals.map(p => ({
        id: p.id,
        yesCount: p.yesCount,
        noCount: p.noCount,
        total: p.yesCount + p.noCount
      })))

      const reversedProposals = loadedProposals.reverse()
      console.log(`🔄 Setting proposals state with ${reversedProposals.length} proposals`)
      setProposals(reversedProposals)
    } catch (error) {
      console.error("Error loading proposals:", error)
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
