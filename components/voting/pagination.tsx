"use client"

import { Button } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  indexOfFirstProposal: number
  indexOfLastProposal: number
  totalProposals: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  indexOfFirstProposal,
  indexOfLastProposal,
  totalProposals,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <>
      <div className="flex items-center justify-center gap-2 mt-8">
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

      <div className="text-center mt-4">
        <p className="text-cyber-medium-gray text-sm">
          Showing {indexOfFirstProposal + 1}-{Math.min(indexOfLastProposal, totalProposals)} of {totalProposals} proposals
        </p>
      </div>
    </>
  )
}
