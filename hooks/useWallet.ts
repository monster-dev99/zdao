"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { ethers } from "ethers"
import { ZDAO_ABI, ZDAO_ADDRESS } from "@/lib/utils"
import {
  getAccount,
  getIsConnected,
  getIsConnecting,
  getChainId,
  getContract,
  getHasAttemptedAutoConnect,
  setAccount,
  setIsConnected,
  setIsConnecting,
  setChainId,
  setContract,
  setHasAttemptedAutoConnect,
  subscribe,
} from "./web3State"

const SEPOLIA_CHAIN_ID = 11155111
const SEPOLIA_NETWORK_NAME = "Sepolia"
const SEPOLIA_RPC_URL = "https://g.w.lavanet.xyz:443/gateway/sep1/rpc-http/ac0a485e471079428fadfc1850f34a3d"

export function useWallet() {
  const [account, setAccountState] = useState(getAccount())
  const [isConnected, setIsConnectedState] = useState(getIsConnected())
  const [isConnecting, setIsConnectingState] = useState(getIsConnecting())
  const [chainId, setChainIdState] = useState(getChainId())
  const [contract, setContractState] = useState(getContract())

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setAccountState(getAccount())
      setIsConnectedState(getIsConnected())
      setIsConnectingState(getIsConnecting())
      setChainIdState(getChainId())
      setContractState(getContract())
    })
    return unsubscribe
  }, [])

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID
  const networkName = chainId ? (chainId === SEPOLIA_CHAIN_ID ? SEPOLIA_NETWORK_NAME : `Chain ID ${chainId}`) : null

  // Flag to prevent multiple simultaneous connection checks
  const checkingRef = useRef(false)

  const checkConnection = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (checkingRef.current) {
      return
    }

    // Skip if already connected
    if (getIsConnected()) {
      return
    }

    checkingRef.current = true
    console.log("Checking connection...")
    
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        console.log("Ethereum provider found, checking accounts...")
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        console.log("Available accounts:", accounts)

        if (accounts.length > 0) {
          console.log("Found connected account:", accounts[0])
          const chainId = await window.ethereum.request({ method: "eth_chainId" })
          const currentChainId = Number.parseInt(chainId, 16)
          console.log("Current chain ID:", currentChainId)

          setAccount(accounts[0])
          setChainId(currentChainId)

          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          const contractInstance = new ethers.Contract(ZDAO_ADDRESS, ZDAO_ABI, signer)

          const contractCode = await provider.getCode(ZDAO_ADDRESS)
          console.log("Contract code exists:", contractCode !== "0x")

          if (contractCode === "0x") {
            console.error("Contract not found at address:", ZDAO_ADDRESS)
            console.error("Please check contract deployment on network:", currentChainId)
            checkingRef.current = false
            return
          }

          setContract(contractInstance)
          setIsConnected(true)

          console.log("Wallet connected, waiting for FHE initialization before loading proposals")
        } else {
          console.log("No wallet connected, waiting for user to connect...")
        }
      } catch (error: any) {
        // Handle user rejection (4001) silently
        if (error?.code === 4001) {
          console.log("User rejected connection request")
        } else {
          console.error("Error checking connection:", error)
        }
      } finally {
        checkingRef.current = false
      }
    } else {
      console.log("Ethereum provider not available")
      checkingRef.current = false
    }
  }, [])

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask!")
      return
    }

    // Prevent multiple simultaneous connection attempts
    if (getIsConnecting()) {
      return
    }

    try {
      setIsConnecting(true)

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      const chainId = await window.ethereum.request({ method: "eth_chainId" })
      const currentChainId = Number.parseInt(chainId, 16)

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contractInstance = new ethers.Contract(ZDAO_ADDRESS, ZDAO_ABI, signer)

      setAccount(accounts[0])
      setChainId(currentChainId)
      setContract(contractInstance)
      setIsConnected(true)

      console.log("Wallet connected successfully:", {
        account: accounts[0],
        chainId: currentChainId,
        isConnected: true,
      })
    } catch (error: any) {
      // Handle user rejection gracefully
      if (error?.code === 4001) {
        console.log("User rejected connection request")
        // Don't show error for user rejection
      } else {
        console.error("Error connecting wallet:", error)
        alert("Failed to connect wallet. Please try again.")
      }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setIsConnected(false)
    setChainId(null)
    setContract(null)
    setHasAttemptedAutoConnect(false)
  }, [])

  const switchToSepolia = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask!")
      return
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: SEPOLIA_NETWORK_NAME,
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "SEP",
                  decimals: 18,
                },
                rpcUrls: [SEPOLIA_RPC_URL],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          })
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError)
          alert("Failed to add Sepolia network to MetaMask")
        }
      } else {
        console.error("Error switching to Sepolia network:", switchError)
        alert("Failed to switch to Sepolia network")
      }
    }
  }, [])

  // Initialize Web3 - only run once globally
  useEffect(() => {
    if (getHasAttemptedAutoConnect()) return
    if (getIsConnected()) return

    const init = async () => {
      console.log("Initializing Web3...")
      setHasAttemptedAutoConnect(true)
      await checkConnection()
    }
    
    // Small delay to ensure window.ethereum is available
    const timer = setTimeout(init, 500)
    return () => clearTimeout(timer)
  }, []) // Empty deps - only run once on mount

  // Auto-reconnect when ethereum becomes available (with debounce)
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return
    if (isConnected) return
    if (isConnecting) return
    if (!getHasAttemptedAutoConnect()) return // Wait for initial check

    // Debounce to prevent multiple rapid calls
    const timer = setTimeout(() => {
      if (!getIsConnected() && !getIsConnecting() && !checkingRef.current) {
        console.log("Ethereum available, checking for existing connection...")
        checkConnection()
      }
    }, 2000) // Wait 2 seconds before checking again

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isConnecting]) // checkConnection is stable, no need in deps

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log("Account changed:", accounts)
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          const newAccount = accounts[0]
          console.log("New account:", newAccount)
          window.location.reload()
        }
      }

      const handleChainChanged = (chainId: string) => {
        console.log("Chain changed:", chainId)
        setChainId(Number.parseInt(chainId, 16))
        window.location.reload()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [disconnectWallet])

  return {
    account,
    isConnected,
    isConnecting,
    chainId,
    isCorrectNetwork,
    networkName,
    contract,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any
  }
}
