"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportButton } from "@/components/ExportButton"
import { StreamsChart } from "@/components/StreamsChart"
import { ArtistComparisonChart } from "@/components/ArtistComparisonChart"
import { TrendChart } from "@/components/TrendChart"
import { PositionChart } from "@/components/PositionChart"
import { PeriodComparisonTable } from "@/components/PeriodComparisonTable"
import { DashboardFilters } from "@/components/DashboardFilters"
import { fetchDashboard, fetchTracks } from "@/lib/api"
import { format } from "date-fns"
import type { Period } from "@/components/PeriodSelector"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InsightsPage() {
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<string>("")
  const [period, setPeriod] = useState<Period>("daily")
  const [region, setRegion] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [tracksData, setTracksData] = useState<any[]>([])
  const [selectedArtists, setSelectedArtists] = useState<string[]>([])
  const [periodComparisonData, setPeriodComparisonData] = useState<any>(null)
  const [loadingComparison, setLoadingComparison] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [dashboard, tracks] = await Promise.all([
          fetchDashboard({ date: date || undefined, period, region }),
          fetchTracks({ limit: 50, date: date || undefined, period, region }),
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
  }, [date, period, region])

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

  async function loadPeriodComparison() {
    setLoadingComparison(true)
    try {
      const params = new URLSearchParams({
        periodType: 'week',
        chartType: period === 'daily' ? 'regional' : 'regional',
        chartPeriod: period,
      })
      if (region) {
        params.append('region', region)
      }

      const response = await fetch(`/api/charts/period-compare?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPeriodComparisonData(data)
      }
    } catch (error) {
      console.error('Failed to load period comparison:', error)
    } finally {
      setLoadingComparison(false)
    }
  }

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
        <DashboardFilters
          date={date}
          period={period}
          region={region}
          availableDates={availableDates}
          onDateChange={setDate}
          onPeriodChange={setPeriod}
          onRegionChange={setRegion}
        />
      </div>

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trends">Trends & Analytics</TabsTrigger>
          <TabsTrigger value="comparison">Period Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Period Comparison</CardTitle>
                  <CardDescription>
                    Compare this week vs last week to see trends and changes
                  </CardDescription>
                </div>
                <Button 
                  onClick={loadPeriodComparison}
                  disabled={loadingComparison}
                  variant="outline"
                >
                  {loadingComparison ? 'Loading...' : 'Load Comparison'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {periodComparisonData ? (
                <PeriodComparisonTable
                  period1={periodComparisonData.period1}
                  period2={periodComparisonData.period2}
                  positionChanges={periodComparisonData.positionChanges}
                  biggestMovers={periodComparisonData.biggestMovers}
                  biggestDroppers={periodComparisonData.biggestDroppers}
                  newEntries={periodComparisonData.newEntries}
                  exits={periodComparisonData.exits}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Click &quot;Load Comparison&quot; to see period-over-period analysis</p>
                  <p className="text-sm mt-2">
                    Compare this week vs last week to identify trends, new entries, and position changes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

