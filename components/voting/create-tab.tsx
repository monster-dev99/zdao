"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Vote, Loader2 } from "lucide-react"

interface CreateTabProps {
  newProposal: string
  creatingProposal: boolean
  onProposalChange: (value: string) => void
  onCreateProposal: () => void
}

export function CreateTab({ newProposal, creatingProposal, onProposalChange, onCreateProposal }: CreateTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-cyber-gray/50 backdrop-blur-xl border-neon-cyan cyber-border shadow-cyber-cyan">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-cyber-off-white neon-glow">
            <div className="p-2 bg-cyber-dark-gray border border-neon-cyan cyber-border">
              <Plus className="h-5 w-5 text-neon-cyan neon-glow-cyan" />
            </div>
            New Proposal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="proposal-input" className="text-cyber-off-white font-medium">
              Description
            </Label>
            <Input
              id="proposal-input"
              placeholder="Enter your proposal description..."
              value={newProposal}
              onChange={(e) => onProposalChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !creatingProposal && onCreateProposal()}
              disabled={creatingProposal}
              className="bg-cyber-dark-gray border-neon-cyan/50 text-cyber-off-white placeholder:text-cyber-medium-gray focus:border-neon-cyan focus:ring-neon-cyan/20 cyber-border h-12"
            />
          </div>
          <Button
            onClick={onCreateProposal}
            disabled={!newProposal.trim() || creatingProposal}
            title="Submit your proposal for community voting"
            className="bg-neon-cyan hover:bg-neon-cyan-dark text-cyber-black font-medium px-8 py-3 cyber-border shadow-cyber-cyan transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-12"
          >
            {creatingProposal ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Vote className="h-4 w-4 mr-2" />
                Submit Proposal
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
