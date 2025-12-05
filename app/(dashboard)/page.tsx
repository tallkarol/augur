"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Typography } from "@/components/typography"
import { DateRangePicker } from "@/components/DateRangePicker"
import { TrendingTable } from "@/components/TrendingTable"
import { TrendingUp, TrendingDown, Sparkles, ArrowDown } from "lucide-react"
import { format } from "date-fns"
import type { Period } from "@/components/PeriodSelector"

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<string>("")
  const [period, setPeriod] = useState<Period>("daily")
  const [availableDates, setAvailableDates] = useState<string[]>([])

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch(`/api/dashboard?date=${date || ''}&period=${period}`)
        const data = await res.json()
        setDashboardData(data)
        if (data.date) setDate(data.date)
        if (data.availableDates) setAvailableDates(data.availableDates)
      } catch (error) {
        console.error("Failed to load dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [date, period])

  if (loading) {
    return (
      <div className="p-8">
        <Typography variant="h1">Loading...</Typography>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="p-8">
        <Typography variant="h1">No data available</Typography>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Typography variant="h1">Dashboard</Typography>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 10 Trending Tracks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top 10 Trending Tracks
            </CardTitle>
            <CardDescription>Current chart leaders</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendingTable 
              data={dashboardData.topTracks || []} 
              showArtist={true}
            />
          </CardContent>
        </Card>

        {/* Top 10 Trending Artists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Top 10 Trending Artists
            </CardTitle>
            <CardDescription>Artists with best chart positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.topArtists?.slice(0, 10).map((artist: any, index: number) => (
                <div key={artist.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{artist.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {artist.topTrack} • {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">#{artist.bestPosition}</div>
                    <div className="text-xs text-muted-foreground">Best</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Biggest Movers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              Biggest Movers
            </CardTitle>
            <CardDescription>Tracks climbing the fastest</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendingTable 
              data={dashboardData.biggestMovers || []} 
              showArtist={true}
            />
          </CardContent>
        </Card>

        {/* New Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              New Chart Entries
            </CardTitle>
            <CardDescription>Tracks entering the chart</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendingTable 
              data={dashboardData.newEntries || []} 
              showArtist={true}
            />
          </CardContent>
        </Card>

        {/* Biggest Drops */}
        {dashboardData.biggestDrops && dashboardData.biggestDrops.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDown className="h-5 w-5 text-red-600" />
                Biggest Drops
              </CardTitle>
              <CardDescription>Tracks falling in position</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendingTable 
                data={dashboardData.biggestDrops || []} 
                showArtist={true}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

