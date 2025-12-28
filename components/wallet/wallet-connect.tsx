"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useWeb3 } from "@/hooks/useWeb3"
import { Wallet, LogOut, AlertCircle, Loader2 } from "lucide-react"

interface WalletConnectProps {
  compact?: boolean
}

export function WalletConnect({ compact = false }: WalletConnectProps = {}) {
  const { account, isConnected, isConnecting, chainId, connectWallet, disconnectWallet } = useWeb3()

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return "Ethereum"
      case 5:
        return "Goerli"
      case 11155111:
        return "Sepolia"
      case 8009:
        return "Zama Devnet"
      default:
        return `Chain ${chainId}`
    }
  }

  if (!isConnected) {
    if (compact) {
      return (
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-neon-cyan hover:bg-neon-cyan-dark text-cyber-black font-medium px-3 sm:px-4 py-2 cyber-border shadow-cyber-cyan transition-all duration-200 text-xs sm:text-sm"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
              <span className="hidden sm:inline">Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </>
          )}
        </Button>
      )
    }
    
    return (
      <Card className="bg-cyber-gray/40 backdrop-blur-xl border-neon-cyan/30 cyber-border">
        <CardContent className="p-6 text-center">
          <div className="p-4 bg-cyber-dark-gray border border-neon-cyan cyber-border w-fit mx-auto mb-4">
            <Wallet className="h-8 w-8 text-neon-cyan neon-glow-cyan" />
          </div>
          <h3 className="text-cyber-off-white text-lg font-semibold mb-2 neon-glow">Connect Your Wallet</h3>
          <p className="text-cyber-medium-gray mb-6">Connect your wallet to create proposals and vote on the blockchain</p>
          <Button
            onClick={connectWallet}
            disabled={isConnecting}
            className="bg-neon-cyan hover:bg-neon-cyan-dark text-cyber-black font-medium px-8 py-3 cyber-border shadow-cyber-cyan transition-all duration-200"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-2 h-2 bg-neon-cyan animate-pulse flex-shrink-0"></div>
        <div className="text-xs sm:text-sm min-w-0">
          <div className="text-cyber-off-white font-medium neon-glow truncate">{formatAddress(account!)}</div>
          <div className="text-cyber-medium-gray text-xs hidden sm:block">{chainId && getChainName(chainId)}</div>
        </div>
      </div>

      {chainId !== 11155111 && (
        <Badge variant="destructive" className="text-xs cyber-border hidden sm:flex">
          <AlertCircle className="h-3 w-3 mr-1" />
          Wrong Network
        </Badge>
      )}

      <Button
        onClick={disconnectWallet}
        variant="ghost"
        size="sm"
        className="text-cyber-medium-gray hover:text-neon-cyan hover:bg-cyber-dark-gray cyber-border flex-shrink-0"
        title="Disconnect Wallet"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
