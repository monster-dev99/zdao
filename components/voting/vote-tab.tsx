"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Vote, Loader2 } from "lucide-react"
import { ProposalCard } from "./proposal-card"
import { Pagination } from "./pagination"
import type { Proposal, UserVote } from "@/types"

interface VoteTabProps {
  proposals: Proposal[]
  currentProposals: Proposal[]
  isLoading: boolean
  currentPage: number
  totalPages: number
  proposalsPerPage: number
  userVotes: UserVote[]
  votingStates: Record<number, string>
  proposalOwnership: Record<number, boolean>
  fheStatus: {
    loading: boolean
    initialized: boolean
  }
  onVote: (proposalId: number, voteValue: "yes" | "no") => void
  onMakePublic: (proposalId: number) => void
  onRefreshResults: (proposalId: number) => void
  onPageChange: (page: number) => void
  onSwitchToCreate: () => void
}

export function VoteTab({
  proposals,
  currentProposals,
  isLoading,
  currentPage,
  totalPages,
  proposalsPerPage,
  userVotes,
  votingStates,
  proposalOwnership,
  fheStatus,
  onVote,
  onMakePublic,
  onRefreshResults,
  onPageChange,
  onSwitchToCreate,
}: VoteTabProps) {
  const indexOfLastProposal = currentPage * proposalsPerPage
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage

  const hasUserVotedOnProposal = (proposalId: number) => {
    return userVotes.some((vote) => vote.proposalId === proposalId)
  }

  const getUserVote = (proposalId: number) => {
    return userVotes.find((vote) => vote.proposalId === proposalId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Badge variant="secondary" className="bg-cyber-dark-gray text-neon-cyan border-neon-cyan cyber-border">
          {proposals.length} proposals
        </Badge>
      </div>

      {isLoading && proposals.length === 0 ? (
        <Card className="bg-cyber-gray/30 backdrop-blur-xl border-neon-cyan/30 cyber-border">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 text-neon-cyan neon-glow-cyan animate-spin mx-auto mb-4" />
            <p className="text-cyber-medium-gray text-lg">Loading proposals from blockchain...</p>
          </CardContent>
        </Card>
      ) : proposals.length === 0 ? (
        <Card className="bg-cyber-gray/30 backdrop-blur-xl border-neon-cyan/30 cyber-border">
          <CardContent className="py-16 text-center">
            <div className="p-4 bg-cyber-dark-gray border border-neon-cyan cyber-border w-fit mx-auto mb-4">
              <Vote className="h-8 w-8 text-neon-cyan neon-glow-cyan" />
            </div>
            <p className="text-cyber-medium-gray text-lg">No proposals yet. Create the first one!</p>
            <Button
              onClick={onSwitchToCreate}
              className="mt-4 bg-neon-cyan hover:bg-neon-cyan-dark text-cyber-black cyber-border shadow-cyber-cyan"
            >
              Create Proposal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6">
            {currentProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                userVote={getUserVote(proposal.id)}
                hasUserVoted={hasUserVotedOnProposal(proposal.id)}
                votingState={votingStates[proposal.id] || ""}
                isOwner={proposalOwnership[proposal.id] || false}
                isLoading={isLoading}
                fheStatus={fheStatus}
                onVote={onVote}
                onMakePublic={onMakePublic}
                onRefreshResults={onRefreshResults}
              />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            indexOfFirstProposal={indexOfFirstProposal}
            indexOfLastProposal={indexOfLastProposal}
            totalProposals={proposals.length}
          />
        </>
      )}
    </div>
  )
}
