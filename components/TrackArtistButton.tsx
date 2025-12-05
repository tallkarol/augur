"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Star, StarOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrackArtistButtonProps {
  artistId: string
  artistName?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  onTrackChange?: (isTracked: boolean) => void
  isTracked?: boolean // If provided, skip API call and use this value
}

export function TrackArtistButton({
  artistId,
  artistName,
  variant = "outline",
  size = "sm",
  className,
  onTrackChange,
  isTracked: isTrackedProp,
}: TrackArtistButtonProps) {
  const [isTracked, setIsTracked] = useState(isTrackedProp ?? false)
  const [loading, setLoading] = useState(isTrackedProp === undefined)
  const [toggling, setToggling] = useState(false)

  // Update local state when prop changes
  useEffect(() => {
    if (isTrackedProp !== undefined) {
      setIsTracked(isTrackedProp)
      setLoading(false)
    }
  }, [isTrackedProp])

  useEffect(() => {
    // Only fetch if prop is not provided
    if (isTrackedProp === undefined) {
      checkTrackedStatus()
    }
  }, [artistId, isTrackedProp])

  async function checkTrackedStatus() {
    if (!artistId) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/tracked-artists')
      if (response.ok) {
        const data = await response.json()
        const tracked = (data.trackedArtists || []).some(
          (ta: any) => ta.artistId === artistId
        )
        setIsTracked(tracked)
      }
    } catch (error) {
      console.error('Failed to check tracked status:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleTrack() {
    if (!artistId || toggling) return

    setToggling(true)
    try {
      if (isTracked) {
        // Untrack
        const response = await fetch(`/api/tracked-artists/${artistId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete' }),
        })

        if (response.ok) {
          const newValue = false
          setIsTracked(newValue)
          onTrackChange?.(newValue)
        } else {
          throw new Error('Failed to untrack artist')
        }
      } else {
        // Track
        const response = await fetch('/api/tracked-artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistId }),
        })

        if (response.ok) {
          const newValue = true
          setIsTracked(newValue)
          onTrackChange?.(newValue)
        } else {
          const error = await response.json()
          throw new Error(error.error || 'Failed to track artist')
        }
      }
    } catch (error: any) {
      console.error('Failed to toggle track:', error)
      alert(error.message || 'Failed to update tracking status')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={cn("gap-1", className)}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTrack}
      disabled={toggling}
      className={cn("gap-1", className)}
      title={
        isTracked
          ? `Stop tracking ${artistName || 'this artist'}`
          : `Track ${artistName || 'this artist'}`
      }
    >
      {toggling ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isTracked ? (
        <>
          <StarOff className="h-3 w-3" />
          {size !== "icon" && "Untrack"}
        </>
      ) : (
        <>
          <Star className="h-3 w-3" />
          {size !== "icon" && "Track"}
        </>
      )}
    </Button>
  )
}
