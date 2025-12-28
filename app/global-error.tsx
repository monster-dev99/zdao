"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-cyber-black flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-neon-cyan neon-glow-cyan mb-4">Something went wrong!</h2>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-neon-cyan text-cyber-black border border-neon-cyan"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
