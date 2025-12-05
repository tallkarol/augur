import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO, subDays } from 'date-fns'
import { getAvailableDates } from '@/lib/serverUtils'
import { normalizeRegion } from '@/lib/utils'
import {
  calculateLeadScore,
  getLeadScoreMultipliers,
  groupEntriesByTrack,
  groupEntriesByArtist,
  hasUpwardTrend,
  calculateConsistencyScore,
  calculateArtistLeadScore,
  type TrackMetrics,
} from '@/lib/metrics'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const chartTypeParam = searchParams.get('chartType') as 'regional' | 'viral' | 'blended' || 'blended'
    const chartPeriodParam = searchParams.get('chartPeriod') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const regionParam = searchParams.get('region') || null
    const refresh = searchParams.get('refresh') === 'true'
    
    // Force refresh available dates if refresh param is set
    const availableDates = await getAvailableDates(refresh)
    
    // Determine date range
    let startDate: Date
    let endDate: Date
    
    if (startDateParam && endDateParam) {
      startDate = parseISO(startDateParam)
      endDate = parseISO(endDateParam)
    } else {
      // Default to latest available date (daily view)
      const latestDate = availableDates[availableDates.length - 1] || format(new Date(), 'yyyy-MM-dd')
      endDate = parseISO(latestDate)
      startDate = endDate
    }

    // Determine view type based on date range
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const viewType: 'daily' | 'weekly' | 'monthly' | 'yearly' = 
      daysDiff === 0 ? 'daily' :
      daysDiff <= 7 ? 'weekly' :
      daysDiff <= 90 ? 'monthly' :
      'yearly'

    const startDateISO = startDate.toISOString()
    const endDateISO = endDate.toISOString()
    const normalizedRegion = normalizeRegion(regionParam)
    
    console.log('[DashboardAPI] Query params:', {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      daysDiff,
      viewType,
      chartPeriodParam,
      chartTypeParam,
      regionParam,
      normalizedRegion,
      availableDatesCount: availableDates.length,
    })

    // Build query - always use daily data for aggregation
    let query = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (*),
        artists (*)
      `)
      .gte('date', startDateISO)
      .lte('date', endDateISO)
      .eq('chartPeriod', chartPeriodParam) // Default to 'daily'
      .eq('platform', 'spotify')
      .order('date', { ascending: true })
      .order('position', { ascending: true })

    // Handle chart type filter - 'blended' includes both viral and regional
    if (chartTypeParam === 'blended') {
      query = query.in('chartType', ['viral', 'regional'])
    } else {
      query = query.eq('chartType', chartTypeParam)
    }

    // Handle region filter
    // If 'global' is specified, filter to region IS NULL (global charts)
    // If a specific region like 'us' is selected, filter to that region only
    // If no region is specified (empty/null), show ALL regions
    if (regionParam === 'global') {
      query = query.is('region', null)
    } else if (normalizedRegion !== null && regionParam && regionParam !== '') {
      query = query.eq('region', normalizedRegion)
    }
    // If normalizedRegion is null/empty and not 'global', we don't add a region filter - show all regions

    // For date ranges, we need more entries to calculate aggregations
    // Limit based on view type
    const limit = viewType === 'daily' ? 200 : 5000
    const { data: chartEntries, error: entriesError } = await query.limit(limit)
    
    console.log('[DashboardAPI] Query result:', {
      entriesCount: chartEntries?.length || 0,
      error: entriesError?.message,
      sampleEntry: chartEntries?.[0] ? {
        date: chartEntries[0].date,
        chartType: chartEntries[0].chartType,
        chartPeriod: chartEntries[0].chartPeriod,
        region: chartEntries[0].region,
        position: chartEntries[0].position,
      } : null,
    })

    if (entriesError) {
      console.error('[DashboardAPI] Error fetching chart entries:', entriesError)
      const errorResponse = NextResponse.json({
        dateRange: { startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') },
        viewType,
        availableDates,
        error: entriesError.message,
      })
      errorResponse.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
      return errorResponse
    }

    const entries = chartEntries || []

    // Get tracked artists status
    const { data: trackedArtists } = await supabase
      .from('tracked_artists')
      .select('artistId')
    
    const trackedArtistIds = new Set((trackedArtists || []).map(ta => ta.artistId))
    const trackedArtistsCharting = entries.filter(e => trackedArtistIds.has(e.artistId))
    const trackedArtistsChartingCount = new Set(trackedArtistsCharting.map(e => e.artistId)).size

    // Process based on view type
    if (viewType === 'daily') {
      return processDailyView(entries, trackedArtistIds, startDate, endDate, chartTypeParam, regionParam, availableDates, refresh)
    } else {
      return processAggregateView(entries, trackedArtistIds, startDate, endDate, viewType, chartTypeParam, regionParam, availableDates, refresh)
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

/**
 * Process daily view - day-over-day comparisons
 */
async function processDailyView(
  entries: any[],
  trackedArtistIds: Set<string>,
  startDate: Date,
  endDate: Date,
  chartType: string,
  region: string | null,
  availableDates: string[],
  refresh: boolean
) {
  // Get previous day's entries for comparison
  const previousDate = subDays(startDate, 1)
  const previousDateISO = previousDate.toISOString()
  
  let prevQuery = supabase
    .from('chart_entries')
    .select('*, tracks (*), artists (*)')
    .eq('date', previousDateISO)
    .eq('chartPeriod', 'daily')
    .eq('platform', 'spotify')
  
  if (chartType === 'blended') {
    prevQuery = prevQuery.in('chartType', ['viral', 'regional'])
  } else {
    prevQuery = prevQuery.eq('chartType', chartType)
  }
  
  const normalizedRegion = normalizeRegion(region)
  if (normalizedRegion !== null && region && region !== '') {
    prevQuery = prevQuery.eq('region', normalizedRegion)
  }
  
  const { data: previousEntries } = await prevQuery.limit(200)
  
  // Create map of previous positions by track key
  const previousPositions = new Map<string, number>()
  previousEntries?.forEach(entry => {
    const key = `${entry.trackId}-${entry.chartType}-${entry.chartPeriod}-${entry.region || 'global'}`
    const existing = previousPositions.get(key)
    if (!existing || entry.position < existing) {
      previousPositions.set(key, entry.position)
    }
  })
  
  // Calculate day-over-day changes
  const tracksWithChange = entries.map(entry => {
    const key = `${entry.trackId}-${entry.chartType}-${entry.chartPeriod}-${entry.region || 'global'}`
    const previousPosition = previousPositions.get(key) || null
    return {
      id: entry.trackId,
      name: entry.tracks?.name || 'Unknown',
      artist: entry.artists?.name || 'Unknown',
      artistId: entry.artistId,
      position: entry.position,
      previousPosition,
      change: previousPosition ? previousPosition - entry.position : null,
    }
  })
  
  const biggestMovers = tracksWithChange
    .filter(t => t.change !== null && t.change > 0)
    .sort((a, b) => (b.change || 0) - (a.change || 0))
    .slice(0, 10)
  
  const biggestDrops = tracksWithChange
    .filter(t => t.change !== null && t.change < 0)
    .sort((a, b) => (a.change || 0) - (b.change || 0))
    .slice(0, 10)
  
  // New entries: in today but not yesterday
  const todayTrackKeys = new Set(entries.map(e => `${e.trackId}-${e.chartType}-${e.chartPeriod}-${e.region || 'global'}`))
  const yesterdayTrackKeys = new Set(previousEntries?.map(e => `${e.trackId}-${e.chartType}-${e.chartPeriod}-${e.region || 'global'}`) || [])
  const newEntries = entries
    .filter(e => {
      const key = `${e.trackId}-${e.chartType}-${e.chartPeriod}-${e.region || 'global'}`
      return !yesterdayTrackKeys.has(key)
    })
    .map(entry => ({
      id: entry.trackId,
      name: entry.tracks?.name || 'Unknown',
      artist: entry.artists?.name || 'Unknown',
      position: entry.position,
    }))
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
  
  // Exits: in yesterday but not today
  const exits = (previousEntries || [])
    .filter(e => {
      const key = `${e.trackId}-${e.chartType}-${e.chartPeriod}-${e.region || 'global'}`
      return !todayTrackKeys.has(key)
    })
    .map(entry => ({
      id: entry.trackId,
      name: entry.tracks?.name || 'Unknown',
      artist: entry.artists?.name || 'Unknown',
      position: entry.position,
    }))
    .slice(0, 10)
  
  const trackedArtistsCharting = entries.filter(e => trackedArtistIds.has(e.artistId))
  const trackedArtistsChartingCount = new Set(trackedArtistsCharting.map(e => e.artistId)).size
  
  const biggestMover = biggestMovers.length > 0 ? biggestMovers[0] : null
  
  const topTracks = entries
    .slice(0, 10)
    .map(entry => ({
      id: entry.trackId,
      name: entry.tracks?.name || 'Unknown',
      artist: entry.artists?.name || 'Unknown',
      position: entry.position,
      streams: entry.streams ? entry.streams.toString() : '0',
    }))
  
  // Top artists
  const artistMap = new Map<string, any>()
  entries.forEach(entry => {
    const artistId = entry.artistId
    if (!artistMap.has(artistId)) {
      artistMap.set(artistId, {
        id: artistId,
        name: entry.artists?.name || 'Unknown',
        bestPosition: entry.position,
        trackCount: 0,
      })
    }
    const artistData = artistMap.get(artistId)!
    artistData.bestPosition = Math.min(artistData.bestPosition, entry.position)
    artistData.trackCount += 1
  })
  
  const topArtists = Array.from(artistMap.values())
    .sort((a, b) => a.bestPosition - b.bestPosition)
    .slice(0, 10)
    .map(artist => {
      const artistEntries = entries.filter(e => e.artistId === artist.id)
      const topTrackEntry = artistEntries.sort((a, b) => a.position - b.position)[0]
      return {
        id: artist.id,
        name: artist.name,
        bestPosition: artist.bestPosition,
        trackCount: artist.trackCount,
        topTrack: topTrackEntry?.tracks?.name || 'Unknown',
      }
    })
  
  const response = NextResponse.json({
    viewType: 'daily',
    dateRange: { startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') },
    chartType,
    region,
    availableDates,
    biggestMovers,
    biggestDrops,
    newEntries,
    exits,
    topTracks,
    topArtists,
    summary: {
      trackedArtistsTotal: trackedArtistIds.size,
      trackedArtistsCharting: trackedArtistsChartingCount,
      biggestMover: biggestMover ? {
        track: biggestMover.name,
        artist: biggestMover.artist,
        position: biggestMover.position,
        change: biggestMover.change,
        previousPosition: biggestMover.previousPosition,
      } : null,
      newEntriesCount: newEntries.length,
    },
  })
  
  if (refresh) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  } else {
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
  }
  
  return response
}

/**
 * Process aggregate views (weekly/monthly/yearly) - lead scores and trends
 */
async function processAggregateView(
  entries: any[],
  trackedArtistIds: Set<string>,
  startDate: Date,
  endDate: Date,
  viewType: 'weekly' | 'monthly' | 'yearly',
  chartType: string,
  region: string | null,
  availableDates: string[],
  refresh: boolean
) {
  // Group entries by track
  const trackMetricsMap = groupEntriesByTrack(entries)
  
  // Load multipliers once for all calculations
  const multipliers = await getLeadScoreMultipliers()
  
  // Calculate lead scores for each track
  const trackScoresPromises = Array.from(trackMetricsMap.values()).map(async (metrics) => {
    const leadScore = await calculateLeadScore(metrics, multipliers)
    return {
      ...metrics,
      leadScore: leadScore.score,
      breakdown: leadScore.breakdown,
      hasUpwardTrend: hasUpwardTrend(metrics.positions),
    }
  })
  const trackScores = await Promise.all(trackScoresPromises)
  
  // Lead score leaders
  const leadScoreLeaders = trackScores
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 20)
    .map(track => ({
      id: track.trackId,
      name: track.trackName,
      artist: track.artistName,
      artistId: track.artistId,
      leadScore: track.leadScore,
      breakdown: track.breakdown,
      avgPosition: track.breakdown.averagePosition,
      bestPosition: track.breakdown.bestPosition,
    }))
  
  // Rising stars (consistent upward trend)
  const risingStars = trackScores
    .filter(t => t.hasUpwardTrend)
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 10)
    .map(track => ({
      id: track.trackId,
      name: track.trackName,
      artist: track.artistName,
      avgPosition: track.breakdown.averagePosition,
      bestPosition: track.breakdown.bestPosition,
      leadScore: track.leadScore,
    }))
  
  // Consistent performers (5+ days in top 20 for weekly, 20+ for monthly/yearly)
  const minDaysInTop20 = viewType === 'weekly' ? 5 : 20
  const consistentPerformers = trackScores
    .filter(t => t.breakdown.daysInTop20 >= minDaysInTop20)
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 10)
    .map(track => ({
      id: track.trackId,
      name: track.trackName,
      artist: track.artistName,
      daysInTop20: track.breakdown.daysInTop20,
      avgPosition: track.breakdown.averagePosition,
    }))
  
  // New entries (tracks that first appeared during this period)
  // Find earliest date for each track
  const trackFirstAppearance = new Map<string, string>()
  entries.forEach(entry => {
    const key = entry.trackId
    const existing = trackFirstAppearance.get(key)
    if (!existing || entry.date < existing) {
      trackFirstAppearance.set(key, entry.date)
    }
  })
  
  const periodStartISO = startDate.toISOString()
  const newEntries = Array.from(trackFirstAppearance.entries())
    .filter(([_, firstDate]) => firstDate >= periodStartISO)
    .map(([trackId]) => {
      const trackEntries = entries.filter(e => e.trackId === trackId)
      const latest = trackEntries.sort((a, b) => b.date.localeCompare(a.date))[0]
      return {
        id: trackId,
        name: latest.tracks?.name || 'Unknown',
        artist: latest.artists?.name || 'Unknown',
        position: latest.position,
      }
    })
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
  
  // Top tracks by average position
  const topTracks = trackScores
    .sort((a, b) => a.breakdown.averagePosition - b.breakdown.averagePosition)
    .slice(0, 10)
    .map(track => ({
      id: track.trackId,
      name: track.trackName,
      artist: track.artistName,
      avgPosition: track.breakdown.averagePosition,
      bestPosition: track.breakdown.bestPosition,
      leadScore: track.leadScore,
    }))
  
  // Top artists - aggregate by artist
  const artistMap = groupEntriesByArtist(entries)
  const artistScoresPromises = Array.from(artistMap.entries()).map(async ([artistId, artistEntries]) => {
    // Get all tracks for this artist
    const artistTrackKeys = new Set(
      artistEntries.map(e => `${e.trackId}-${e.chartType}-${e.chartPeriod}-${e.region || 'global'}`)
    )
    const artistTrackMetrics = Array.from(trackMetricsMap.values()).filter(
      m => artistTrackKeys.has(`${m.trackId}-${m.chartType}-${m.chartPeriod}-${m.region || 'global'}`)
    )
    
    const trackLeadScoresPromises = artistTrackMetrics.map(m => calculateLeadScore(m, multipliers))
    const trackLeadScores = await Promise.all(trackLeadScoresPromises)
    const aggregateLeadScore = calculateArtistLeadScore(trackLeadScores)
    
    // Calculate aggregate metrics
    const allPositions = artistEntries.map(e => e.position)
    const avgPosition = allPositions.reduce((sum, p) => sum + p, 0) / allPositions.length
    const bestPosition = Math.min(...allPositions)
    const uniqueTracks = new Set(artistEntries.map(e => e.trackId)).size
    
    // Find top track
    const topTrackWithScorePromises = artistTrackMetrics.map(async (metrics) => {
      const leadScore = await calculateLeadScore(metrics, multipliers)
      return {
        metrics,
        score: leadScore.score,
        breakdown: leadScore.breakdown,
      }
    })
    const topTrackWithScore = (await Promise.all(topTrackWithScorePromises))
      .sort((a, b) => b.score - a.score)[0]
    
    return {
      id: artistId,
      name: artistEntries[0]?.artists?.name || 'Unknown',
      trackCount: uniqueTracks,
      avgPosition: Math.round(avgPosition * 10) / 10,
      bestPosition,
      leadScore: aggregateLeadScore,
      topTrack: topTrackWithScore ? {
        name: topTrackWithScore.metrics.trackName,
        position: topTrackWithScore.breakdown.bestPosition,
      } : null,
      consistencyScore: viewType === 'yearly' ? calculateConsistencyScore(allPositions) : null,
    }
  })
  const artistScores = await Promise.all(artistScoresPromises)
  
  const topArtists = artistScores
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 10)
  
  const trackedArtistsCharting = entries.filter(e => trackedArtistIds.has(e.artistId))
  const trackedArtistsChartingCount = new Set(trackedArtistsCharting.map(e => e.artistId)).size
  
  const topLeadScore = leadScoreLeaders.length > 0 ? leadScoreLeaders[0] : null
  
  const response = NextResponse.json({
    viewType,
    dateRange: { startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') },
    chartType,
    region,
    availableDates,
    leadScoreLeaders,
    risingStars,
    consistentPerformers,
    newEntries,
    topTracks,
    topArtists,
    summary: {
      trackedArtistsTotal: trackedArtistIds.size,
      trackedArtistsCharting: trackedArtistsChartingCount,
      topLeadScore: topLeadScore ? {
        track: topLeadScore.name,
        artist: topLeadScore.artist,
        score: topLeadScore.leadScore,
        breakdown: topLeadScore.breakdown,
      } : null,
      newOpportunitiesCount: newEntries.length,
    },
  })
  
  if (refresh) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  } else {
    const cacheTime = viewType === 'weekly' ? 60 : viewType === 'monthly' ? 300 : 600
    response.headers.set('Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`)
  }
  
  return response
}
