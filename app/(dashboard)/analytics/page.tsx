"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Typography } from "@/components/typography"
import { DashboardFilters } from "@/components/DashboardFilters"
import { TrendingTable } from "@/components/TrendingTable"
import { TrackModal } from "@/components/TrackModal"
import { ArtistModal } from "@/components/ArtistModal"
import { TrendingUp, TrendingDown, Sparkles, ArrowDown, Users, Music } from "lucide-react"
import { format } from "date-fns"
import type { Period } from "@/components/PeriodSelector"
import Link from "next/link"

function AnalyticsPageContent() {
  const searchParams = useSearchParams()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<string>("")
  const [period, setPeriod] = useState<Period>("daily")
  const [chartType, setChartType] = useState<'regional' | 'viral' | 'blended'>('blended')
  const [region, setRegion] = useState<string | null>('us')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const params = new URLSearchParams({
          date: date || '',
          period: period,
          chartType: chartType,
        })
        if (region) params.set('region', region)
        else params.set('region', '')
        
        // Check if we should force refresh (e.g., after upload)
        const shouldRefresh = searchParams?.get('refresh') === 'true'
        if (shouldRefresh) {
          params.set('refresh', 'true')
        }
        
        // Add cache-busting timestamp to ensure fresh data
        params.set('_t', Date.now().toString())
        
        const res = await fetch(`/api/dashboard?${params}`, {
          cache: 'no-store', // Disable browser caching
        })
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
  }, [date, period, chartType, region, searchParams])

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
        <Typography variant="body" className="mt-4 text-muted-foreground">
          Upload CSV files using the <a href="/importer" className="text-primary hover:underline">Importer</a> to get started.
        </Typography>
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
          <Typography variant="h1">Analytics Dashboard</Typography>
          <Typography variant="subtitle" className="mt-2">
            {date && `Data as of ${format(new Date(date), 'MMMM d, yyyy')} (${period})`}
            {region && ` • ${region}`}
          </Typography>
        </div>

        {/* Chart Type Tabs - Full Width */}
        <Tabs value={chartType === 'regional' ? 'top' : chartType} onValueChange={(value) => {
          if (value === 'top') {
            setChartType('regional')
          } else {
            setChartType(value as 'regional' | 'viral' | 'blended')
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="viral">VIRAL</TabsTrigger>
            <TabsTrigger value="top">TOP</TabsTrigger>
            <TabsTrigger value="blended">BLENDED</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Combined Filters - Full Width */}
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

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Artists - Primary Focus */}
        <Card className="lg:col-span-2 border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Top Artists</CardTitle>
                  <CardDescription>Best performing artists in {getChartTypeLabel()}</CardDescription>
                </div>
              </div>
              <Link 
                href="/artists" 
                className="text-sm text-primary hover:underline"
              >
                View All →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.topArtists && dashboardData.topArtists.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {dashboardData.topArtists.slice(0, 9).map((artist: any, index: number) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate group-hover:text-primary transition-colors">
                        {artist.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {artist.topTrack}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        #{artist.bestPosition} • {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No artist data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rising Talent */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Rising Talent</CardTitle>
                <CardDescription>Fastest climbing tracks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.biggestMovers && dashboardData.biggestMovers.length > 0 ? (
              <TrendingTable 
                data={dashboardData.biggestMovers.slice(0, 5)} 
                showArtist={true}
                onTrackClick={setSelectedTrackId}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No rising tracks
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Discoveries */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">New Discoveries</CardTitle>
                <CardDescription>Fresh chart entries</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.newEntries && dashboardData.newEntries.length > 0 ? (
              <TrendingTable 
                data={dashboardData.newEntries.slice(0, 5)} 
                showArtist={true}
                onTrackClick={setSelectedTrackId}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No new entries
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Tracks */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Music className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Top Tracks</CardTitle>
                  <CardDescription>Current chart leaders</CardDescription>
                </div>
              </div>
              <Link 
                href="/tracks" 
                className="text-sm text-primary hover:underline"
              >
                View All →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.topTracks && dashboardData.topTracks.length > 0 ? (
              <TrendingTable 
                data={dashboardData.topTracks.slice(0, 10)} 
                showArtist={true}
                onTrackClick={setSelectedTrackId}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No track data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TrackModal
        trackId={selectedTrackId}
        open={selectedTrackId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTrackId(null)
        }}
        chartType={chartType === 'blended' ? 'regional' : chartType}
        chartPeriod={period}
        region={region}
      />

      <ArtistModal
        artistId={selectedArtistId}
        open={selectedArtistId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedArtistId(null)
        }}
        chartType={chartType === 'blended' ? 'regional' : chartType}
        chartPeriod={period}
        region={region}
      />
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <Typography variant="h1">Loading...</Typography>
      </div>
    }>
      <AnalyticsPageContent />
    </Suspense>
  )
}
