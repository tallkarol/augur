"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { DateRangePicker } from "@/components/DateRangePicker"
import { ExportButton } from "@/components/ExportButton"
import { ChartFilters } from "@/components/ChartFilters"
import { SpotifyWidget } from "@/components/SpotifyWidget"
import { TrackModal } from "@/components/TrackModal"
import { ExternalLink } from "lucide-react"
import { fetchTracks } from "@/lib/api"
import { TrendingUp, TrendingDown, Minus, Search } from "lucide-react"
import { format } from "date-fns"
import type { Period } from "@/components/PeriodSelector"

export default function TracksPage() {
  const [tracks, setTracks] = useState<any[]>([])
  const [filteredTracks, setFilteredTracks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<string>("")
  const [period, setPeriod] = useState<Period>("daily")
  const [chartType, setChartType] = useState<'regional' | 'viral'>('regional')
  const [region, setRegion] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [limit, setLimit] = useState(100)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)

  useEffect(() => {
    async function loadTracks() {
      setLoading(true)
      try {
        const data = await fetchTracks({ 
          limit, 
          date: date || undefined, 
          period,
          chartType,
          region,
        })
        setTracks(data.tracks || [])
        setFilteredTracks(data.tracks || [])
        if (data.date) setDate(data.date)
        if (data.availableDates) setAvailableDates(data.availableDates)
      } catch (error) {
        console.error("Failed to load tracks:", error)
      } finally {
        setLoading(false)
      }
    }
    loadTracks()
  }, [date, limit, period, chartType, region])

  useEffect(() => {
    if (searchQuery) {
      const filtered = tracks.filter(track =>
        track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTracks(filtered)
    } else {
      setFilteredTracks(tracks)
    }
  }, [searchQuery, tracks])


  if (loading) {
    return (
      <div className="p-8">
        <Typography variant="h1">Loading...</Typography>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Typography variant="h1">Trending Tracks</Typography>
        <Typography variant="subtitle" className="mt-2">
          {date && `Data as of ${format(new Date(date), 'MMMM d, yyyy')} (${period})`}
          {chartType === 'viral' && ' - Viral 50'}
          {chartType === 'regional' && ' - Top 50'}
          {region && ` - ${region}`}
        </Typography>
      </div>

      <div className="mb-6">
        <DateRangePicker
          label="Date & Period Selection"
          value={date}
          onChange={(newDate) => setDate(newDate)}
          availableDates={availableDates}
          period={period}
          onPeriodChange={setPeriod}
        />
      </div>

      <div className="mb-6">
        <ChartFilters
          chartType={chartType}
          chartPeriod={period}
          region={region}
          onChartTypeChange={setChartType}
          onChartPeriodChange={setPeriod}
          onRegionChange={setRegion}
        />
      </div>

      <div className="mb-6 flex gap-4 flex-wrap">
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
        <div className="flex-1 min-w-[150px]">
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
      </Card>

      <TrackModal
        trackId={selectedTrackId}
        open={selectedTrackId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTrackId(null)
        }}
        chartType={chartType}
        chartPeriod={period}
        region={region}
      />
    </div>
  )
}

