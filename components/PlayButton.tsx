"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Global audio manager to ensure only one track plays at a time
let globalAudio: HTMLAudioElement | null = null
let globalPlayButton: (() => void) | null = null

interface PlayButtonProps {
  previewUrl: string | null | undefined
  trackName: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "ghost" | "outline"
  className?: string
}

export function PlayButton({ 
  previewUrl, 
  trackName, 
  size = "md",
  variant = "ghost",
  className 
}: PlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentUrlRef = useRef<string | null>(null)
  const stopCallbackRef = useRef<(() => void) | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (globalPlayButton === stopCallbackRef.current) {
        globalAudio = null
        globalPlayButton = null
      }
    }
  }, [])

  // Stop playing when previewUrl changes
  useEffect(() => {
    if (audioRef.current && currentUrlRef.current !== previewUrl) {
      audioRef.current.pause()
      setIsPlaying(false)
      audioRef.current = null
      currentUrlRef.current = null
    }
    if (globalPlayButton === stopCallbackRef.current && currentUrlRef.current !== previewUrl) {
      globalAudio = null
      globalPlayButton = null
    }
  }, [previewUrl])

  // Stop callback function
  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  stopCallbackRef.current = stopPlaying

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click when clicking play button

    console.log('[PlayButton] handlePlay called', { 
      trackName, 
      previewUrl, 
      isPlaying, 
      isLoading,
      hasAudioRef: !!audioRef.current,
      currentUrl: currentUrlRef.current
    })

    if (!previewUrl) {
      console.log('[PlayButton] No previewUrl, returning early')
      return
    }

    // Stop any currently playing audio from other PlayButtons
    if (globalAudio && globalPlayButton && globalPlayButton !== stopPlaying) {
      console.log('[PlayButton] Stopping other audio')
      globalAudio.pause()
      globalAudio.currentTime = 0
      globalPlayButton()
    }

    // Initialize audio if needed or if URL changed
    if (!audioRef.current || currentUrlRef.current !== previewUrl) {
      console.log('[PlayButton] Creating new audio element', { 
        hasCurrentAudio: !!audioRef.current,
        currentUrl: currentUrlRef.current,
        newUrl: previewUrl 
      })
      
      if (audioRef.current) {
        console.log('[PlayButton] Cleaning up old audio')
        audioRef.current.pause()
        audioRef.current = null
        currentUrlRef.current = null
      }
      
      const audio = new Audio(previewUrl)
      audio.preload = 'none'
      currentUrlRef.current = previewUrl
      
      console.log('[PlayButton] Audio element created', { 
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState 
      })
      
      audio.addEventListener('loadeddata', () => {
        console.log('[PlayButton] Audio loadeddata event', { trackName })
      })
      
      audio.addEventListener('canplay', () => {
        console.log('[PlayButton] Audio canplay event', { trackName })
      })
      
      audio.addEventListener('ended', () => {
        console.log('[PlayButton] Audio ended', { trackName })
        setIsPlaying(false)
        if (globalAudio === audio) {
          globalAudio = null
          globalPlayButton = null
        }
      })
      
      audio.addEventListener('pause', () => {
        console.log('[PlayButton] Audio pause event', { trackName })
        setIsPlaying(false)
      })
      
      audio.addEventListener('play', () => {
        console.log('[PlayButton] Audio play event', { trackName })
        setIsPlaying(true)
        setIsLoading(false)
      })
      
      audio.addEventListener('error', (e) => {
        console.error('[PlayButton] Audio error event', { 
          trackName, 
          error: e,
          errorCode: audio.error?.code,
          errorMessage: audio.error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState
        })
        setIsLoading(false)
        setIsPlaying(false)
        if (globalAudio === audio) {
          globalAudio = null
          globalPlayButton = null
        }
      })

      audioRef.current = audio
    }

    if (isPlaying) {
      // Pause
      console.log('[PlayButton] Pausing audio', { trackName })
      audioRef.current.pause()
      setIsPlaying(false)
      if (globalAudio === audioRef.current) {
        globalAudio = null
        globalPlayButton = null
      }
    } else {
      // Play
      console.log('[PlayButton] Attempting to play audio', { 
        trackName,
        audioSrc: audioRef.current?.src,
        readyState: audioRef.current?.readyState,
        networkState: audioRef.current?.networkState
      })
      setIsLoading(true)
      try {
        globalAudio = audioRef.current
        globalPlayButton = stopPlaying
        console.log('[PlayButton] Calling play()', { trackName })
        await audioRef.current.play()
        console.log('[PlayButton] play() succeeded', { trackName })
        setIsPlaying(true)
        setIsLoading(false)
      } catch (error) {
        console.error('[PlayButton] play() failed', { 
          trackName, 
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          audioSrc: audioRef.current?.src,
          readyState: audioRef.current?.readyState,
          networkState: audioRef.current?.networkState
        })
        setIsLoading(false)
        setIsPlaying(false)
        if (globalAudio === audioRef.current) {
          globalAudio = null
          globalPlayButton = null
        }
      }
    }
  }

  useEffect(() => {
    console.log('[PlayButton] Component rendered/updated', {
      trackName,
      previewUrl,
      isPlaying,
      isLoading,
      hasAudioRef: !!audioRef.current
    })
  }, [trackName, previewUrl, isPlaying, isLoading])

  if (!previewUrl) {
    console.log('[PlayButton] Rendering disabled button (no previewUrl)', { trackName })
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={cn("opacity-50 cursor-not-allowed", className)}
        title="Preview not available"
      >
        <Volume2 className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
      </Button>
    )
  }

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11"
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handlePlay}
        disabled={isLoading}
        className={cn(sizeClasses[size], className)}
        title={isPlaying ? `Pause ${trackName}` : `Play ${trackName}`}
        aria-label={isPlaying ? `Pause ${trackName}` : `Play ${trackName}`}
      >
        {isLoading ? (
          <div className={cn(iconSizes[size], "animate-spin")}>
            <div className="h-full w-full border-2 border-current border-t-transparent rounded-full" />
          </div>
        ) : isPlaying ? (
          <Pause className={iconSizes[size]} fill="currentColor" />
        ) : (
          <Play className={iconSizes[size]} fill="currentColor" />
        )}
      </Button>
    </>
  )
}
