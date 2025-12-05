"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArtistModal } from "@/components/ArtistModal"
import { Loader2, Star, StarOff, Search, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default function TrackedArtistsPage() {
  const [trackedArtists, setTrackedArtists] = useState<any[]>([])
  const [filteredArtists, setFilteredArtists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [untrackingId, setUntrackingId] = useState<string | null>(null)

  useEffect(() => {
    loadTrackedArtists()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = trackedArtists.filter(ta =>
        ta.artist?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ta.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredArtists(filtered)
    } else {
      setFilteredArtists(trackedArtists)
    }
  }, [searchQuery, trackedArtists])

  async function loadTrackedArtists() {
    setLoading(true)
    try {
      const response = await fetch('/api/tracked-artists')
      if (!response.ok) {
        throw new Error('Failed to fetch tracked artists')
      }
      const data = await response.json()
      setTrackedArtists(data.trackedArtists || [])
      setFilteredArtists(data.trackedArtists || [])
    } catch (error) {
      console.error('Failed to load tracked artists:', error)
    } finally {
      setLoading(false)
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

      // Reload the list
      await loadTrackedArtists()
    } catch (error) {
      console.error('Failed to untrack artist:', error)
      alert('Failed to untrack artist. Please try again.')
    } finally {
      setUntrackingId(null)
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

  return (
    <div className="p-8 space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
          <Typography variant="h1">Tracked Artists</Typography>
          <Typography variant="subtitle" className="mt-2">
            Monitor artists from your label and track their chart appearances
          </Typography>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search artists or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {trackedArtists.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tracked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trackedArtists.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>With Chart Appearances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trackedArtists.filter(ta => ta.stats.totalAppearances > 0).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Best Position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const positions = trackedArtists
                    .map(ta => ta.stats.bestPosition)
                    .filter(p => p !== null && p !== Infinity)
                  return positions.length > 0 
                    ? `#${Math.min(...positions as number[])}`
                    : 'N/A'
                })()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Streams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const total = trackedArtists.reduce((sum, ta) => {
                    return sum + BigInt(ta.stats.totalStreams || '0')
                  }, BigInt(0))
                  return total > 0 
                    ? `${(Number(total) / 1000000).toFixed(1)}M`
                    : '0'
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Artists Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tracked Artists ({filteredArtists.length})</CardTitle>
            <Link href="/admin/settings">
              <Button variant="outline" size="sm">
                Manage Artists
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {filteredArtists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {trackedArtists.length === 0 ? (
                <div>
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No tracked artists yet</p>
                  <p className="text-sm">
                    Add artists to track from the{' '}
                    <Link href="/admin/settings" className="text-primary hover:underline">
                      Settings page
                    </Link>
                    {' '}or while browsing artists throughout the app.
                  </p>
                </div>
              ) : (
                'No artists match your search query'
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist</TableHead>
                  <TableHead>Chart Appearances</TableHead>
                  <TableHead>Best Position</TableHead>
                  <TableHead>Current Positions</TableHead>
                  <TableHead>Chart Types</TableHead>
                  <TableHead>Regions</TableHead>
                  <TableHead>Total Streams</TableHead>
                  <TableHead>Last Appearance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtists.map((trackedArtist) => {
                  const artist = trackedArtist.artist
                  const stats = trackedArtist.stats
                  
                  return (
                    <TableRow 
                      key={trackedArtist.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedArtistId(artist?.id)
                        setModalOpen(true)
                      }}
                    >
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-3">
                          {artist?.imageUrl && (
                            <img
                              src={artist.imageUrl}
                              alt={artist.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div className="font-semibold">{artist?.name || 'Unknown'}</div>
                            {artist?.genres && artist.genres.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {artist.genres.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          {stats.totalAppearances || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        {stats.bestPosition ? `#${stats.bestPosition}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {stats.currentPositions && Object.keys(stats.currentPositions).length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {Object.entries(stats.currentPositions).slice(0, 3).map(([chartKey, pos]: [string, any]) => {
                              // Get trend indicator by comparing with previous position in crossChartData
                              const chartData = trackedArtist.crossChartData?.[chartKey] || []
                              let trend: 'up' | 'down' | 'stable' | null = null
                              if (chartData && chartData.length >= 2) {
                                const currentPos = pos.position
                                const previousPos = chartData[chartData.length - 2]?.position
                                if (previousPos !== null && previousPos !== undefined) {
                                  if (currentPos < previousPos) trend = 'up'
                                  else if (currentPos > previousPos) trend = 'down'
                                  else trend = 'stable'
                                }
                              }
                              
                              const [chartType, chartPeriod, region] = chartKey.split('-')
                              const regionLabel = region === 'global' ? 'Global' : region.toUpperCase()
                              const chartLabel = `${chartType === 'viral' ? 'Viral' : 'Top 50'} ${chartPeriod === 'daily' ? 'Daily' : 'Weekly'} - ${regionLabel}`
                              
                              return (
                                <div key={chartKey} className="flex items-center gap-1 text-xs">
                                  {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                                  {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
                                  {trend === 'stable' && <Minus className="h-3 w-3 text-gray-400" />}
                                  <span className="font-medium">#{pos.position}</span>
                                  <span className="text-muted-foreground">({chartLabel})</span>
                                </div>
                              )
                            })}
                            {Object.keys(stats.currentPositions).length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{Object.keys(stats.currentPositions).length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No current positions</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {stats.chartTypes.length > 0 ? (
                            stats.chartTypes.map((type: string) => (
                              <span
                                key={type}
                                className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                                  type === 'viral'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                }`}
                              >
                                {type === 'viral' ? 'Viral' : 'Top 50'}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {stats.regions.length > 0 ? (
                          <div className="text-sm">
                            {stats.regions.slice(0, 3).join(', ')}
                            {stats.regions.length > 3 && ` +${stats.regions.length - 3}`}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Global</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stats.totalStreams && BigInt(stats.totalStreams) > 0
                          ? `${(Number(stats.totalStreams) / 1000000).toFixed(1)}M`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {stats.latestDate
                          ? format(new Date(stats.latestDate), 'MMM d, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Link href={`/artists/${artist?.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <ExternalLink className="h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => untrackArtist(artist?.id)}
                            disabled={untrackingId === artist?.id}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            {untrackingId === artist?.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <StarOff className="h-3 w-3" />
                            )}
                            Untrack
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ArtistModal
        artistId={selectedArtistId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        chartType="regional"
        chartPeriod="daily"
        region={null}
      />
    </div>
  )
}
