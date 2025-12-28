"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Vote, Users, TrendingUp } from "lucide-react"
import type { Proposal } from "@/types"

interface AnalyticsTabProps {
  proposals: Proposal[]
  currentProposals: Proposal[]
  totalProposals: number
  totalVotes: number
  userVoteCount: number
  currentPage: number
  totalPages: number
  proposalsPerPage: number
  onPageChange: (page: number) => void
}

export function AnalyticsTab({
  proposals,
  currentProposals,
  totalProposals,
  totalVotes,
  userVoteCount,
  currentPage,
  totalPages,
  proposalsPerPage,
  onPageChange,
}: AnalyticsTabProps) {
  const indexOfLastProposal = currentPage * proposalsPerPage
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="bg-cyber-gray/40 backdrop-blur-xl border-neon-cyan/30 cyber-border"
          title="Total number of proposals created"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyber-dark-gray border border-neon-cyan cyber-border">
                <Vote className="h-5 w-5 text-neon-cyan neon-glow-cyan" />
              </div>
              <div>
                <p className="text-cyber-medium-gray text-sm">Proposals</p>
                <p className="text-2xl font-bold text-neon-cyan neon-glow-cyan">{totalProposals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-cyber-gray/40 backdrop-blur-xl border-neon-cyan/30 cyber-border"
          title="Total votes cast across all proposals"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyber-dark-gray border border-neon-cyan cyber-border">
                <Users className="h-5 w-5 text-neon-cyan neon-glow-cyan" />
              </div>
              <div>
                <p className="text-cyber-medium-gray text-sm">Votes Cast</p>
                <p className="text-2xl font-bold text-neon-cyan neon-glow-cyan">{totalVotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-cyber-gray/40 backdrop-blur-xl border-neon-cyan/30 cyber-border"
          title="Your voting participation"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyber-dark-gray border border-neon-magenta cyber-border">
                <TrendingUp className="h-5 w-5 text-neon-magenta neon-glow-magenta" />
              </div>
              <div>
                <p className="text-cyber-medium-gray text-sm">Your Activity</p>
                <p className="text-2xl font-bold text-neon-magenta neon-glow-magenta">{userVoteCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-cyber-gray/40 backdrop-blur-xl border-neon-cyan/30 cyber-border">
        <CardHeader>
          <CardTitle className="text-cyber-off-white neon-glow">Proposal Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentProposals.map((proposal) => (
              <div key={proposal.id} className="p-4 bg-cyber-dark-gray cyber-border border-neon-cyan/30">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-cyber-off-white font-medium text-sm leading-relaxed flex-1 pr-4">
                    {proposal.description}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-cyber-gray text-neon-cyan border-neon-cyan cyber-border text-xs"
                    >
                      #{proposal.id}
                    </Badge>
                    {proposal.isPublic ? (
                      <Badge
                        variant="secondary"
                        className="bg-cyber-dark-gray text-neon-magenta border-neon-magenta cyber-border text-xs"
                      >
                        Public
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-cyber-gray text-cyber-medium-gray border-cyber-light-gray cyber-border text-xs"
                      >
                        Private
                      </Badge>
                    )}
                  </div>
                </div>
                {proposal.isPublic && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-neon-cyan"></div>
                      <span className="text-cyber-medium-gray">Yes: {proposal.yesCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-destructive"></div>
                      <span className="text-cyber-medium-gray">No: {proposal.noCount}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-cyber-dark-gray border-neon-cyan/50 text-cyber-off-white hover:bg-cyber-gray hover:border-neon-cyan cyber-border"
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => onPageChange(page)}
                    className={`w-10 h-10 cyber-border ${
                      currentPage === page
                        ? "bg-neon-cyan text-cyber-black border-neon-cyan shadow-cyber-cyan"
                        : "bg-cyber-dark-gray border-neon-cyan/50 text-cyber-off-white hover:bg-cyber-gray hover:border-neon-cyan"
                    }`}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-cyber-dark-gray border-neon-cyan/50 text-cyber-off-white hover:bg-cyber-gray hover:border-neon-cyan cyber-border"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
