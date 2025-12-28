import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const VOTE_OPTIONS = {
  YES: 0,
  NO: 1,
} as const

export const handleFHEError = (error: any): string => {
  if (error?.message?.includes("getCoprocessorSigners")) {
    return "Network does not support FHE. Please connect to Sepolia testnet."
  }

  if (error?.message?.includes("Zama SDK can only be loaded on client side")) {
    return "FHE SDK is not available on server side. Please try again."
  }

  if (error?.message?.includes("Failed to load Zama SDK from CDN")) {
    return "Failed to load FHE SDK from CDN. Please check your internet connection."
  }

  return error?.message || "Unknown FHE error occurred"
}

export const validateVoteValue = (value: number): boolean => {
  return value === VOTE_OPTIONS.YES || value === VOTE_OPTIONS.NO
}

export const getVoteOptionLabel = (value: number): string => {
  switch (value) {
    case VOTE_OPTIONS.YES:
      return "Yes"
    case VOTE_OPTIONS.NO:
      return "No"
    default:
      return "Unknown"
  }
}

const CACHE_PREFIX = "decrypt_cache_"
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
  value: T
  timestamp: number
}

export const getDecryptCacheKey = (encryptedValue: string): string => {
  return `${CACHE_PREFIX}${encryptedValue}`
}

export const getDecryptMultipleCacheKey = (encryptedValues: string[]): string => {
  const sorted = [...encryptedValues].sort().join(",")
  return `${CACHE_PREFIX}multiple_${sorted}`
}

export const getDecryptCache = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null

  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const entry: CacheEntry<T> = JSON.parse(cached)
    const now = Date.now()

    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key)
      return null
    }

    return entry.value
  } catch (error) {
    return null
  }
}

export const setDecryptCache = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return

  try {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    try {
      clearExpiredDecryptCache()
      localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }))
    } catch (retryError) {
    }
  }
}

export const clearExpiredDecryptCache = (): void => {
  if (typeof window === "undefined") return

  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()

    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const entry: CacheEntry<any> = JSON.parse(cached)
            if (now - entry.timestamp > CACHE_EXPIRY_MS) {
              localStorage.removeItem(key)
            }
          }
        } catch (error) {
          localStorage.removeItem(key)
        }
      }
    }
  } catch (error) {
  }
}

export const clearAllDecryptCache = (): void => {
  if (typeof window === "undefined") return

  try {
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  } catch (error) {
  }
}

export const ZDAO_ADDRESS =
  (process.env.NEXT_PUBLIC_ZDAO_ADDRESS as `0x${string}`) || "0xC6831B0F3a4F745F5875137a57a37585BCF31F20"

export const ZDAO_ABI = [
  {
    inputs: [],
    name: "AlreadyVoted",
    type: "error",
  },
  {
    inputs: [],
    name: "FHEPermissionDenied",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidProposal",
    type: "error",
  },
  {
    inputs: [],
    name: "NotVoted",
    type: "error",
  },
  {
    inputs: [],
    name: "VoteCountsAlreadyPublic",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "description",
        type: "string",
      },
    ],
    name: "ProposalCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "VoteCountsMadePublic",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "voter",
        type: "address",
      },
    ],
    name: "Voted",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "description",
        type: "string",
      },
    ],
    name: "createProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "getEncryptedVoteCount",
    outputs: [
      {
        internalType: "euint8",
        name: "yes",
        type: "bytes32",
      },
      {
        internalType: "euint8",
        name: "no",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "getMyVote",
    outputs: [
      {
        internalType: "euint8",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "getPublicVoteCounts",
    outputs: [
      {
        internalType: "uint8",
        name: "yesCount",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "noCount",
        type: "uint8",
      },
      {
        internalType: "bool",
        name: "isPublic",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "hasAnyVotes",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "voter",
        type: "address",
      },
    ],
    name: "hasUserVoted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "isProposalOwner",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
    ],
    name: "makeVoteCountsPublic",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "proposalCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "proposals",
    outputs: [
      {
        internalType: "string",
        name: "description",
        type: "string",
      },
      {
        internalType: "euint8",
        name: "yesCount",
        type: "bytes32",
      },
      {
        internalType: "euint8",
        name: "noCount",
        type: "bytes32",
      },
      {
        internalType: "bool",
        name: "isPublic",
        type: "bool",
      },
      {
        internalType: "uint8",
        name: "publicYesCount",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "publicNoCount",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "abiEncodedClearVoteCounts",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "decryptionProof",
        type: "bytes",
      },
    ],
    name: "submitDecryptedVoteCounts",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "proposalId",
        type: "uint256",
      },
      {
        internalType: "externalEuint8",
        name: "encryptedVote",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "proof",
        type: "bytes",
      },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const
