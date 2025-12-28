"use client"

import { useMemo } from "react"
import useZamaRelayerInstance from "./useZamaRelayerInstance"
import { 
  ZDAO_ADDRESS, 
  getDecryptCache, 
  setDecryptCache, 
  getDecryptCacheKey, 
  getDecryptMultipleCacheKey 
} from "@/lib/utils"
import { ethers } from "ethers"

type HandleContractPair = {
  handle: Uint8Array | string
  contractAddress: string
}

export function useFHEOperations(account?: string) {
  const relayerInstance = useZamaRelayerInstance()

  const isInitialized = !!relayerInstance
  const isLoading = !relayerInstance

  const encrypt = useMemo(() => {
    if (!relayerInstance || !account) return undefined

    return async (value: number): Promise<{ encryptedValue: string; proof: string }> => {
      if (!relayerInstance || !account) {
        throw new Error("FHE not initialized or account not connected")
      }

      const buffer = await relayerInstance.createEncryptedInput(ZDAO_ADDRESS, account)

      if (typeof buffer.add8 === "function") {
        buffer.add8(value)
      } else if (typeof buffer.add16 === "function") {
        buffer.add16(value)
      } else {
        throw new Error("No suitable add method found on buffer")
      }

      const ciphertexts = await buffer.encrypt()

      const handleArray = Array.from(ciphertexts.handles[0]) as number[]
      const encryptedValue = "0x" + handleArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")

      const proofArray = Array.from(ciphertexts.inputProof) as number[]
      const proof = "0x" + proofArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")

      return { encryptedValue, proof }
    }
  }, [relayerInstance, account])

  const publicDecrypt = useMemo(() => {
    if (!relayerInstance) return undefined

    return async (encryptedValue: string): Promise<{ value: number; proof: string }> => {
      if (!relayerInstance) {
        throw new Error("FHE not initialized")
      }

      if (!encryptedValue.startsWith("0x")) {
        throw new Error("Encrypted value must be a hex string starting with 0x")
      }

      const cacheKey = getDecryptCacheKey(encryptedValue)
      const cached = getDecryptCache<{ value: number; proof: string }>(cacheKey)
      if (cached) {
        return cached
      }

      const handles = [encryptedValue]
      const result = await relayerInstance.publicDecrypt(handles)

      // Handle both v0.8 format (Record<string, any>) and v0.9 format ({ values, proof })
      let decryptedValue: any
      let proof = ""

      if ("values" in result && "proof" in result) {
        // v0.9 format: { values: Record<string, any>, proof: string }
        decryptedValue = (result as { values: Record<string, any>; proof: string }).values[encryptedValue]
        proof = (result as { values: Record<string, any>; proof: string }).proof
      } else {
        // v0.8 format: Record<string, any> (backward compatibility)
        decryptedValue = (result as Record<string, any>)[encryptedValue]
        proof = "0x" // Empty proof for v0.8
      }

      if (decryptedValue === undefined) {
        throw new Error("No decrypted value found for the given handle")
      }

      const numericValue = typeof decryptedValue === "bigint" ? Number(decryptedValue) : Number(decryptedValue)

      if (!proof) {
        proof = "0x"
      }

      const decryptResult = {
        value: numericValue,
        proof: proof,
      }

      setDecryptCache(cacheKey, decryptResult)

      return decryptResult
    }
  }, [relayerInstance])

  const publicDecryptMultiple = useMemo(() => {
    if (!relayerInstance) return undefined

    return async (
      encryptedValues: string[],
    ): Promise<{
      abiEncodedClearValues: string
      decryptionProof: string
      clearValues: Record<string, number>
    }> => {
      if (!relayerInstance) {
        throw new Error("FHE not initialized")
      }

      for (const value of encryptedValues) {
        if (!value.startsWith("0x")) {
          throw new Error("All encrypted values must be hex strings starting with 0x")
        }
      }

      const cacheKey = getDecryptMultipleCacheKey(encryptedValues)
      const cached = getDecryptCache<{
        abiEncodedClearValues: string
        decryptionProof: string
        clearValues: Record<string, number>
      }>(cacheKey)
      if (cached) {
        return cached
      }

      const result = await relayerInstance.publicDecrypt(encryptedValues)

      const resultKeys = Object.keys(result || {})
      const hasClearValuesFormat = resultKeys.includes("clearValues") && 
                                   resultKeys.includes("abiEncodedClearValues") && 
                                   resultKeys.includes("decryptionProof")
      
      if (hasClearValuesFormat) {
        const directResult = result as {
          clearValues: Record<string, any>
          abiEncodedClearValues: string
          decryptionProof: string
        }

        const clearValues: Record<string, number> = {}
        for (const handle of encryptedValues) {
          const decryptedValue = directResult.clearValues?.[handle]
          if (decryptedValue === undefined || decryptedValue === null) {
            throw new Error(`No decrypted value found for handle: ${handle}`)
          }
          clearValues[handle] = typeof decryptedValue === "bigint" ? Number(decryptedValue) : Number(decryptedValue)
        }

        const decryptResult = {
          abiEncodedClearValues: directResult.abiEncodedClearValues,
          decryptionProof: directResult.decryptionProof,
          clearValues,
        }

        setDecryptCache(cacheKey, decryptResult)

        return decryptResult
      }
      else if ("values" in result && "proof" in result) {
        const v09Result = result as {
          values: Record<string, any>
          proof: string
          abiEncodedClearValues?: string
        }

        const clearValues: Record<string, number> = {}
        for (const handle of encryptedValues) {
          const decryptedValue = v09Result.values[handle]
          if (decryptedValue === undefined) {
            throw new Error(`No decrypted value found for handle: ${handle}`)
          }
          clearValues[handle] = typeof decryptedValue === "bigint" ? Number(decryptedValue) : Number(decryptedValue)
        }

        let abiEncodedClearValues: string
        if (v09Result.abiEncodedClearValues) {
          abiEncodedClearValues = v09Result.abiEncodedClearValues
        } else {
          const values = encryptedValues.map((handle) => clearValues[handle])
          abiEncodedClearValues = ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint8"], values)
        }

        const decryptResult = {
          abiEncodedClearValues,
          decryptionProof: v09Result.proof || "0x",
          clearValues,
        }

        setDecryptCache(cacheKey, decryptResult)

        return decryptResult
      } else if (typeof result === "object" && result !== null) {
        const resultKeys = Object.keys(result)
        const hasMatchingKeys = encryptedValues.some(handle => resultKeys.includes(handle))
        
        if (hasMatchingKeys) {
          const clearValues: Record<string, number> = {}
          for (const handle of encryptedValues) {
            const decryptedValue = (result as Record<string, any>)[handle]
            if (decryptedValue === undefined) {
              throw new Error(`No decrypted value found for handle: ${handle}`)
            }
            clearValues[handle] = typeof decryptedValue === "bigint" ? Number(decryptedValue) : Number(decryptedValue)
          }
          
          const values = encryptedValues.map((handle) => clearValues[handle])
          const abiEncodedClearValues = ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint8"], values)
          
          const decryptResult = {
            abiEncodedClearValues,
            decryptionProof: "0x",
            clearValues,
          }
          
          setDecryptCache(cacheKey, decryptResult)
          
          return decryptResult
        }
      }
      
      throw new Error(`Unsupported publicDecrypt result format. Result keys: ${Object.keys(result).join(", ")}`)
    }
  }, [relayerInstance])

  const userDecrypt = useMemo(() => {
    if (!relayerInstance || !account) return undefined

    return async (encryptedValue: string): Promise<number> => {
      if (!relayerInstance || !account) {
        throw new Error("FHE not initialized or account not connected")
      }

      const keypair = await relayerInstance.generateKeypair()

      const handleContractPairs = [
        {
          handle: encryptedValue,
          contractAddress: ZDAO_ADDRESS,
        },
      ]

      const startTimeStamp = Math.floor(Date.now() / 1000).toString()
      const durationDays = "10"
      const contractAddresses = [ZDAO_ADDRESS]

      const eip712 = await relayerInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      )

      // Get signer from window.ethereum
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      // Sign the EIP712 data
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      )

      const result = await relayerInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        signer.address,
        startTimeStamp,
        durationDays,
      )

      return Number((result as any)[encryptedValue])
    }
  }, [relayerInstance, account])

  const userDecryptMultiple = useMemo(() => {
    if (!relayerInstance || !account) return undefined

    return async (
      encryptedValues: string[],
    ): Promise<{
      clearValues: Record<string, number>
    }> => {
      if (!relayerInstance || !account) {
        throw new Error("FHE not initialized or account not connected")
      }

      if (encryptedValues.length === 0) {
        throw new Error("At least one encrypted value is required")
      }

      for (const value of encryptedValues) {
        if (!value.startsWith("0x")) {
          throw new Error("All encrypted values must be hex strings starting with 0x")
        }
      }

      const keypair = await relayerInstance.generateKeypair()

      const handleContractPairs: HandleContractPair[] = encryptedValues.map((encryptedValue) => ({
        handle: encryptedValue,
        contractAddress: ZDAO_ADDRESS,
      }))

      const startTimeStamp = Math.floor(Date.now() / 1000).toString()
      const durationDays = "10"
      const contractAddresses = [ZDAO_ADDRESS]

      const eip712 = await relayerInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      )

      // Get signer from window.ethereum
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      // Sign the EIP712 data
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      )

      const result = await relayerInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        signer.address,
        startTimeStamp,
        durationDays,
      )

      const clearValues: Record<string, number> = {}
      for (const handle of encryptedValues) {
        const decryptedValue = (result as any)[handle]
        if (decryptedValue === undefined) {
          throw new Error(`No decrypted value found for handle: ${handle}`)
        }
        clearValues[handle] = typeof decryptedValue === "bigint" ? Number(decryptedValue) : Number(decryptedValue)
      }

      return {
        clearValues,
      }
    }
  }, [relayerInstance, account])

  return {
    isInitialized,
    isLoading,
    error: !relayerInstance && typeof window !== "undefined" ? "FHE SDK not initialized" : null,
    encrypt,
    publicDecrypt,
    publicDecryptMultiple,
    userDecrypt,
    userDecryptMultiple,
    instance: relayerInstance,
  }
}
