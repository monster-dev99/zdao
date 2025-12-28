export interface UserVote {
  proposalId: number
  vote: "yes" | "no" | "unknown" | "error"
  votedAt: Date
}

export interface Proposal {
  id: number
  description: string
  isPublic: boolean
  yesCount: number
  noCount: number
}

export interface FHEStatus {
  initialized: boolean
  loading: boolean
  error: string | null
  sdkAvailable: boolean
}
