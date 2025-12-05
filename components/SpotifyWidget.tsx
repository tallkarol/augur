"use client"

import { useEffect, useRef, useState } from "react"

interface SpotifyWidgetProps {
  spotifyTrackId: string | null | undefined
  trackName: string
  width?: string | number
  height?: string | number
  compact?: boolean
  className?: string
}

export function SpotifyWidget({ 
  spotifyTrackId, 
  trackName,
  width = "100%",
  height = 152,
  compact = false,
  className = ""
}: SpotifyWidgetProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!spotifyTrackId || !containerRef.current) return

    // Clear previous content
    containerRef.current.innerHTML = ""

    // Create iframe for Spotify embed
    const iframe = document.createElement("iframe")
    iframe.src = `https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator${compact ? '&theme=0&t=0&utm_medium=referral' : ''}`
    iframe.width = typeof width === 'number' ? `${width}` : width
    iframe.height = typeof height === 'number' ? `${height}` : height
    iframe.frameBorder = "0"
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    iframe.loading = "lazy"
    iframe.style.borderRadius = "12px"
    
    iframe.onload = () => {
      setIsLoaded(true)
    }

    containerRef.current.appendChild(iframe)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [spotifyTrackId, width, height, compact])

  if (!spotifyTrackId) {
    return (
      <div className={`flex items-center justify-center p-4 border border-dashed rounded-lg text-muted-foreground ${className}`}>
        <div className="text-sm text-center">
          <p>Spotify preview not available</p>
          <p className="text-xs mt-1">{trackName}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={className} />
  )
}
