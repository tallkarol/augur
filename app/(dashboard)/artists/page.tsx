"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DashboardFilters } from "@/components/DashboardFilters"
import { ExportButton } from "@/components/ExportButton"
import { ArtistModal } from "@/components/ArtistModal"
import { TrackArtistButton } from "@/components/TrackArtistButton"
import { Pagination } from "@/components/Pagination"
import { fetchArtists } from "@/lib/api"
import { TrendingUp, TrendingDown, Minus, Search } from "lucide-react"
import { format } from "date-fns"
import type { Period } from "@/components/PeriodSelector"
import Link from "next/link"

export default function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [filteredArtists, setFilteredArtists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<string>("")
  const [period, setPeriod] = useState<Period>("daily")
  const [chartType, setChartType] = useState<'regional' | 'viral'>('viral')
  const [region, setRegion] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [limit, setLimit] = useState(20) // Will be updated from settings
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [trackedArtistIds, setTrackedArtistIds] = useState<Set<string>>(new Set())

  // Load dashboard settings for itemsPerPage
  useEffect(() => {
    async function loadDashboardSettings() {
      try {
        const res = await fetch('/api/admin/settings')
        const data = await res.json()
        const dashboardSettings = data.settings?.dashboard || {}
        if (dashboardSettings.itemsPerPage) {
          setLimit(dashboardSettings.itemsPerPage)
        }
      } catch (error) {
        console.error('Failed to load dashboard settings:', error)
      }
    }
    loadDashboardSettings()
  }, [])

  // Fetch tracked artists once on mount
  useEffect(() => {
    async function loadTrackedArtists() {
      try {
        const response = await fetch('/api/tracked-artists')
        if (response.ok) {
          const data = await response.json()
          const trackedIds = new Set<string>((data.trackedArtists || []).map((ta: any) => ta.artistId as string))
          setTrackedArtistIds(trackedIds)
        }
      } catch (error) {
        console.error('Failed to load tracked artists:', error)
      }
    }
    loadTrackedArtists()
  }, [])

  useEffect(() => {
    async function loadArtists() {
      setLoading(true)
      try {
        const offset = (currentPage - 1) * limit
        const data = await fetchArtists({ 
          limit, 
          offset,
          date: date || undefined, 
          period,
          chartType,
          region,
        })
        setArtists(data.artists || [])
        setFilteredArtists(data.artists || [])
        setTotal(data.total || 0)
        if (data.date) setDate(data.date)
        if (data.availableDates) setAvailableDates(data.availableDates)
      } catch (error) {
        console.error("Failed to load artists:", error)
      } finally {
        setLoading(false)
      }
    }
    loadArtists()
  }, [date, limit, currentPage, period, chartType, region])

  useEffect(() => {
    if (searchQuery) {
      // When searching, reset to page 1 and fetch all results
      setCurrentPage(1)
      // Search is handled server-side via API, but we can also filter client-side
      const filtered = artists.filter(artist =>
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.topTrack.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredArtists(filtered)
    } else {
      setFilteredArtists(artists)
    }
  }, [searchQuery, artists])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [date, period, chartType, region])

  if (loading) {
    return (
      <div className="p-8">
        <Typography variant="h1">Loading...</Typography>
      </div>
    )
  }

  const getChartTypeLabel = () => {
    if (chartType === 'viral') return 'Viral 50'
    if (chartType === 'regional') return 'Top 50'
    return 'Blended (Viral + Top 50)'
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
        <Typography variant="h1">Trending Artists</Typography>
        <Typography variant="subtitle" className="mt-2">
          {date && `Data as of ${format(new Date(date), 'MMMM d, yyyy')} (${period})`}
            {region && ` • ${region}`}
        </Typography>
      </div>

        {/* Chart Type Tabs */}
        <Tabs value={chartType === 'regional' ? 'top' : chartType} onValueChange={(value) => {
          if (value === 'top') {
            setChartType('regional')
          } else {
            setChartType(value as 'regional' | 'viral')
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="viral">VIRAL</TabsTrigger>
            <TabsTrigger value="top">TOP</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Combined Filters */}
        <DashboardFilters
          date={date}
          period={period}
          region={region}
          availableDates={availableDates}
          onDateChange={setDate}
          onPeriodChange={setPeriod}
          onRegionChange={setRegion}
        />

        {/* Search and Limit */}
        <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search artists or tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
          <div className="min-w-[150px]">
          <Label>Limit</Label>
          <Input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
            min={10}
            max={200}
          />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Artists ({filteredArtists.length})</CardTitle>
            <ExportButton
              endpoint="artists"
              params={{
                date: date || undefined,
                limit: limit,
                period: period,
                chartType: chartType,
                region: region || '',
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Best Position</TableHead>
                <TableHead>Current Position</TableHead>
                <TableHead>Avg Position</TableHead>
                <TableHead>Top Track</TableHead>
                <TableHead>Track Count</TableHead>
                <TableHead>Total Streams</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArtists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {artists.length === 0 ? (
                      <div>
                        <p>No artists found for the selected filters.</p>
                        <p className="text-sm mt-2">
                          Upload CSV files using the <a href="/importer" className="text-primary hover:underline">Importer</a> to add data.
                        </p>
                      </div>
                    ) : (
                      'No artists match your search query'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredArtists.map((artist, index) => {
                  const change = artist.currentPosition - artist.bestPosition
                  return (
                    <TableRow 
                      key={artist.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        // Open modal for quick preview, but also allow navigation
                        setSelectedArtistId(artist.id)
                        setModalOpen(true)
                      }}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/artists/${artist.id}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {artist.name}
                          </Link>
                          <div className="flex gap-1">
                            {artist.isViral && (
                              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                Viral
                              </span>
                            )}
                            {artist.isTop && (
                              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                Top 50
                              </span>
                            )}
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <TrackArtistButton
                              artistId={artist.id}
                              artistName={artist.name}
                              variant="ghost"
                              size="sm"
                              isTracked={trackedArtistIds.has(artist.id)}
                              onTrackChange={(isTracked) => {
                                const newSet = new Set(trackedArtistIds)
                                if (isTracked) {
                                  newSet.add(artist.id)
                                } else {
                                  newSet.delete(artist.id)
                                }
                                setTrackedArtistIds(newSet)
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{artist.bestPosition}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {artist.currentPosition}
                          {change !== 0 && (
                            <span className="flex items-center gap-1">
                              {change < 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className={change < 0 ? "text-green-600" : "text-red-600"}>
                                {Math.abs(change)}
                              </span>
                            </span>
                          )}
                          {change === 0 && (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{artist.topTrack}</TableCell>
                      <TableCell>{artist.trackCount}</TableCell>
                      <TableCell>
                        {artist.totalStreams 
                          ? parseInt(artist.totalStreams).toLocaleString() 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {artist.averagePosition ? `#${artist.averagePosition}` : 'N/A'}
                        {artist.trend !== null && artist.trend !== undefined && (
                          <div className="flex items-center gap-1 text-xs mt-1">
                            {artist.trend > 0 ? (
                              <>
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span className="text-green-600">+{artist.trend}</span>
                              </>
                            ) : artist.trend < 0 ? (
                              <>
                                <TrendingDown className="h-3 w-3 text-red-600" />
                                <span className="text-red-600">{artist.trend}</span>
                              </>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        {!searchQuery && total > limit && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(total / limit)}
            onPageChange={setCurrentPage}
            pageSize={limit}
            total={total}
          />
        )}
      </Card>

      <ArtistModal
        artistId={selectedArtistId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        chartType={chartType}
        chartPeriod={period}
        region={region}
      />
    </div>
  )
}

