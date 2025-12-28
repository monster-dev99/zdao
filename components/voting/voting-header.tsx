"use client"

import { Users, Vote, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WalletConnect } from "@/components/wallet"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface VotingHeaderProps {
  isConnected: boolean
  isCorrectNetwork: boolean
  networkName: string | null
  totalVotes: number
  totalProposals: number
  fheStatus: {
    loading: boolean
    error: string | null
    initialized: boolean
    sdkAvailable: boolean
  }
  switchToSepolia: () => void
}

export function VotingHeader({
  isConnected,
  isCorrectNetwork,
  networkName,
  totalVotes,
  totalProposals,
  fheStatus,
  switchToSepolia,
}: VotingHeaderProps) {
  if (!isConnected) {
    return (
      <header className="sticky top-0 bg-cyber-gray/90 backdrop-blur-xl border-b border-neon-cyan cyber-border z-10">
        <div className="w-full mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1" />
            <div className="flex-shrink-0">
              <WalletConnect compact={true} />
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="sticky top-0 bg-cyber-gray/90 backdrop-blur-xl border-b border-neon-cyan cyber-border z-10">
        <div className="w-full mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
              <SidebarTrigger className="text-cyber-medium-gray hover:text-neon-cyan hover:bg-cyber-dark-gray cyber-border flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-shrink-0">
              {/* FHE Loading Indicator */}
              {fheStatus.loading && (
                <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1 bg-cyber-dark-gray border border-neon-cyan cyber-border">
                  <Loader2 className="h-3 w-3 animate-spin text-neon-cyan neon-glow-cyan" />
                  <span className="text-xs text-neon-cyan neon-glow-cyan">Loading FHE...</span>
                </div>
              )}
              {fheStatus.error && (
                <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1 bg-cyber-dark-gray border border-destructive cyber-border">
                  <XCircle className="h-3 w-3 text-destructive" />
                  <span className="text-xs text-destructive">FHE Error</span>
                </div>
              )}
              <div className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm text-cyber-medium-gray">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{totalVotes} votes</span>
                </div>
                <div className="flex items-center gap-1">
                  <Vote className="h-4 w-4" />
                  <span>{totalProposals} proposals</span>
                </div>
              </div>

              {/* Network Status */}
              {isCorrectNetwork ? (
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-cyber-dark-gray border border-neon-cyan cyber-border">
                  <div className="w-2 h-2 bg-neon-cyan"></div>
                  <span className="text-xs text-neon-cyan neon-glow-cyan font-medium">{networkName || "Unknown"}</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-cyber-dark-gray border border-destructive cyber-border">
                    <div className="w-2 h-2 bg-destructive"></div>
                    <span className="text-xs text-destructive font-medium">Wrong Network</span>
                  </div>
                  <Button
                    onClick={switchToSepolia}
                    size="sm"
                    className="bg-neon-cyan text-cyber-black hover:bg-neon-cyan-dark font-medium cyber-border"
                  >
                    Switch
                  </Button>
                </div>
              )}

              <div className="flex-shrink-0">
                <WalletConnect />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Network Warning Banner */}
      {!isCorrectNetwork && (
        <div className="bg-cyber-dark-gray/95 backdrop-blur-xl border-b border-destructive cyber-border">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-destructive animate-pulse"></div>
                <span className="text-cyber-off-white font-medium">
                  Wrong Network: This app only supports {networkName || "Unknown"} network
                </span>
              </div>
              <Button
                onClick={switchToSepolia}
                size="sm"
                className="bg-neon-cyan text-cyber-black hover:bg-neon-cyan-dark font-medium cyber-border"
              >
                Switch to Sepolia
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
