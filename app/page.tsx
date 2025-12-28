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
  
  const isCheckingVotesRef = useRef(false)
  const decryptingProposalsRef = useRef<Set<number>>(new Set())

  const [currentPage, setCurrentPage] = useState(1)
  const [proposalsPerPage] = useState(3)

  useEffect(() => {
    if (isConnected && proposals.length > 0 && fheStatus.initialized) {
      const proposalsToCheck = proposals.filter(
        (proposal) => !userVotes.some((vote) => vote.proposalId === proposal.id),
      )

      if (proposalsToCheck.length > 0) {
        checkVotingStatus()
      }

      checkProposalOwnership()
    }
  }, [isConnected, proposals, fheStatus.initialized])

  useEffect(() => {
    if (!isConnected) {
      setUserVotes([])
      setVotingStates({})
      setProposalOwnership({})
    }
  }, [isConnected])

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
          ownership[proposal.id] = false
        }
      }
      setProposalOwnership(ownership)
    } catch (error) {
    }
  }

  const checkVotingStatus = async () => {
    if (isCheckingVotesRef.current) {
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
        }
      }

      if (votedProposals.length > 0) {
        const existingVotes = userVotes.filter((vote) => votedProposals.includes(vote.proposalId))
        const newProposals = votedProposals.filter(
          (id) => 
            !userVotes.some((vote) => vote.proposalId === id) &&
            !decryptingProposalsRef.current.has(id)
        )

        votes.push(...existingVotes)

        if (newProposals.length > 0) {
          newProposals.forEach((id) => decryptingProposalsRef.current.add(id))

          if (fheStatus.initialized && fheUserDecryptMultiple && newProposals.length > 0) {
            try {
              const encryptedVotesPromises = newProposals.map(async (proposalId) => {
                try {
                  const encryptedVote = await getMyVote(proposalId)
                  return { proposalId, encryptedVote }
                } catch (error) {
                  return { proposalId, encryptedVote: null, error }
                }
              })

              const encryptedVotesResults = await Promise.all(encryptedVotesPromises)

              const validEncryptedVotes = encryptedVotesResults.filter(
                (result) => result.encryptedVote !== null && !result.error,
              ) as Array<{ proposalId: number; encryptedVote: string }>

              const errorProposals = encryptedVotesResults.filter(
                (result) => result.encryptedVote === null || result.error,
              )

              for (const errorProposal of errorProposals) {
                votes.push({
                  proposalId: errorProposal.proposalId,
                  vote: "error",
                  votedAt: new Date(),
                })
                decryptingProposalsRef.current.delete(errorProposal.proposalId)
              }

              if (validEncryptedVotes.length > 0) {
                const encryptedValues = validEncryptedVotes.map((v) => v.encryptedVote)

                try {
                  const decryptResult = await fheUserDecryptMultiple(encryptedValues)

                  for (const { proposalId, encryptedVote } of validEncryptedVotes) {
                    const decryptedVote = decryptResult.clearValues[encryptedVote]
                    if (decryptedVote !== undefined) {
                      const voteValue = decryptedVote === 0 ? "yes" : "no"
                      votes.push({
                        proposalId: proposalId,
                        vote: voteValue,
                        votedAt: new Date(),
                      })
                    } else {
                      votes.push({
                        proposalId: proposalId,
                        vote: "error",
                        votedAt: new Date(),
                      })
                    }
                    decryptingProposalsRef.current.delete(proposalId)
                  }
                } catch (decryptError: any) {
                  throw decryptError
                }
              }
            } catch (error: any) {
              const remainingProposals = newProposals.filter(
                (id) => !votes.some((v) => v.proposalId === id)
              )
              
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
            for (const proposalId of newProposals) {
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

      toast({
        title: "Vote Submitted",
        description: `Your ${voteValue} vote has been recorded on the blockchain.`,
      })

      await refreshProposals()
    } catch (error) {
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
      
      await decryptVoteCounts(proposalId)
      
      await refreshProposals()
      
      toast({
        title: "Results Refreshed",
        description: "Vote counts have been updated.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to refresh results. Please try again.",
        variant: "destructive",
      })
    }
  }

  const indexOfLastProposal = currentPage * proposalsPerPage
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage
  const currentProposals = proposals.slice(indexOfFirstProposal, indexOfLastProposal)
  const totalPages = Math.ceil(proposals.length / proposalsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const totalVotes = useMemo(() => {
    const calculated = proposals.reduce((acc, p) => acc + p.yesCount + p.noCount, 0)
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
