"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { useState } from "react"

interface EnrichButtonProps {
  type: "artist" | "track"
  ids: string[]
  onComplete?: (results: any[]) => void
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
}

export function EnrichButton({
  type,
  ids,
  onComplete,
  variant = "outline",
  size = "default",
  children,
}: EnrichButtonProps) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleEnrich = async () => {
    if (ids.length === 0) {
      alert('No items selected for enrichment')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/spotify/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          ids,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Enrichment failed')
      }

      const data = await response.json()
      setResults(data.results || [])

      const successCount = data.results?.filter((r: any) => r.success).length || 0
      const failCount = data.results?.length - successCount
      const failedResults = data.results?.filter((r: any) => !r.success) || []

      if (onComplete) {
        onComplete(data.results)
      } else {
        let message = `Enrichment complete: ${successCount} succeeded, ${failCount} failed`
        
        // Show detailed errors if any failed
        if (failCount > 0 && failedResults.length > 0) {
          const firstError = failedResults[0]
          const errorMsg = firstError.error || 'Unknown error'
          message += `\n\nFirst error: ${errorMsg}`
          
          // Check if it's a schema migration issue
          if (errorMsg.includes('Unknown argument') || errorMsg.includes('P2009')) {
            message += '\n\n⚠️ Database schema needs to be migrated. Run: npx prisma db push'
          }
        }
        
        alert(message)
      }

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Enrichment error:', error)
      alert(`Failed to enrich data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleEnrich}
      disabled={loading || ids.length === 0}
      variant={variant}
      size={size}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enriching...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          {children || `Enrich ${ids.length} ${type}${ids.length !== 1 ? 's' : ''}`}
        </>
      )}
    </Button>
  )
}
