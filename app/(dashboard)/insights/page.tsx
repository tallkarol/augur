"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportButton } from "@/components/ExportButton"
import { StreamsChart } from "@/components/StreamsChart"
import { ArtistComparisonChart } from "@/components/ArtistComparisonChart"
import { TrendChart } from "@/components/TrendChart"
import { PositionChart } from "@/components/PositionChart"
import { DateRangePicker } from "@/components/DateRangePicker"
import { fetchDashboard, fetchTracks } from "@/lib/api"
import { format } from "date-fns"
import type { Period } from "@/components/PeriodSelector"

export default function InsightsPage() {
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<string>("")
  const [period, setPeriod] = useState<Period>("daily")
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [tracksData, setTracksData] = useState<any[]>([])
  const [selectedArtists, setSelectedArtists] = useState<string[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const [dashboard, tracks] = await Promise.all([
          fetchDashboard({ date: date || undefined, period }),
          fetchTracks({ limit: 50, date: date || undefined, period }),
        ])
        setDashboardData(dashboard)
        setTracksData(tracks.tracks || [])
        if (dashboard.date) setDate(dashboard.date)
        if (dashboard.availableDates) setAvailableDates(dashboard.availableDates)
      } catch (error) {
        console.error("Failed to load insights:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [date, period])

  // Prepare streams chart data
  const streamsChartData = tracksData
    .filter((t) => t.streams)
    .slice(0, 20)
    .map((t) => ({
      date: date,
      streams: parseInt(t.streams) || 0,
      name: t.name,
    }))
    .sort((a, b) => b.streams - a.streams)

  // Prepare trend chart data
  const trendChartData = dashboardData?.biggestMovers
    ?.map((track: any) => ({
      name: track.name.length > 30 ? track.name.substring(0, 30) + "..." : track.name,
      change: track.change,
      position: track.position,
      previousPosition: track.previousPosition,
    })) || []

  // Prepare artist comparison data (top 5 artists)
  const topArtists = dashboardData?.topArtists?.slice(0, 5) || []
  const artistComparisonData = topArtists.map((artist: any) => ({
    name: artist.name,
    position: artist.currentPosition || artist.bestPosition,
  }))

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
        <Typography variant="h1">Cross-Platform Intelligence</Typography>
        <Typography variant="subtitle" className="mt-2">
          Advanced analytics and insights
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

      <div className="grid gap-6">
        {/* Trend Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Biggest Movers</CardTitle>
                <CardDescription>
                  Tracks with the largest position improvements
                </CardDescription>
              </div>
              <ExportButton
                endpoint="charts"
                params={{
                  date: date || undefined,
                  period: period,
                }}
                size="sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {trendChartData.length > 0 ? (
              <TrendChart data={trendChartData} title="" height={400} limit={15} />
            ) : (
              <Typography variant="body" className="text-muted-foreground">
                No trend data available
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Streams Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Tracks by Streams</CardTitle>
            <CardDescription>
              Stream count for top tracks as of {date && format(new Date(date), 'MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {streamsChartData.length > 0 ? (
              <StreamsChart
                data={streamsChartData.map((d) => ({ date: d.date, streams: d.streams }))}
                title=""
                height={300}
              />
            ) : (
              <Typography variant="body" className="text-muted-foreground">
                No streams data available
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Platform Comparison Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Comparison</CardTitle>
            <CardDescription>
              Compare trends across different platforms (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Typography variant="body" className="text-muted-foreground">
              Multi-platform comparison will be available when data from additional platforms is integrated.
            </Typography>
          </CardContent>
        </Card>

        {/* Gap Analysis Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Gap Analysis</CardTitle>
            <CardDescription>
              Identify artists trending on one platform but not another (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Typography variant="body" className="text-muted-foreground">
              Gap analysis will be available when data from additional platforms is integrated.
            </Typography>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

