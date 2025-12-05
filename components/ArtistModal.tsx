"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PositionChart } from "@/components/PositionChart"
import { StreamsChart } from "@/components/StreamsChart"
import { TrackArtistButton } from "@/components/TrackArtistButton"
import { Loader2, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { SpotifyWidget } from "@/components/SpotifyWidget"
import Link from "next/link"

interface ArtistModalProps {
  artistId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  chartType?: 'regional' | 'viral'
  chartPeriod?: 'daily' | 'weekly' | 'monthly'
  region?: string | null
}

export function ArtistModal({ 
  artistId, 
  open, 
  onOpenChange,
  chartType = 'regional',
  chartPeriod = 'daily',
  region = null,
}: ArtistModalProps) {
  const [loading, setLoading] = useState(false)
  const [artist, setArtist] = useState<any>(null)
  const [tracks, setTracks] = useState<any[]>([])
  const [chartHistory, setChartHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (open && artistId) {
      loadArtistDetails()
    }
  }, [open, artistId, chartType, chartPeriod, region])

  async function loadArtistDetails() {
    if (!artistId) return

    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const searchParams = new URLSearchParams({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        chartType,
        chartPeriod,
      })
      if (region) {
        searchParams.set('region', region)
      } else {
        searchParams.set('region', '')
      }

      const response = await fetch(
        `/api/artists/${artistId}?${searchParams}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch artist details: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setArtist(data.artist)
      setTracks(data.tracks || [])
      setChartHistory(data.chartHistory || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Failed to load artist details:', error)
      // Set error state so user can see what went wrong
      setArtist(null)
      setTracks([])
      setChartHistory([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (!artistId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {loading ? (
            <>
              <DialogTitle>Loading Artist</DialogTitle>
              <DialogDescription>Fetching artist details...</DialogDescription>
            </>
          ) : artist ? (
            <>
              <div className="flex items-center gap-4">
                {artist.imageUrl && (
                  <img
                    src={artist.imageUrl}
                    alt={artist.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-2xl">{artist.name}</DialogTitle>
                    <div className="flex items-center gap-2">
                      <TrackArtistButton
                        artistId={artist.id}
                        artistName={artist.name}
                        variant="outline"
                        size="sm"
                      />
                    <Link href={`/artists/${artist.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        View Full Profile
                      </Button>
                    </Link>
                    </div>
                  </div>
                  <DialogDescription>
                    {artist.genres && artist.genres.length > 0 ? (
                      <span className="text-sm">{artist.genres.join(', ')}</span>
                    ) : (
                      'Artist information'
                    )}
                    <span className="ml-2 text-xs text-muted-foreground">
                      • {chartType === 'viral' ? 'Viral 50' : 'Top 50'} • {chartPeriod} {region ? `• ${region}` : '• Global'}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogTitle>Artist Not Found</DialogTitle>
              <DialogDescription>Unable to load artist details</DialogDescription>
            </>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : artist ? (
          <>
            {/* Stats Grid based on loaded data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Best Position</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.bestPosition ? `#${stats.bestPosition}` : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Position</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.averagePosition ? `#${stats.averagePosition}` : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Streams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.totalStreams 
                      ? `${(parseInt(stats.totalStreams) / 1000000).toFixed(1)}M`
                      : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Tracks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.totalTracks || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard Metrics */}
            {stats?.aggregateLeadScore !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Dashboard-style analytics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Aggregate Lead Score</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats.aggregateLeadScore}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Combined score across all tracks
                      </div>
                    </div>
                    {stats.topTrackLeadScore && (
                      <>
                        <div>
                          <div className="text-sm text-muted-foreground">Top Track</div>
                          <div className="text-lg font-semibold truncate">
                            {stats.topTrackLeadScore.trackName}
                          </div>
                          <div className="text-sm text-yellow-600 font-medium">
                            Score: {stats.topTrackLeadScore.score}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Top Track Stats</div>
                          <div className="text-xs space-y-1 mt-1">
                            <div>{stats.topTrackLeadScore.breakdown.daysInTop10} days in top 10</div>
                            <div>{stats.topTrackLeadScore.breakdown.daysInTop20} days in top 20</div>
                            <div>Best: #{stats.topTrackLeadScore.breakdown.bestPosition}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            {chartHistory.length > 0 && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Chart Position History</CardTitle>
                    <CardDescription>
                      {chartType === 'viral' ? 'Viral 50' : 'Top 50'} - {chartPeriod} - {region || 'Global'} (last 30 days)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PositionChart 
                      data={chartHistory} 
                      height={300}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Streams Over Time</CardTitle>
                    <CardDescription>Daily stream count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StreamsChart 
                      data={chartHistory.map(d => ({ 
                        date: d.date, 
                        streams: d.streams || 0 
                      }))} 
                      height={300}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tracks List */}
            {tracks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Tracks</CardTitle>
                  <CardDescription>
                    {chartHistory.length > 0 
                      ? `${tracks.length} charting tracks by ${artist.name}`
                      : `${tracks.length} top tracks by ${artist.name} (from Spotify)`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tracks.slice(0, 10).map((track, index) => (
                      <div key={track.id || track.externalId || index}>
                        <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                          <span className="text-muted-foreground w-6">{index + 1}</span>
                          {track.imageUrl && (
                            <img
                              src={track.imageUrl}
                              alt={track.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{track.name}</div>
                            {track.albumName && (
                              <div className="text-sm text-muted-foreground">{track.albumName}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {track.popularity && (
                              <div className="text-sm text-muted-foreground">
                                {track.popularity}% popularity
                              </div>
                            )}
                          </div>
                        </div>
                        {(track.externalId || track.id) && (
                          <div className="mt-2 ml-11">
                            <SpotifyWidget
                              spotifyTrackId={track.externalId || track.id}
                              trackName={track.name}
                              height={80}
                              compact={true}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {chartHistory.length === 0 && tracks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No chart data available for this artist
              </div>
            )}
          </>
        ) : !loading && (
          <div className="text-center py-8 text-muted-foreground">
            Artist not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
