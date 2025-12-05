"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PositionChart } from "@/components/PositionChart"
import { StreamsChart } from "@/components/StreamsChart"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { SpotifyWidget } from "@/components/SpotifyWidget"

interface TrackModalProps {
  trackId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  chartType?: 'regional' | 'viral'
  chartPeriod?: 'daily' | 'weekly' | 'monthly'
  region?: string | null
}

export function TrackModal({ 
  trackId, 
  open, 
  onOpenChange,
  chartType = 'regional',
  chartPeriod = 'daily',
  region = null,
}: TrackModalProps) {
  const [loading, setLoading] = useState(false)
  const [track, setTrack] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [chartHistory, setChartHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (open && trackId) {
      loadTrackDetails()
    }
  }, [open, trackId, chartType, chartPeriod, region])

  async function loadTrackDetails() {
    if (!trackId) return

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
        `/api/tracks/${trackId}?${searchParams}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch track details: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setTrack(data.track)
      setArtist(data.artist)
      setChartHistory(data.chartHistory || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Failed to load track details:', error)
      // Set error state so user can see what went wrong
      setTrack(null)
      setArtist(null)
      setChartHistory([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (!trackId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {loading ? (
            <>
              <DialogTitle>Loading Track</DialogTitle>
              <DialogDescription>Fetching track details...</DialogDescription>
            </>
          ) : track ? (
            <>
              <div className="flex items-center gap-4">
                {track.imageUrl && (
                  <img
                    src={track.imageUrl}
                    alt={track.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <DialogTitle className="text-2xl">{track.name}</DialogTitle>
                  <DialogDescription>
                    {artist ? (
                      <span className="text-sm">
                        by{' '}
                        <Link 
                          href={`/artists/${artist.id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenChange(false)
                          }}
                        >
                          {artist.name}
                        </Link>
                      </span>
                    ) : (
                      'Track information'
                    )}
                  </DialogDescription>
                  {track.albumName && (
                    <p className="text-sm text-muted-foreground mt-1">{track.albumName}</p>
                  )}
                </div>
              </div>
              
              {/* Spotify Widget */}
              {track.externalId && (
                <div className="mt-4">
                  <SpotifyWidget
                    spotifyTrackId={track.externalId}
                    trackName={track.name}
                    height={152}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <DialogTitle>Track Not Found</DialogTitle>
              <DialogDescription>Unable to load track details</DialogDescription>
            </>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : track ? (
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
                      ? `${(stats.totalStreams / 1000000).toFixed(1)}M`
                      : 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Days on Chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.daysOnChart || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard Metrics */}
            {stats?.leadScore !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Dashboard-style analytics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Lead Score</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats.leadScore}
                      </div>
                    </div>
                    {stats.leadScoreBreakdown && (
                      <>
                        <div>
                          <div className="text-sm text-muted-foreground">Days in Top 10</div>
                          <div className="text-xl font-semibold">
                            {stats.leadScoreBreakdown.daysInTop10}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Days in Top 20</div>
                          <div className="text-xl font-semibold">
                            {stats.leadScoreBreakdown.daysInTop20}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Days</div>
                          <div className="text-xl font-semibold">
                            {stats.leadScoreBreakdown.totalDays}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {stats.hasRisingTrend && (
                    <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        📈 Rising Trend Detected
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        This track shows consistent upward momentum
                      </div>
                    </div>
                  )}
                  {stats.consistencyScore !== null && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Consistency Score: {stats.consistencyScore} (lower = more consistent)
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Track Details */}
            {(track.popularity || track.duration || track.albumName) && (
              <Card>
                <CardHeader>
                  <CardTitle>Track Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {track.popularity && (
                      <div>
                        <div className="text-sm text-muted-foreground">Popularity</div>
                        <div className="text-lg font-semibold">{track.popularity}%</div>
                      </div>
                    )}
                    {track.duration && (
                      <div>
                        <div className="text-sm text-muted-foreground">Duration</div>
                        <div className="text-lg font-semibold">
                          {Math.floor(track.duration / 60000)}:{(Math.floor((track.duration % 60000) / 1000)).toString().padStart(2, '0')}
                        </div>
                      </div>
                    )}
                    {track.albumName && (
                      <div>
                        <div className="text-sm text-muted-foreground">Album</div>
                        <div className="text-lg font-semibold">{track.albumName}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Artist Info */}
            {artist && (
              <Card>
                <CardHeader>
                  <CardTitle>Artist</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link 
                    href={`/artists/${artist.id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenChange(false)
                    }}
                    className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                  >
                    {artist.imageUrl && (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-primary hover:underline">
                        {artist.name}
                      </div>
                      {artist.genres && artist.genres.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {artist.genres.join(', ')}
                        </div>
                      )}
                      {artist.popularity && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {artist.popularity}% popularity
                        </div>
                      )}
                    </div>
                  </Link>
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

            {chartHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No chart data available for this track
              </div>
            )}
          </>
        ) : !loading && (
          <div className="text-center py-8 text-muted-foreground">
            Track not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
