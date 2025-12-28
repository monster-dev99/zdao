"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lock, CheckCircle, XCircle, Eye, Loader2, RefreshCw } from "lucide-react"
import type { Proposal, UserVote } from "@/types"

interface ProposalCardProps {
  proposal: Proposal
  userVote: UserVote | undefined
  hasUserVoted: boolean
  votingState: string
  isOwner: boolean
  isLoading: boolean
  fheStatus: {
    loading: boolean
    initialized: boolean
  }
  onVote: (proposalId: number, voteValue: "yes" | "no") => void
  onMakePublic: (proposalId: number) => void
  onRefreshResults: (proposalId: number) => void
}

export function ProposalCard({
  proposal,
  userVote,
  hasUserVoted,
  votingState,
  isOwner,
  isLoading,
  fheStatus,
  onVote,
  onMakePublic,
  onRefreshResults,
}: ProposalCardProps) {
  return (
    <Card className="bg-cyber-gray/40 backdrop-blur-xl border-neon-cyan/30 cyber-border hover:border-neon-cyan transition-all duration-300 hover:shadow-cyber-cyan">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-cyber-off-white text-lg leading-relaxed flex-1">{proposal.description}</CardTitle>
          <div className="flex items-center gap-2">
            {proposal.isPublic && (
              <Badge
                variant="secondary"
                className="bg-cyber-dark-gray text-neon-magenta border-neon-magenta cyber-border"
              >
                <Lock className="h-3 w-3 mr-1" />
                Voting Closed
              </Badge>
            )}
            <div className="text-xs text-cyber-medium-gray whitespace-nowrap">#{proposal.id}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voting Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {proposal.isPublic && (
            <div className="col-span-full mb-4 p-4 bg-cyber-dark-gray border border-neon-magenta cyber-border">
              <div className="flex items-center gap-2 text-neon-magenta neon-glow-magenta">
                <Lock className="h-4 w-4" />
                <span className="font-medium">Voting has been closed</span>
              </div>
              <p className="text-cyber-medium-gray text-sm mt-1">
                Results are now public. No more votes can be submitted for this proposal.
              </p>
            </div>
          )}
          <Button
            variant={userVote?.vote === "yes" ? "default" : "outline"}
            onClick={() => onVote(proposal.id, "yes")}
            disabled={
              !!votingState ||
              isLoading ||
              fheStatus.loading ||
              !fheStatus.initialized ||
              hasUserVoted ||
              proposal.isPublic
            }
            className={`h-12 font-medium transition-all duration-200 cyber-border ${
              userVote?.vote === "yes"
                ? "bg-neon-cyan hover:bg-neon-cyan-dark text-cyber-black border-neon-cyan shadow-cyber-cyan"
                : hasUserVoted || proposal.isPublic
                  ? "bg-cyber-dark-gray border-cyber-light-gray text-cyber-medium-gray cursor-not-allowed"
                  : "bg-cyber-gray border-neon-cyan text-cyber-off-white hover:bg-cyber-dark-gray hover:border-neon-cyan hover:text-neon-cyan"
            }`}
          >
            {votingState ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : fheStatus.loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {votingState || (fheStatus.loading ? "Loading FHE..." : proposal.isPublic ? "Voting Closed" : "Vote Yes")}
          </Button>
          <Button
            variant={userVote?.vote === "no" ? "destructive" : "outline"}
            onClick={() => onVote(proposal.id, "no")}
            disabled={
              !!votingState ||
              isLoading ||
              fheStatus.loading ||
              !fheStatus.initialized ||
              hasUserVoted ||
              proposal.isPublic
            }
            className={`h-12 font-medium transition-all duration-200 cyber-border ${
              userVote?.vote === "no"
                ? "bg-destructive hover:bg-destructive/90 text-cyber-black border-destructive shadow-cyber-magenta"
                : hasUserVoted || proposal.isPublic
                  ? "bg-cyber-dark-gray border-cyber-light-gray text-cyber-medium-gray cursor-not-allowed"
                  : "bg-cyber-gray border-neon-magenta text-cyber-off-white hover:bg-cyber-dark-gray hover:border-neon-magenta hover:text-neon-magenta"
            }`}
          >
            {votingState ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : fheStatus.loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {votingState || (fheStatus.loading ? "Loading FHE..." : proposal.isPublic ? "Voting Closed" : "Vote No")}
          </Button>
        </div>

        {/* Make Results Public Button - Only for proposal owner */}
        {isOwner && !proposal.isPublic && (
          <Button
            variant="ghost"
            onClick={() => onMakePublic(proposal.id)}
            disabled={isLoading}
            className="w-full h-10 bg-cyber-dark-gray hover:bg-cyber-gray text-cyber-off-white hover:text-neon-cyan border border-neon-cyan/50 hover:border-neon-cyan cyber-border transition-all duration-200"
          >
            <Eye className="h-4 w-4 mr-2" />
            Make Results Public
          </Button>
        )}

        {/* Results Display */}
        {proposal.isPublic && (
          <div className="p-6 bg-cyber-dark-gray cyber-border border-neon-cyan/30">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold text-cyber-off-white neon-glow">Results</span>
              <div className="flex items-center gap-2">
                {proposal.yesCount + proposal.noCount === 0 && fheStatus.initialized && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRefreshResults(proposal.id)}
                    disabled={isLoading}
                    className="h-7 px-3 bg-cyber-gray hover:bg-cyber-dark-gray text-neon-cyan hover:text-neon-cyan border border-neon-cyan/50 hover:border-neon-cyan cyber-border text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                )}
                <Badge variant="secondary" className="bg-cyber-gray text-neon-cyan border-neon-cyan cyber-border">
                  {proposal.yesCount + proposal.noCount} total votes
                </Badge>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-neon-cyan"></div>
                    <span className="text-cyber-off-white font-medium">Yes</span>
                    <span className="text-cyber-medium-gray">{proposal.yesCount} votes</span>
                  </div>
                  <div className="text-lg font-bold text-neon-cyan neon-glow-cyan">
                    {proposal.yesCount + proposal.noCount > 0
                      ? Math.round((proposal.yesCount / (proposal.yesCount + proposal.noCount)) * 100)
                      : 0}
                    %
                  </div>
                </div>
                <div className="w-full bg-cyber-gray h-2">
                  <div
                    className="bg-neon-cyan h-2 transition-all duration-500"
                    style={{
                      width: `${
                        proposal.yesCount + proposal.noCount > 0
                          ? (proposal.yesCount / (proposal.yesCount + proposal.noCount)) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-destructive"></div>
                    <span className="text-cyber-off-white font-medium">No</span>
                    <span className="text-cyber-medium-gray">{proposal.noCount} votes</span>
                  </div>
                  <div className="text-lg font-bold text-destructive">
                    {proposal.yesCount + proposal.noCount > 0
                      ? Math.round((proposal.noCount / (proposal.yesCount + proposal.noCount)) * 100)
                      : 0}
                    %
                  </div>
                </div>
                <div className="w-full bg-cyber-gray h-2">
                  <div
                    className="bg-destructive h-2 transition-all duration-500"
                    style={{
                      width: `${
                        proposal.yesCount + proposal.noCount > 0
                          ? (proposal.noCount / (proposal.yesCount + proposal.noCount)) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voting Status */}
        {hasUserVoted && userVote?.vote && userVote.vote !== "error" && userVote.vote !== "unknown" && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-neon-cyan animate-pulse"></div>
            <Badge
              variant="secondary"
              className={`text-xs font-medium cyber-border ${
                userVote?.vote === "yes"
                  ? "bg-cyber-dark-gray text-neon-cyan border-neon-cyan"
                  : "bg-cyber-dark-gray text-destructive border-destructive"
              }`}
            >
              You voted: {userVote?.vote?.toUpperCase()}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
