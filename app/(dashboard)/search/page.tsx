"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/typography"
import { TrackModal } from "@/components/TrackModal"
import { Search, Users, Music, Loader2, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ artists: any[]; tracks: any[] }>({ artists: [], tracks: [] })
  const [loading, setLoading] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  
  // Debounce search query
  const [debouncedQuery, setDebouncedQuery] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery)
    } else {
      setResults({ artists: [], tracks: [] })
    }
  }, [debouncedQuery])

  async function performSearch(searchQuery: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Search error:', error)
      setResults({ artists: [], tracks: [] })
    } finally {
      setLoading(false)
    }
  }

  const hasResults = results.artists.length > 0 || results.tracks.length > 0
  const hasQuery = debouncedQuery.length >= 2

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Typography variant="h1">Search</Typography>
        <Typography variant="subtitle">
          Find artists and tracks with charting data
        </Typography>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for artists or tracks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 text-lg"
          autoFocus
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Results */}
      {hasQuery && !loading && (
        <>
          {hasResults ? (
            <div className="space-y-6">
              {/* Artists Results */}
              {results.artists.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <Typography variant="h2" className="text-lg">
                      Artists ({results.artists.length})
                    </Typography>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {results.artists.map((artist) => (
                      <Link key={artist.id} href={`/artists/${artist.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {artist.imageUrl && (
                                <img
                                  src={artist.imageUrl}
                                  alt={artist.name}
                                  className="w-12 h-12 rounded-full object-cover shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{artist.name}</div>
                                {artist.genres && artist.genres.length > 0 && (
                                  <div className="text-xs text-muted-foreground truncate mt-1">
                                    {artist.genres.slice(0, 2).join(', ')}
                                  </div>
                                )}
                                {artist.bestPosition && (
                                  <div className="flex items-center gap-1 mt-2 text-xs">
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                    <span className="text-muted-foreground">
                                      Best: #{artist.bestPosition} ({artist.chartType === 'viral' ? 'Viral' : 'Top'} {artist.chartPeriod})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracks Results */}
              {results.tracks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-muted-foreground" />
                    <Typography variant="h2" className="text-lg">
                      Tracks ({results.tracks.length})
                    </Typography>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {results.tracks.map((track) => (
                      <Card 
                        key={track.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer h-full"
                        onClick={() => setSelectedTrackId(track.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {track.imageUrl && (
                              <img
                                src={track.imageUrl}
                                alt={track.name}
                                className="w-12 h-12 rounded object-cover shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">{track.name}</div>
                              {track.artists && (
                                <div className="text-xs text-muted-foreground truncate mt-1">
                                  {track.artists.name}
                                </div>
                              )}
                              {track.bestPosition && (
                                <div className="flex items-center gap-1 mt-2 text-xs">
                                  <TrendingUp className="h-3 w-3 text-green-600" />
                                  <span className="text-muted-foreground">
                                    Best: #{track.bestPosition} ({track.chartType === 'viral' ? 'Viral' : 'Top'} {track.chartPeriod})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No results found for "{debouncedQuery}"</p>
                  <p className="text-sm mt-2">Try a different search term</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!hasQuery && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start typing to search for artists or tracks</p>
              <p className="text-sm mt-2">Search by name, and see charting data</p>
            </div>
          </CardContent>
        </Card>
      )}

      <TrackModal
        trackId={selectedTrackId}
        open={selectedTrackId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTrackId(null)
        }}
      />
    </div>
  )
}
