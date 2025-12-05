"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Star, StarOff, Loader2, X } from "lucide-react"
import Link from "next/link"

export default function TrackedArtistsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [trackedArtists, setTrackedArtists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [untrackingId, setUntrackingId] = useState<string | null>(null)

  useEffect(() => {
    loadTrackedArtists()
  }, [])

  async function loadTrackedArtists() {
    setLoading(true)
    try {
      const response = await fetch('/api/tracked-artists')
      if (response.ok) {
        const data = await response.json()
        setTrackedArtists(data.trackedArtists || [])
      }
    } catch (error) {
      console.error('Failed to load tracked artists:', error)
    } finally {
      setLoading(false)
    }
  }

  async function searchArtists() {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.artists || [])
      }
    } catch (error) {
      console.error('Failed to search artists:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function trackArtist(artistId: string) {
    setTrackingId(artistId)
    try {
      const response = await fetch('/api/tracked-artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to track artist')
      }

      await loadTrackedArtists()
      setSearchQuery("")
      setSearchResults([])
    } catch (error: any) {
      console.error('Failed to track artist:', error)
      alert(error.message || 'Failed to track artist. Please try again.')
    } finally {
      setTrackingId(null)
    }
  }

  async function untrackArtist(artistId: string) {
    setUntrackingId(artistId)
    try {
      const response = await fetch(`/api/tracked-artists/${artistId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      })

      if (!response.ok) {
        throw new Error('Failed to untrack artist')
      }

      await loadTrackedArtists()
    } catch (error) {
      console.error('Failed to untrack artist:', error)
      alert('Failed to untrack artist. Please try again.')
    } finally {
      setUntrackingId(null)
    }
  }

  const isTracked = (artistId: string) => {
    return trackedArtists.some(ta => ta.artistId === artistId)
  }

  return (
    <div>
      <div className="mb-8">
        <Typography variant="h1">Tracked Artists</Typography>
        <Typography variant="subtitle" className="mt-2">
          Manage artists from your label that you want to monitor
        </Typography>
      </div>

      <div className="space-y-6">
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Artists to Track</CardTitle>
            <CardDescription>
              Search for artists to add to your tracked list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search for artists..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (e.target.value.length >= 2) {
                        searchArtists()
                      } else {
                        setSearchResults([])
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.length >= 2) {
                        searchArtists()
                      }
                    }}
                    className="pl-9"
                  />
                </div>
                <Button onClick={searchArtists} disabled={searching || searchQuery.length < 2}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {searchQuery && searchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground">
                  Enter at least 2 characters to search
                </p>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Search Results</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("")
                        setSearchResults([])
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {searchResults.map((artist) => {
                    const alreadyTracked = isTracked(artist.id)
                    return (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {artist.imageUrl && (
                            <img
                              src={artist.imageUrl}
                              alt={artist.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{artist.name}</div>
                            {artist.genres && artist.genres.length > 0 && (
                              <div className="text-xs text-muted-foreground truncate">
                                {artist.genres.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant={alreadyTracked ? "outline" : "default"}
                          size="sm"
                          onClick={() => {
                            if (alreadyTracked) {
                              untrackArtist(artist.id)
                            } else {
                              trackArtist(artist.id)
                            }
                          }}
                          disabled={trackingId === artist.id || untrackingId === artist.id}
                          className="gap-1 shrink-0"
                        >
                          {trackingId === artist.id || untrackingId === artist.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : alreadyTracked ? (
                            <>
                              <StarOff className="h-3 w-3" />
                              Untrack
                            </>
                          ) : (
                            <>
                              <Star className="h-3 w-3" />
                              Track
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Currently Tracked Artists */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Currently Tracked Artists</CardTitle>
                <CardDescription>
                  {trackedArtists.length} artist{trackedArtists.length !== 1 ? 's' : ''} being tracked
                </CardDescription>
              </div>
              <Link href="/tracked-artists">
                <Button variant="outline" size="sm">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : trackedArtists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tracked artists yet</p>
                <p className="text-xs mt-1">Search above to add artists to track</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {trackedArtists.map((trackedArtist) => {
                  const artist = trackedArtist.artist
                  return (
                    <div
                      key={trackedArtist.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {artist?.imageUrl && (
                          <img
                            src={artist.imageUrl}
                            alt={artist.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{artist?.name || 'Unknown'}</div>
                          {trackedArtist.stats?.totalAppearances > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {trackedArtist.stats.totalAppearances} chart appearance{trackedArtist.stats.totalAppearances !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => untrackArtist(artist?.id)}
                        disabled={untrackingId === artist?.id}
                        className="gap-1 shrink-0 text-red-600 hover:text-red-700"
                      >
                        {untrackingId === artist?.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <StarOff className="h-3 w-3" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
