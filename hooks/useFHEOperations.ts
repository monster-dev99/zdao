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

// Type definition for HandleContractPair (from @zama-fhe/relayer-sdk)
type HandleContractPair = {
  handle: Uint8Array | string
  contractAddress: string
}

/**
 * FHEVM v0.9 Hook - Direct FHE operations using relayer instance
 *
 * Pattern giống MegaPad: dùng useZamaRelayerInstance trực tiếp
 * thay vì wrapper phức tạp
 */
export function useFHEOperations(account?: string) {
  const relayerInstance = useZamaRelayerInstance()

  const isInitialized = !!relayerInstance
  const isLoading = !relayerInstance

  // Encrypt value for voting
  const encrypt = useMemo(() => {
    if (!relayerInstance || !account) return undefined

    return async (value: number): Promise<{ encryptedValue: string; proof: string }> => {
      if (!relayerInstance || !account) {
        throw new Error("FHE not initialized or account not connected")
      }

      // Create encrypted input buffer
      const buffer = await relayerInstance.createEncryptedInput(ZDAO_ADDRESS, account)

      // Add value to buffer (euint8 in contract)
      if (typeof buffer.add8 === "function") {
        buffer.add8(value)
      } else if (typeof buffer.add16 === "function") {
        buffer.add16(value)
      } else {
        throw new Error("No suitable add method found on buffer")
      }

      // Encrypt to get ciphertext handles
      const ciphertexts = await buffer.encrypt()

      // Extract encrypted value and proof
      const handleArray = Array.from(ciphertexts.handles[0]) as number[]
      const encryptedValue = "0x" + handleArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")

      const proofArray = Array.from(ciphertexts.inputProof) as number[]
      const proof = "0x" + proofArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")

      return { encryptedValue, proof }
    }
  }, [relayerInstance, account])

  // Public decrypt (FHEVM v0.9: returns { values, proof })
  const publicDecrypt = useMemo(() => {
    if (!relayerInstance) return undefined

    return async (encryptedValue: string): Promise<{ value: number; proof: string }> => {
      if (!relayerInstance) {
        throw new Error("FHE not initialized")
      }

      if (!encryptedValue.startsWith("0x")) {
        throw new Error("Encrypted value must be a hex string starting with 0x")
      }

      // Check cache first
      const cacheKey = getDecryptCacheKey(encryptedValue)
      const cached = getDecryptCache<{ value: number; proof: string }>(cacheKey)
      if (cached) {
        console.log("✅ Using cached decrypt result for:", encryptedValue)
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

      // Cache the result
      setDecryptCache(cacheKey, decryptResult)
      console.log("💾 Cached decrypt result for:", encryptedValue)

      return decryptResult
    }
  }, [relayerInstance])

  // Public decrypt multiple values (FHEVM v0.9: returns { abiEncodedClearValues, decryptionProof })
  // Following the HeadsOrTails pattern for multiple values
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

      // Validate all handles
      for (const value of encryptedValues) {
        if (!value.startsWith("0x")) {
          throw new Error("All encrypted values must be hex strings starting with 0x")
        }
      }

      // Check cache first
      const cacheKey = getDecryptMultipleCacheKey(encryptedValues)
      const cached = getDecryptCache<{
        abiEncodedClearValues: string
        decryptionProof: string
        clearValues: Record<string, number>
      }>(cacheKey)
      if (cached) {
        console.log("✅ Using cached decrypt result for multiple values:", encryptedValues)
        return cached
      }

      const result = await relayerInstance.publicDecrypt(encryptedValues)

      console.log("🔍 publicDecrypt result format:", {
        hasValues: "values" in result,
        hasProof: "proof" in result,
        hasClearValues: "clearValues" in result,
        hasAbiEncoded: "abiEncodedClearValues" in result,
        hasDecryptionProof: "decryptionProof" in result,
        resultKeys: Object.keys(result),
        resultType: typeof result,
        result: result
      })

      // Check for direct format: { clearValues, abiEncodedClearValues, decryptionProof }
      // This is the format returned by newer versions of the SDK
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

        console.log("✅ Using direct format with clearValues, abiEncodedClearValues, decryptionProof")
        console.log("clearValues keys:", Object.keys(directResult.clearValues || {}))
        console.log("encryptedValues:", encryptedValues)

        // Convert clearValues to numbers
        const clearValues: Record<string, number> = {}
        for (const handle of encryptedValues) {
          const decryptedValue = directResult.clearValues?.[handle]
          if (decryptedValue === undefined || decryptedValue === null) {
            console.warn(`⚠️ No decrypted value found for handle: ${handle}, available keys:`, Object.keys(directResult.clearValues || {}))
            throw new Error(`No decrypted value found for handle: ${handle}`)
          }
          clearValues[handle] = typeof decryptedValue === "bigint" ? Number(decryptedValue) : Number(decryptedValue)
        }

        const decryptResult = {
          abiEncodedClearValues: directResult.abiEncodedClearValues,
          decryptionProof: directResult.decryptionProof,
          clearValues,
        }

        // Cache the result
        setDecryptCache(cacheKey, decryptResult)
        console.log("💾 Cached decrypt result for multiple values (direct format):", encryptedValues)

        return decryptResult
      }
      // FHEVM v0.9 format: { values: Record<string, any>, proof: string, abiEncodedClearValues?: string }
      else if ("values" in result && "proof" in result) {
        const v09Result = result as {
          values: Record<string, any>
          proof: string
          abiEncodedClearValues?: string
        }

        console.log("✅ Using v0.9 format, values:", v09Result.values)

        // Extract clear values
        const clearValues: Record<string, number> = {}
        for (const handle of encryptedValues) {
          const decryptedValue = v09Result.values[handle]
          if (decryptedValue === undefined) {
            throw new Error(`No decrypted value found for handle: ${handle}`)
          }
          clearValues[handle] = typeof decryptedValue === "bigint" ? Number(decryptedValue) : Number(decryptedValue)
        }

        // If abiEncodedClearValues is provided, use it; otherwise encode manually
        let abiEncodedClearValues: string
        if (v09Result.abiEncodedClearValues) {
          abiEncodedClearValues = v09Result.abiEncodedClearValues
        } else {
          // Manually ABI encode the values in order
          // For uint8[], we encode as (uint8, uint8) tuple
          const values = encryptedValues.map((handle) => clearValues[handle])
          abiEncodedClearValues = ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint8"], values)
        }

        const decryptResult = {
          abiEncodedClearValues,
          decryptionProof: v09Result.proof || "0x",
          clearValues,
        }

        // Cache the result
        setDecryptCache(cacheKey, decryptResult)
        console.log("💾 Cached decrypt result for multiple values:", encryptedValues)

        return decryptResult
      } else if (typeof result === "object" && result !== null) {
        // Try to handle other formats - maybe it's a Record<string, any> directly (as per Zama docs)
        console.log("⚠️ Result doesn't have expected format, trying alternative formats")
        console.log("Result structure:", result)
        
        // Check if result is a Record where keys are the encrypted values (direct format from docs)
        const resultKeys = Object.keys(result)
        const hasMatchingKeys = encryptedValues.some(handle => resultKeys.includes(handle))
        
        if (hasMatchingKeys) {
          // Direct Record<string, any> format as per Zama documentation
          // { '0x...': value1, '0x...': value2 }
          console.log("✅ Using direct Record format (Zama docs format)")
          const clearValues: Record<string, number> = {}
          for (const handle of encryptedValues) {
            const decryptedValue = (result as Record<string, any>)[handle]
            if (decryptedValue === undefined) {
              throw new Error(`No decrypted value found for handle: ${handle}`)
            }
            clearValues[handle] = typeof decryptedValue === "bigint" ? Number(decryptedValue) : Number(decryptedValue)
          }
          
          // Manually ABI encode the values
          const values = encryptedValues.map((handle) => clearValues[handle])
          const abiEncodedClearValues = ethers.AbiCoder.defaultAbiCoder().encode(["uint8", "uint8"], values)
          
          const decryptResult = {
            abiEncodedClearValues,
            decryptionProof: "0x", // No proof available in this format - would need to get from relayer
            clearValues,
          }
          
          setDecryptCache(cacheKey, decryptResult)
          console.log("💾 Cached decrypt result for multiple values (direct Record format):", encryptedValues)
          
          return decryptResult
        }
      }
      
      // If we get here, we couldn't parse the result
      console.error("❌ Unsupported publicDecrypt result format:", result)
      throw new Error(`Unsupported publicDecrypt result format. Result keys: ${Object.keys(result).join(", ")}`)
    }
  }, [relayerInstance])

  // User decrypt (for user's own encrypted data) - single value
  const userDecrypt = useMemo(() => {
    if (!relayerInstance || !account) return undefined

    return async (encryptedValue: string): Promise<number> => {
      if (!relayerInstance || !account) {
        throw new Error("FHE not initialized or account not connected")
      }

      // Generate keypair for user
      const keypair = await relayerInstance.generateKeypair()

      // Prepare handle-contract pairs
      const handleContractPairs = [
        {
          handle: encryptedValue,
          contractAddress: ZDAO_ADDRESS,
        },
      ]

      // Prepare EIP712 signature data
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

      // Perform user decryption
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

  // User decrypt multiple values (batch decrypt for efficiency)
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

      // Validate all handles
      for (const value of encryptedValues) {
        if (!value.startsWith("0x")) {
          throw new Error("All encrypted values must be hex strings starting with 0x")
        }
      }

      // Generate keypair for user
      const keypair = await relayerInstance.generateKeypair()

      // Prepare handle-contract pairs for all encrypted values
      const handleContractPairs: HandleContractPair[] = encryptedValues.map((encryptedValue) => ({
        handle: encryptedValue,
        contractAddress: ZDAO_ADDRESS,
      }))

      // Prepare EIP712 signature data
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

      // Perform batch user decryption
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

      // Extract clear values
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
