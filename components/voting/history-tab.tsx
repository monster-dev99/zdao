"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { History } from "lucide-react"
import type { Proposal, UserVote } from "@/types"

interface HistoryTabProps {
  userVotes: UserVote[]
  proposals: Proposal[]
  onSwitchToVote: () => void
}

export function HistoryTab({ userVotes, proposals, onSwitchToVote }: HistoryTabProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Badge variant="secondary" className="bg-cyber-dark-gray text-neon-cyan border-neon-cyan cyber-border">
          {userVotes.length} {userVotes.length === 1 ? "vote" : "votes"}
        </Badge>
      </div>

      {userVotes.length === 0 ? (
        <Card className="bg-cyber-gray/30 backdrop-blur-xl border-neon-cyan/30 cyber-border">
          <CardContent className="py-16 text-center">
            <div className="p-4 bg-cyber-dark-gray border border-neon-cyan cyber-border w-fit mx-auto mb-4">
              <History className="h-8 w-8 text-neon-cyan neon-glow-cyan" />
            </div>
            <p className="text-cyber-medium-gray text-lg">No votes cast yet</p>
            <Button
              onClick={onSwitchToVote}
              className="mt-4 bg-neon-cyan hover:bg-neon-cyan-dark text-cyber-black cyber-border shadow-cyber-cyan"
            >
              Start Voting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userVotes
            .sort((a, b) => b.votedAt.getTime() - a.votedAt.getTime())
            .map((vote) => {
              const proposal = proposals.find((p) => p.id === vote.proposalId)
              if (!proposal) return null

              return (
                <Card
                  key={`${vote.proposalId}-${vote.votedAt.getTime()}`}
                  className="bg-cyber-gray/40 backdrop-blur-xl border-neon-cyan/30 cyber-border"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-cyber-off-white font-medium mb-2 leading-relaxed">
                          {proposal.description}
                        </h4>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="secondary"
                            className={`text-xs font-medium cyber-border ${
                              vote.vote === "yes"
                                ? "bg-cyber-dark-gray text-neon-cyan border-neon-cyan"
                                : "bg-cyber-dark-gray text-destructive border-destructive"
                            }`}
                          >
                            {vote.vote.toUpperCase()}
                          </Badge>
                          <span className="text-cyber-medium-gray text-sm">{formatDate(vote.votedAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-cyber-medium-gray text-sm mb-1">#{proposal.id}</div>
                        {proposal.isPublic && (
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-neon-cyan neon-glow-cyan">{proposal.yesCount}</span>
                            <span className="text-cyber-medium-gray">/</span>
                            <span className="text-destructive">{proposal.noCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
