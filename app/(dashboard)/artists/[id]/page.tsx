"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/typography"
import { PositionChart } from "@/components/PositionChart"
import { StreamsChart } from "@/components/StreamsChart"
import { ChartFilters } from "@/components/ChartFilters"
import { SpotifyWidget } from "@/components/SpotifyWidget"
import { TrackArtistButton } from "@/components/TrackArtistButton"
import { Loader2, ArrowLeft, Music, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import type { Period } from "@/components/PeriodSelector"

export default function ArtistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const artistId = params.id as string

  const [loading, setLoading] = useState(true)
  const [artist, setArtist] = useState<any>(null)
  const [tracks, setTracks] = useState<any[]>([])
  const [chartHistory, setChartHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [chartType, setChartType] = useState<'regional' | 'viral'>('regional')
  const [chartPeriod, setChartPeriod] = useState<Period>('daily')
  const [region, setRegion] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'last30Days' | 'thisYear'>('last30Days')

  useEffect(() => {
    if (artistId) {
      loadArtistDetails()
    }
  }, [artistId, chartType, chartPeriod, region])

  async function loadArtistDetails() {
    if (!artistId) return

    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90) // Last 90 days for more comprehensive view

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
        if (response.status === 404) {
          router.push('/artists')
          return
        }
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
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="p-8">
        <Typography variant="h1">Artist Not Found</Typography>
        <Link href="/artists" className="text-primary hover:underline mt-4 inline-block">
          ← Back to Artists
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/artists"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Artists
        </Link>
        
        <div className="flex items-center gap-4">
          {artist.imageUrl && (
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="w-24 h-24 rounded-full object-cover"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
            <Typography variant="h1">{artist.name}</Typography>
              <TrackArtistButton
                artistId={artist.id}
                artistName={artist.name}
                variant="outline"
                size="sm"
              />
            </div>
            <Typography variant="subtitle" className="mt-2">
              {artist.genres && artist.genres.length > 0 ? (
                <span>{artist.genres.join(', ')}</span>
              ) : (
                'Artist'
              )}
              <span className="ml-2 text-xs text-muted-foreground">
                • {chartType === 'viral' ? 'Viral 50' : 'Top 50'} • {chartPeriod} {region ? `• ${region}` : '• Global'}
              </span>
            </Typography>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ChartFilters
          chartType={chartType}
          chartPeriod={chartPeriod}
          region={region}
          onChartTypeChange={setChartType}
          onChartPeriodChange={setChartPeriod}
          onRegionChange={setRegion}
        />
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedPeriod === 'last30Days' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('last30Days')}
          className="text-xs"
        >
          LAST 30 DAYS
        </Button>
        <Button
          variant={selectedPeriod === 'thisYear' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('thisYear')}
          className="text-xs"
        >
          THIS YEAR
        </Button>
      </div>

      {/* Period-Specific Stats */}
      {stats && (stats.last30Days || stats.thisYear) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Highest Position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedPeriod === 'last30Days' 
                  ? (stats.last30Days?.highestPosition ? `#${stats.last30Days.highestPosition}` : 'N/A')
                  : (stats.thisYear?.highestPosition ? `#${stats.thisYear.highestPosition}` : 'N/A')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedPeriod === 'last30Days'
                  ? (stats.last30Days?.averagePosition ? `#${stats.last30Days.averagePosition.toFixed(1)}` : 'N/A')
                  : (stats.thisYear?.averagePosition ? `#${stats.thisYear.averagePosition.toFixed(1)}` : 'N/A')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Days in Top 10</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedPeriod === 'last30Days'
                  ? (stats.last30Days?.daysInTop10 ?? 0)
                  : (stats.thisYear?.daysInTop10 ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Days in Top 20</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedPeriod === 'last30Days'
                  ? (stats.last30Days?.daysInTop20 ?? 0)
                  : (stats.thisYear?.daysInTop20 ?? 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legacy Stats Grid (fallback) */}
      {stats && !stats.last30Days && !stats.thisYear && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
      )}

      {/* Charts */}
      {chartHistory.length > 0 && (
        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Chart Position History</CardTitle>
              <CardDescription>
                {chartType === 'viral' ? 'Viral 50' : 'Top 50'} - {chartPeriod} - {region || 'Global'} (last 90 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PositionChart 
                data={chartHistory} 
                height={400}
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
                height={400}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tracks List */}
      {tracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Top Tracks
            </CardTitle>
            <CardDescription>{tracks.length} tracks by {artist.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracks.map((track, index) => (
                <div key={track.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    {track.imageUrl && (
                      <img
                        src={track.imageUrl}
                        alt={track.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-lg">{track.name}</div>
                      {track.albumName && (
                        <div className="text-sm text-muted-foreground">{track.albumName}</div>
                      )}
                      {track.popularity && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {track.popularity}% popularity
                        </div>
                      )}
                    </div>
                  </div>
                  {track.externalId && (
                    <div className="mt-4">
                      <SpotifyWidget
                        spotifyTrackId={track.externalId}
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
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No chart data available for this artist with the selected filters.</p>
              <p className="text-sm mt-2">Try adjusting the chart type, period, or region filters.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
