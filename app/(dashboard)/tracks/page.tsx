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
import { PositionChart } from "@/components/PositionChart"
import { ExportButton } from "@/components/ExportButton"
import { EnrichButton } from "@/components/EnrichButton"
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
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [limit, setLimit] = useState(100)
  const [selectedTrack, setSelectedTrack] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([])

  useEffect(() => {
    async function loadTracks() {
      try {
        const data = await fetchTracks({ limit, date: date || undefined, period })
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
  }, [date, limit, period])

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

  useEffect(() => {
    if (selectedTrack) {
      async function loadChartData() {
        try {
          const res = await fetch(`/api/charts/history?trackId=${selectedTrack.id}&startDate=${availableDates[0]}&endDate=${date}`)
          const data = await res.json()
          setChartData(data.history || [])
        } catch (error) {
          console.error("Failed to load chart data:", error)
        }
      }
      loadChartData()
    }
  }, [selectedTrack, date, availableDates])

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
        <div className="flex items-end">
          <EnrichButton
            type="track"
            ids={selectedTrackIds.length > 0 ? selectedTrackIds : filteredTracks.slice(0, 10).map(t => t.id)}
            size="default"
          >
            Enrich Top 10 Tracks
          </EnrichButton>
        </div>
      </div>

      {selectedTrack && chartData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Chart History: {selectedTrack.name} by {selectedTrack.artist}</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionChart data={chartData} />
          </CardContent>
        </Card>
      )}

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTracks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No tracks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTracks.map((track) => {
                  const change = track.change
                  return (
                    <TableRow 
                      key={track.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTrack(track)}
                    >
                      <TableCell className="font-medium">{track.position}</TableCell>
                      <TableCell className="font-semibold">{track.name}</TableCell>
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
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

