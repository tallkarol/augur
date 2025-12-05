"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Button } from "@/components/ui/button"
import { DateRangeSelector, type DateRange, type DateRangePreset } from "@/components/DateRangeSelector"
import { ExportButton } from "@/components/ExportButton"
import { Pagination } from "@/components/Pagination"
import { TrackModal } from "@/components/TrackModal"
import { ExternalLink } from "lucide-react"
import { fetchTracks } from "@/lib/api"
import { TrendingUp, TrendingDown, Minus, Search } from "lucide-react"
import { format, subDays, startOfYear } from "date-fns"

export default function TracksPage() {
  const [tracks, setTracks] = useState<any[]>([])
  const [filteredTracks, setFilteredTracks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' })
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('yesterday')
  const [chartType, setChartType] = useState<'regional' | 'viral' | 'blended'>('blended')
  const [region, setRegion] = useState<'us' | 'global'>('us')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [limit, setLimit] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [periodStats, setPeriodStats] = useState<{
    last30Days?: { highestPosition?: number; averagePosition?: number; daysInTop10?: number; daysInTop20?: number }
    thisYear?: { highestPosition?: number; averagePosition?: number; daysInTop10?: number; daysInTop20?: number }
  } | null>(null)
  const [selectedStatsPeriod, setSelectedStatsPeriod] = useState<'last30Days' | 'thisYear'>('last30Days')

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings')
        const data = await res.json()
        const dashboardSettings = data.settings?.dashboard || {}
        
        // Apply default chart type
        if (dashboardSettings.defaultChartType) {
          setChartType(dashboardSettings.defaultChartType as 'regional' | 'viral' | 'blended')
        }
        
        // Apply default region
        if (dashboardSettings.defaultRegion) {
          setRegion(dashboardSettings.defaultRegion as 'us' | 'global')
        }
        
        // Apply items per page
        if (dashboardSettings.itemsPerPage) {
          setLimit(dashboardSettings.itemsPerPage)
        }
        
        // Apply default date range preset
        const defaultPreset = dashboardSettings.defaultDateRange || 'yesterday'
        setSelectedPreset(defaultPreset as DateRangePreset)
        
        // Calculate date range based on preset
        const today = new Date()
        let startDate = ''
        let endDate = ''
        
        switch (defaultPreset) {
          case 'yesterday':
            const yesterday = format(subDays(today, 1), 'yyyy-MM-dd')
            startDate = yesterday
            endDate = yesterday
            break
          case 'lastWeek':
            const yesterdayDate = subDays(today, 1)
            const weekAgo = subDays(yesterdayDate, 7)
            startDate = format(weekAgo, 'yyyy-MM-dd')
            endDate = format(yesterdayDate, 'yyyy-MM-dd')
            break
          case 'last30':
            startDate = format(subDays(today, 30), 'yyyy-MM-dd')
            endDate = format(today, 'yyyy-MM-dd')
            break
          case 'last90':
            startDate = format(subDays(today, 90), 'yyyy-MM-dd')
            endDate = format(today, 'yyyy-MM-dd')
            break
          case 'thisYear':
            startDate = format(startOfYear(today), 'yyyy-MM-dd')
            endDate = format(today, 'yyyy-MM-dd')
            break
          default:
            const defaultYesterday = format(subDays(today, 1), 'yyyy-MM-dd')
            startDate = defaultYesterday
            endDate = defaultYesterday
        }
        
        setDateRange({ startDate, endDate })
        setSettingsLoaded(true)
      } catch (error) {
        console.error("Failed to load settings:", error)
        // Fallback to defaults
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
        setDateRange({ startDate: yesterday, endDate: yesterday })
        setSelectedPreset('yesterday')
        setSettingsLoaded(true)
      }
    }
    loadSettings()
  }, [])

  // Load tracks when filters change
  useEffect(() => {
    async function loadTracks() {
      if (!dateRange.startDate || !dateRange.endDate) return
      
      setLoading(true)
      try {
        const offset = (currentPage - 1) * limit
        const data = await fetchTracks({ 
          limit, 
          offset,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          chartType,
          region: region === 'us' ? 'us' : null,
        })
        setTracks(data.tracks || [])
        setFilteredTracks(data.tracks || [])
        setTotal(data.total || 0)
        if (data.availableDates) setAvailableDates(data.availableDates)
        if (data.periodStats) setPeriodStats(data.periodStats)
      } catch (error) {
        console.error("Failed to load tracks:", error)
      } finally {
        setLoading(false)
      }
    }
    if (settingsLoaded) {
      loadTracks()
    }
  }, [dateRange, limit, currentPage, chartType, region, settingsLoaded])

  useEffect(() => {
    if (searchQuery) {
      setCurrentPage(1)
      const filtered = tracks.filter(track =>
        track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTracks(filtered)
    } else {
      setFilteredTracks(tracks)
    }
  }, [searchQuery, tracks])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, chartType, region])

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
  }

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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h1">Trending Tracks</Typography>
          <Typography variant="subtitle" className="mt-1">
            {dateRange.startDate && dateRange.endDate && (
              dateRange.startDate === dateRange.endDate
                ? format(new Date(dateRange.startDate), 'MMMM d, yyyy')
                : `${format(new Date(dateRange.startDate), 'MMM d')} - ${format(new Date(dateRange.endDate), 'MMM d, yyyy')}`
            )}
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          {/* US/GLOBAL Toggle */}
          <Tabs value={region} onValueChange={(v) => setRegion(v as 'us' | 'global')}>
            <TabsList>
              <TabsTrigger value="us">US</TabsTrigger>
              <TabsTrigger value="global">GLOBAL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Chart Type Tabs */}
      <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'regional' | 'viral' | 'blended')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="viral">VIRAL</TabsTrigger>
          <TabsTrigger value="regional">TOP</TabsTrigger>
          <TabsTrigger value="blended">BLENDED</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Date Range Selector */}
      <DateRangeSelector
        value={selectedPreset}
        onChange={handleDateRangeChange}
        onPresetChange={setSelectedPreset}
      />

      {/* Period-Specific Stats */}
      {periodStats && (periodStats.last30Days || periodStats.thisYear) && (
        <>
          <div className="flex gap-2">
            <Button
              variant={selectedStatsPeriod === 'last30Days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatsPeriod('last30Days')}
              className="text-xs"
            >
              LAST 30 DAYS
            </Button>
            <Button
              variant={selectedStatsPeriod === 'thisYear' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatsPeriod('thisYear')}
              className="text-xs"
            >
              THIS YEAR
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Highest Position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedStatsPeriod === 'last30Days' 
                    ? (periodStats.last30Days?.highestPosition ? `#${periodStats.last30Days.highestPosition}` : 'N/A')
                    : (periodStats.thisYear?.highestPosition ? `#${periodStats.thisYear.highestPosition}` : 'N/A')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedStatsPeriod === 'last30Days'
                    ? (periodStats.last30Days?.averagePosition ? `#${periodStats.last30Days.averagePosition.toFixed(1)}` : 'N/A')
                    : (periodStats.thisYear?.averagePosition ? `#${periodStats.thisYear.averagePosition.toFixed(1)}` : 'N/A')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Days in Top 10</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedStatsPeriod === 'last30Days'
                    ? (periodStats.last30Days?.daysInTop10 ?? 0)
                    : (periodStats.thisYear?.daysInTop10 ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Days in Top 20</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedStatsPeriod === 'last30Days'
                    ? (periodStats.last30Days?.daysInTop20 ?? 0)
                    : (periodStats.thisYear?.daysInTop20 ?? 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Search and Limit */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tracks or artists..."
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


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tracks ({filteredTracks.length})</CardTitle>
            <ExportButton
              endpoint="tracks"
              params={{
                startDate: dateRange.startDate || undefined,
                endDate: dateRange.endDate || undefined,
                limit: limit,
                chartType: chartType,
                region: region === 'us' ? 'us' : '',
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Best Position</TableHead>
                <TableHead>Days on Chart</TableHead>
                <TableHead>Streams</TableHead>
                <TableHead>Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTracks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {tracks.length === 0 ? (
                      <div>
                        <p>No tracks found for the selected filters.</p>
                        <p className="text-sm mt-2">
                          Upload CSV files using the <a href="/importer" className="text-primary hover:underline">Importer</a> to add data.
                        </p>
                      </div>
                    ) : (
                      'No tracks match your search query'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTracks.map((track) => {
                  const change = track.change
                  return (
                    <TableRow 
                      key={track.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTrackId(track.id)}
                    >
                      <TableCell className="font-medium">{track.position}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{track.name}</span>
                          <div className="flex gap-1">
                            {track.isViral && (
                              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                Viral
                              </span>
                            )}
                            {track.isTop && (
                              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                Top 50
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{track.artist}</TableCell>
                      <TableCell>
                        {change !== null && change !== 0 ? (
                          <div className="flex items-center gap-2">
                            {change > 0 ? (
                              <>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">+{change}</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-red-600">{change}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">New</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{track.bestPosition}</TableCell>
                      <TableCell>{track.daysOnChart || "N/A"}</TableCell>
                      <TableCell>
                        {track.streams ? parseInt(track.streams).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {track.externalId ? (
                          <a
                            href={`https://open.spotify.com/track/${track.externalId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Play
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
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

      <TrackModal
        trackId={selectedTrackId}
        open={selectedTrackId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTrackId(null)
        }}
        chartType={chartType === 'blended' ? 'regional' : chartType}
        chartPeriod="daily"
        region={region === 'us' ? 'us' : null}
      />
    </div>
  )
}

