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

  const checkingRef = useRef(false)

  const checkConnection = useCallback(async () => {
    if (checkingRef.current) {
      return
    }

    if (getIsConnected()) {
      return
    }

    checkingRef.current = true
    
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })

        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: "eth_chainId" })
          const currentChainId = Number.parseInt(chainId, 16)

          setAccount(accounts[0])
          setChainId(currentChainId)

          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          const contractInstance = new ethers.Contract(ZDAO_ADDRESS, ZDAO_ABI, signer)

          const contractCode = await provider.getCode(ZDAO_ADDRESS)

          if (contractCode === "0x") {
            checkingRef.current = false
            return
          }

          setContract(contractInstance)
          setIsConnected(true)
        }
      } catch (error: any) {
        if (error?.code === 4001) {
        } else {
        }
      } finally {
        checkingRef.current = false
      }
    } else {
      checkingRef.current = false
    }
  }, [])

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask!")
      return
    }

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
    } catch (error: any) {
      if (error?.code === 4001) {
      } else {
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
          alert("Failed to add Sepolia network to MetaMask")
        }
      } else {
        alert("Failed to switch to Sepolia network")
      }
    }
  }, [])

  useEffect(() => {
    if (getHasAttemptedAutoConnect()) return
    if (getIsConnected()) return

    const init = async () => {
      setHasAttemptedAutoConnect(true)
      await checkConnection()
    }
    
    const timer = setTimeout(init, 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return
    if (isConnected) return
    if (isConnecting) return
    if (!getHasAttemptedAutoConnect()) return

    const timer = setTimeout(() => {
      if (!getIsConnected() && !getIsConnecting() && !checkingRef.current) {
        checkConnection()
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [isConnected, isConnecting])

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          const newAccount = accounts[0]
          window.location.reload()
        }
      }

      const handleChainChanged = (chainId: string) => {
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

declare global {
  interface Window {
    ethereum?: any
  }
}
