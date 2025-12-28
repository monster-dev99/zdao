"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { useWeb3 } from "@/hooks/useWeb3"
import { WalletConnect } from "@/components/wallet"
import {
  VotingHeader,
  VoteTab,
  CreateTab,
  AnalyticsTab,
  HistoryTab,
  NavigationSidebar,
  SidebarTrigger,
} from "@/components/voting"
import type { UserVote } from "@/types"
import { Loader2, RefreshCw } from "lucide-react"

export default function HomePage() {
  const {
    account,
    isConnected,
    isCorrectNetwork,
    networkName,
    proposals,
    isLoading,
    fheStatus,
    createProposal,
    vote,
    makeVoteCountsPublic,
    hasUserVoted,
    getMyVote,
    getPublicVoteCounts,
    decryptVoteCounts,
    refreshProposals,
    switchToSepolia,
    isProposalOwner,
    fheDecrypt,
    fheUserDecrypt,
    fheUserDecryptMultiple,
  } = useWeb3()

  const { toast } = useToast()
  const [newProposal, setNewProposal] = useState("")
  const [activeTab, setActiveTab] = useState("vote")
  const [userVotes, setUserVotes] = useState<UserVote[]>([])
  const [votingStates, setVotingStates] = useState<Record<number, string>>({})
  const [creatingProposal, setCreatingProposal] = useState(false)
  const [proposalOwnership, setProposalOwnership] = useState<Record<number, boolean>>({})
  
  // Prevent concurrent calls to checkVotingStatus
  const isCheckingVotesRef = useRef(false)
  const decryptingProposalsRef = useRef<Set<number>>(new Set())

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [proposalsPerPage] = useState(3) // Show 3 proposals per page

  // Check voting status and ownership for all proposals
  useEffect(() => {
    if (isConnected && proposals.length > 0 && fheStatus.initialized) {
      // Only check for proposals we don't already have votes for
      const proposalsToCheck = proposals.filter(
        (proposal) => !userVotes.some((vote) => vote.proposalId === proposal.id),
      )

      if (proposalsToCheck.length > 0) {
        console.log(
          "Checking voting status for proposals:",
          proposalsToCheck.map((p) => p.id),
        )
        checkVotingStatus()
      } else {
        console.log("All proposals already have local vote data")
      }

      checkProposalOwnership()
    }
  }, [isConnected, proposals, fheStatus.initialized])

  // Clear user votes and ownership when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setUserVotes([])
      setVotingStates({})
      setProposalOwnership({})
    }
  }, [isConnected])

  // Reload when account changes
  useEffect(() => {
    if (isConnected && account) {
      console.log("Account connected:", account)
    }
  }, [account, isConnected])

  // Reset pagination when proposals change
  useEffect(() => {
    setCurrentPage(1)
  }, [proposals.length])

  const checkProposalOwnership = async () => {
    const ownership: Record<number, boolean> = {}

    try {
      for (const proposal of proposals) {
        try {
          const isOwner = await isProposalOwner(proposal.id)
          ownership[proposal.id] = isOwner
        } catch (error) {
          console.error(`Error checking ownership for proposal ${proposal.id}:`, error)
          ownership[proposal.id] = false
        }
      }
      setProposalOwnership(ownership)
    } catch (error) {
      console.error("Error checking proposal ownership:", error)
    }
  }

  const checkVotingStatus = async () => {
    // Prevent concurrent calls
    if (isCheckingVotesRef.current) {
      console.log("checkVotingStatus already in progress, skipping...")
      return
    }

    isCheckingVotesRef.current = true
    const votes: UserVote[] = []

    try {
      const votedProposals: number[] = []
      for (const proposal of proposals) {
        try {
          const voted = await hasUserVoted(proposal.id)
          if (voted) {
            votedProposals.push(proposal.id)
          }
        } catch (error) {
          console.error(`Error checking vote status for proposal ${proposal.id}:`, error)
        }
      }

      if (votedProposals.length > 0) {
        console.log("User has voted on proposals:", votedProposals)

        const existingVotes = userVotes.filter((vote) => votedProposals.includes(vote.proposalId))
        // Filter out proposals that are already being decrypted or already have votes
        const newProposals = votedProposals.filter(
          (id) => 
            !userVotes.some((vote) => vote.proposalId === id) &&
            !decryptingProposalsRef.current.has(id)
        )

        votes.push(...existingVotes)

        if (newProposals.length > 0) {
          console.log(`🔓 Cần decrypt ${newProposals.length} proposal(s):`, newProposals)
          console.log(`📊 Tổng số proposal đang decrypt: ${decryptingProposalsRef.current.size + newProposals.length}`)

          // Mark proposals as being decrypted
          newProposals.forEach((id) => decryptingProposalsRef.current.add(id))

          // Batch decrypt: Get all encrypted votes first, then decrypt all at once
          if (fheStatus.initialized && fheUserDecryptMultiple && newProposals.length > 0) {
            try {
              // Get all encrypted votes in parallel
              const encryptedVotesPromises = newProposals.map(async (proposalId) => {
                try {
                  const encryptedVote = await getMyVote(proposalId)
                  return { proposalId, encryptedVote }
                } catch (error) {
                  console.error(`Error getting vote for proposal ${proposalId}:`, error)
                  return { proposalId, encryptedVote: null, error }
                }
              })

              const encryptedVotesResults = await Promise.all(encryptedVotesPromises)

              // Filter out errors and prepare for batch decrypt
              const validEncryptedVotes = encryptedVotesResults.filter(
                (result) => result.encryptedVote !== null && !result.error,
              ) as Array<{ proposalId: number; encryptedVote: string }>

              const errorProposals = encryptedVotesResults.filter(
                (result) => result.encryptedVote === null || result.error,
              )

              // Add error votes
              for (const errorProposal of errorProposals) {
                votes.push({
                  proposalId: errorProposal.proposalId,
                  vote: "error",
                  votedAt: new Date(),
                })
                decryptingProposalsRef.current.delete(errorProposal.proposalId)
              }

              // Batch decrypt all valid votes at once
              if (validEncryptedVotes.length > 0) {
                const encryptedValues = validEncryptedVotes.map((v) => v.encryptedVote)
                console.log(`🔓 Đang batch decrypt ${encryptedValues.length} vote(s)...`)
                console.log(`📊 Tổng số proposal đang decrypt: ${decryptingProposalsRef.current.size}`)

                try {
                  const decryptResult = await fheUserDecryptMultiple(encryptedValues)
                  console.log(`✅ Batch decrypt thành công cho ${encryptedValues.length} vote(s)`)

                  // Map decrypted values back to proposals
                  for (const { proposalId, encryptedVote } of validEncryptedVotes) {
                    const decryptedVote = decryptResult.clearValues[encryptedVote]
                    if (decryptedVote !== undefined) {
                      const voteValue = decryptedVote === 0 ? "yes" : "no"
                      votes.push({
                        proposalId: proposalId,
                        vote: voteValue,
                        votedAt: new Date(),
                      })
                      console.log(`Added decrypted vote for proposal ${proposalId}:`, voteValue)
                    } else {
                      console.error(`No decrypted value found for proposal ${proposalId}`)
                      votes.push({
                        proposalId: proposalId,
                        vote: "error",
                        votedAt: new Date(),
                      })
                    }
                    decryptingProposalsRef.current.delete(proposalId)
                  }
                } catch (decryptError: any) {
                  console.error(`❌ Lỗi khi batch decrypt:`, decryptError)
                  if (decryptError?.message?.includes('CORS') || decryptError?.message?.includes('cors')) {
                    console.error(`⚠️ Lỗi CORS khi decrypt - có thể do relayer server không cho phép CORS từ domain này`)
                  }
                  throw decryptError
                }
              }
            } catch (error: any) {
              console.error("❌ Error in batch decrypt:", error)
              if (error?.message?.includes('CORS') || error?.message?.includes('cors')) {
                console.error(`⚠️ Lỗi CORS khi batch decrypt`)
              }
              // Mark all remaining proposals as error
              const remainingProposals = newProposals.filter(
                (id) => !votes.some((v) => v.proposalId === id)
              )
              
              console.log(`❌ Không thể decrypt ${remainingProposals.length} proposal(s) - đánh dấu là lỗi`)
              for (const proposalId of remainingProposals) {
                votes.push({
                  proposalId: proposalId,
                  vote: "error",
                  votedAt: new Date(),
                })
                decryptingProposalsRef.current.delete(proposalId)
              }
            }
          } else {
            // FHE not initialized
            for (const proposalId of newProposals) {
              console.log(`FHE not initialized, using placeholder for proposal ${proposalId}`)
              votes.push({
                proposalId: proposalId,
                vote: "unknown",
                votedAt: new Date(),
              })
              decryptingProposalsRef.current.delete(proposalId)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in checkVotingStatus:", error)
      // Clear decrypting flags on error
      decryptingProposalsRef.current.clear()
    } finally {
      isCheckingVotesRef.current = false
    }

    setUserVotes(votes)
  }

  const handleCreateProposal = async () => {
    if (!newProposal.trim()) return

    try {
      setCreatingProposal(true)
      await createProposal(newProposal.trim())
      setNewProposal("")
      setActiveTab("vote")
      toast({
        title: "Proposal Created",
        description: "Your proposal has been successfully created on the blockchain.",
      })
    } catch (error) {
      console.error("Error creating proposal:", error)
      toast({
        title: "Error",
        description: "Failed to create proposal. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreatingProposal(false)
    }
  }

  const handleVote = async (proposalId: number, voteValue: "yes" | "no") => {
    setVotingStates((prev) => ({ ...prev, [proposalId]: "Preparing..." }))

    try {
      console.log("UI handleVote called:", { proposalId, voteValue, booleanValue: voteValue === "yes" })

      setVotingStates((prev) => ({ ...prev, [proposalId]: "Encrypting..." }))

      await vote(proposalId, voteValue === "yes")

      setVotingStates((prev) => ({ ...prev, [proposalId]: "Submitting..." }))

      setVotingStates((prev) => ({ ...prev, [proposalId]: "Confirming..." }))

      const newVote: UserVote = {
        proposalId,
        vote: voteValue,
        votedAt: new Date(),
      }
      setUserVotes((prev) => [...prev.filter((v) => v.proposalId !== proposalId), newVote])

      console.log("Vote completed successfully:", { proposalId, voteValue })

      toast({
        title: "Vote Submitted",
        description: `Your ${voteValue} vote has been recorded on the blockchain.`,
      })

      await refreshProposals()
    } catch (error) {
      console.error("Error voting:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit vote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setVotingStates((prev) => ({ ...prev, [proposalId]: "" }))
    }
  }

  const handleMakePublic = async (proposalId: number) => {
    try {
      await makeVoteCountsPublic(proposalId)
      toast({
        title: "Results Made Public",
        description: "Vote counts are now visible to everyone.",
      })
    } catch (error) {
      console.error("Error making results public:", error)
      toast({
        title: "Error",
        description: "Failed to make results public. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRefreshResults = async (proposalId: number) => {
    try {
      if (!fheStatus.initialized) {
        toast({
          title: "Error",
          description: "FHE service not initialized. Please wait.",
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "Refreshing Results",
        description: "Decrypting and updating vote counts...",
      })
      
      // Decrypt và submit vote counts
      await decryptVoteCounts(proposalId)
      
      // Reload proposals để lấy giá trị mới
      await refreshProposals()
      
      toast({
        title: "Results Refreshed",
        description: "Vote counts have been updated.",
      })
    } catch (error: any) {
      console.error("Error refreshing results:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to refresh results. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Pagination logic
  const indexOfLastProposal = currentPage * proposalsPerPage
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage
  const currentProposals = proposals.slice(indexOfFirstProposal, indexOfLastProposal)
  const totalPages = Math.ceil(proposals.length / proposalsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Calculate totalVotes using useMemo to ensure it updates when proposals change
  const totalVotes = useMemo(() => {
    const calculated = proposals.reduce((acc, p) => acc + p.yesCount + p.noCount, 0)
    console.log(`📊 Total votes calculated in useMemo: ${calculated}`, {
      proposalsCount: proposals.length,
      breakdown: proposals.map(p => ({
        id: p.id,
        yesCount: p.yesCount,
        noCount: p.noCount,
        total: p.yesCount + p.noCount
      }))
    })
    return calculated
  }, [proposals])
  
  const totalProposals = proposals.length
  const userVoteCount = userVotes.length

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid relative">
        {/* Cyberpunk scan overlay */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none scan-overlay opacity-30"></div>
        {/* Subtle neon accents */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-neon-cyan/10 cyber-border animate-glow-pulse"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 border border-neon-magenta/10 cyber-border animate-glow-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <VotingHeader
          isConnected={isConnected}
          isCorrectNetwork={isCorrectNetwork}
          networkName={networkName}
          totalVotes={0}
          totalProposals={0}
          fheStatus={fheStatus}
          switchToSepolia={switchToSepolia}
        />

        {/* Main Content */}
        <main className="pb-12 relative z-10">
          <div className="max-w-4xl mx-auto px-6">
            <WalletConnect />
          </div>
        </main>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {fheStatus.loading && (
        <div className="fixed inset-0 bg-cyber-black/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-cyber-gray border border-neon-cyan cyber-border p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-neon-cyan neon-glow-cyan mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-cyber-off-white neon-glow mb-2">Initializing FHE</h3>
            <p className="text-cyber-medium-gray">Loading ZDAO...</p>
          </div>
        </div>
      )}

      <div className="fixed inset-0 overflow-hidden pointer-events-none scan-overlay opacity-20 z-0"></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-neon-cyan/10 cyber-border animate-glow-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 border border-neon-magenta/10 cyber-border animate-glow-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="min-h-screen flex w-full bg-cyber-black cyber-grid relative">
        <NavigationSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <SidebarInset className="flex flex-col flex-1">
          <VotingHeader
            isConnected={isConnected}
            isCorrectNetwork={isCorrectNetwork}
            networkName={networkName}
            totalVotes={totalVotes}
            totalProposals={totalProposals}
            fheStatus={fheStatus}
            switchToSepolia={switchToSepolia}
          />

          <main className="relative z-10 flex-1 pb-12">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="md:hidden text-cyber-medium-gray hover:text-neon-cyan hover:bg-cyber-dark-gray cyber-border" />
                  <h1 className="text-2xl font-bold text-cyber-off-white neon-glow">
                    {activeTab === "vote" && "Active Proposals"}
                    {activeTab === "create" && "Create Proposal"}
                    {activeTab === "analytics" && "Analytics"}
                    {activeTab === "history" && "My Votes"}
                  </h1>
                </div>

                <Button
                  onClick={refreshProposals}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="text-cyber-medium-gray hover:text-neon-cyan hover:bg-cyber-dark-gray cyber-border"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>

              {activeTab === "vote" && (
                <VoteTab
                  proposals={proposals}
                  currentProposals={currentProposals}
                  isLoading={isLoading}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  proposalsPerPage={proposalsPerPage}
                  userVotes={userVotes}
                  votingStates={votingStates}
                  proposalOwnership={proposalOwnership}
                  fheStatus={fheStatus}
                  onVote={handleVote}
                  onMakePublic={handleMakePublic}
                  onRefreshResults={handleRefreshResults}
                  onPageChange={handlePageChange}
                  onSwitchToCreate={() => setActiveTab("create")}
                />
              )}

              {activeTab === "create" && (
                <CreateTab
                  newProposal={newProposal}
                  creatingProposal={creatingProposal}
                  onProposalChange={setNewProposal}
                  onCreateProposal={handleCreateProposal}
                />
              )}

              {activeTab === "analytics" && (
                <AnalyticsTab
                  proposals={proposals}
                  currentProposals={currentProposals}
                  totalProposals={totalProposals}
                  totalVotes={totalVotes}
                  userVoteCount={userVoteCount}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  proposalsPerPage={proposalsPerPage}
                  onPageChange={handlePageChange}
                />
              )}

              {activeTab === "history" && (
                <HistoryTab userVotes={userVotes} proposals={proposals} onSwitchToVote={() => setActiveTab("vote")} />
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
