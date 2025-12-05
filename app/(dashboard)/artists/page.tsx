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
import { EnrichButton } from "@/components/EnrichButton"
import { fetchArtists } from "@/lib/api"
import { TrendingUp, TrendingDown, Minus, Search } from "lucide-react"
import { format } from "date-fns"
import type { Period } from "@/components/PeriodSelector"

export default function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [filteredArtists, setFilteredArtists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<string>("")
  const [period, setPeriod] = useState<Period>("daily")
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [limit, setLimit] = useState(100)
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([])

  useEffect(() => {
    async function loadArtists() {
      try {
        const data = await fetchArtists({ limit, date: date || undefined, period })
        setArtists(data.artists || [])
        setFilteredArtists(data.artists || [])
        if (data.date) setDate(data.date)
        if (data.availableDates) setAvailableDates(data.availableDates)
      } catch (error) {
        console.error("Failed to load artists:", error)
      } finally {
        setLoading(false)
      }
    }
    loadArtists()
  }, [date, limit, period])

  useEffect(() => {
    if (searchQuery) {
      const filtered = artists.filter(artist =>
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.topTrack.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredArtists(filtered)
    } else {
      setFilteredArtists(artists)
    }
  }, [searchQuery, artists])

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
        <Typography variant="h1">Trending Artists</Typography>
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
              placeholder="Search artists or tracks..."
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
            type="artist"
            ids={selectedArtistIds.length > 0 ? selectedArtistIds : filteredArtists.slice(0, 10).map(a => a.id)}
            size="default"
          >
            Enrich Top 10 Artists
          </EnrichButton>
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
                    No artists found
                  </TableCell>
                </TableRow>
              ) : (
                filteredArtists.map((artist, index) => {
                  const change = artist.currentPosition - artist.bestPosition
                  return (
                    <TableRow key={artist.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-semibold">{artist.name}</TableCell>
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
      </Card>
    </div>
  )
}

