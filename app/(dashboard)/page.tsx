"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { ExecutiveSummary } from "@/components/ExecutiveSummary"
import { BiggestMoversCard } from "@/components/BiggestMoversCard"
import { NewEntriesCard } from "@/components/NewEntriesCard"
import { LeadScoreLeadersCard } from "@/components/LeadScoreLeadersCard"
import { RisingStarsCard } from "@/components/RisingStarsCard"
import { TrackModal } from "@/components/TrackModal"
import { DateRangeSelector, type DateRange, type DateRangePreset } from "@/components/DateRangeSelector"
import { format, subDays, startOfYear } from "date-fns"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Settings, Globe } from "lucide-react"

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' })
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('yesterday')
  const [region, setRegion] = useState<'us' | 'global'>('us')
  const [chartType, setChartType] = useState<'regional' | 'viral' | 'blended'>('blended')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)

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

  useEffect(() => {
    async function loadDashboard() {
      if (!dateRange.startDate || !dateRange.endDate) return
      
      try {
        const params = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          chartType: chartType,
          chartPeriod: 'daily', // Always use daily data
        })
        if (region === 'us') {
          params.set('region', 'us')
        } else if (region === 'global') {
          params.set('region', 'global')
        }
        
        const res = await fetch(`/api/dashboard?${params}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        setDashboardData(data)
        if (data.availableDates) setAvailableDates(data.availableDates)
      } catch (error) {
        console.error("Failed to load dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    if (settingsLoaded) {
    loadDashboard()
    }
  }, [dateRange, region, chartType, settingsLoaded])

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

  const viewType = dashboardData?.viewType || 'daily'
  const summary = dashboardData?.summary || {}

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    // Determine preset based on range
    const daysDiff = Math.ceil(
      (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysDiff === 0) {
      setSelectedPreset('yesterday')
    } else if (daysDiff === 7) {
      setSelectedPreset('lastWeek')
    } else if (daysDiff <= 30) {
      setSelectedPreset('last30')
    } else if (daysDiff <= 90) {
      setSelectedPreset('last90')
    } else {
      setSelectedPreset('thisYear')
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h1">Dashboard</Typography>
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
          <Link href="/dashboard/analytics">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Advanced View
            </Button>
          </Link>
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

      {/* Executive Summary */}
      {summary && (
        <ExecutiveSummary
          viewType={viewType}
          trackedArtistsTotal={summary.trackedArtistsTotal || 0}
          trackedArtistsCharting={summary.trackedArtistsCharting || 0}
          {...(viewType === 'daily' ? {
            biggestMover: summary.biggestMover,
            newEntriesCount: summary.newEntriesCount || 0,
          } : {
            topLeadScore: summary.topLeadScore,
            newOpportunitiesCount: summary.newOpportunitiesCount || 0,
          })}
        />
      )}

      {/* Main Content - Different layouts based on view type */}
      {viewType === 'daily' ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <BiggestMoversCard
              movers={dashboardData?.biggestMovers || []}
              onTrackClick={setSelectedTrackId}
            />
            <NewEntriesCard
              entries={dashboardData?.newEntries || []}
              onTrackClick={setSelectedTrackId}
            />
          </div>
        </>
      ) : (
        <>
          <LeadScoreLeadersCard
            leaders={dashboardData?.leadScoreLeaders || []}
            onTrackClick={setSelectedTrackId}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <RisingStarsCard
              stars={dashboardData?.risingStars || []}
              onTrackClick={setSelectedTrackId}
            />
            <NewEntriesCard
              entries={dashboardData?.newEntries || []}
              onTrackClick={setSelectedTrackId}
            />
          </div>
        </>
      )}

      {/* Track Modal */}
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
