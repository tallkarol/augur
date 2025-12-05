import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO, subDays, startOfYear } from 'date-fns'
import { enrichTrackData, enrichArtistData } from '@/lib/enrichArtistData'
import { calculateLeadScore, getLeadScoreMultipliers, hasUpwardTrend, calculateConsistencyScore, type TrackMetrics } from '@/lib/metrics'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const chartTypeParam = searchParams.get('chartType') as 'regional' | 'viral' || 'regional'
    const chartPeriodParam = searchParams.get('chartPeriod') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const regionParam = searchParams.get('region') || null

    // Default to last 30 days if no dates provided
    const endDate = endDateParam ? parseISO(endDateParam) : new Date()
    const startDate = startDateParam 
      ? parseISO(startDateParam) 
      : subDays(endDate, 30)

    console.log(`[TRACK DETAILS] GET /api/tracks/${trackId}`)
    console.log(`[TRACK DETAILS] Fetching track ${trackId} with dates ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`)

    // Fetch track details
    let tracks, trackError
    try {
      const result = await supabase
        .from('tracks')
        .select(`
          *,
          artist:artists(*)
        `)
        .eq('id', trackId)
        .limit(1)
      tracks = result.data
      trackError = result.error
    } catch (error) {
      console.error(`[TRACK DETAILS] Supabase error:`, error)
      return NextResponse.json(
        { error: 'Database unavailable. Please ensure Supabase is configured.' },
        { status: 503 }
      )
    }

    if (trackError) {
      console.error(`[TRACK DETAILS] Error fetching track:`, trackError)
      return NextResponse.json(
        { error: `Failed to fetch track: ${trackError.message}` },
        { status: 500 }
      )
    }

    if (!tracks || tracks.length === 0) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }

    const track = tracks[0]
    const artist = track.artist
    
    console.log(`[TRACK DETAILS] Found track: ${track.name} by ${artist?.name || 'Unknown'}`)

    // Enrich track and artist with Spotify API if not already enriched
    const enrichedTrack = await enrichTrackData(track, artist?.name, true) // Save to DB if found in Supabase
    const enrichedArtist = artist ? await enrichArtistData(artist, true) : null

    // Build chart entries query with filters
    let entriesQuery = supabase
      .from('chart_entries')
      .select('*')
      .eq('trackId', trackId)
      .eq('chartType', chartTypeParam)
      .eq('chartPeriod', chartPeriodParam)
      .eq('platform', 'spotify')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true })
      .order('position', { ascending: true })

    // Handle region filter
    if (regionParam === null || regionParam === 'global' || regionParam === '') {
      entriesQuery = entriesQuery.is('region', null)
    } else {
      entriesQuery = entriesQuery.eq('region', regionParam)
    }

    const { data: chartEntries, error: entriesError } = await entriesQuery

    if (entriesError) {
      console.error(`[TRACK DETAILS] Error fetching chart entries:`, entriesError)
    }

    // Process chart history for position chart
    const positionHistory = (chartEntries || [])
      .reduce((acc: any, entry: any) => {
        const dateStr = format(new Date(entry.date), 'yyyy-MM-dd')
        if (!acc[dateStr]) {
          acc[dateStr] = { date: dateStr, position: entry.position, streams: 0 }
        }
        // Use best (lowest) position for the day
        acc[dateStr].position = Math.min(acc[dateStr].position, entry.position)
        if (entry.streams) {
          acc[dateStr].streams += parseInt(entry.streams.toString())
        }
        return acc
      }, {})

    const chartData = Object.values(positionHistory).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    )

    // Get region comparison data if no specific region filter
    let regionComparisonData: Record<string, any[]> = {}
    if (!regionParam || regionParam === 'global' || regionParam === '') {
      // Fetch entries across all regions for comparison
      const { data: allRegionEntries } = await supabase
        .from('chart_entries')
        .select('*')
        .eq('trackId', trackId)
        .eq('chartType', chartTypeParam)
        .eq('chartPeriod', chartPeriodParam)
        .eq('platform', 'spotify')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: true })
        .order('position', { ascending: true })

      // Group by region
      if (allRegionEntries) {
        allRegionEntries.forEach((entry: any) => {
          const regionKey = entry.region || 'global'
          const dateStr = format(new Date(entry.date), 'yyyy-MM-dd')
          
          if (!regionComparisonData[regionKey]) {
            regionComparisonData[regionKey] = []
          }
          
          // Check if we already have an entry for this date in this region
          const existingIndex = regionComparisonData[regionKey].findIndex((e: any) => e.date === dateStr)
          if (existingIndex >= 0) {
            // Use best position if multiple entries for same date
            regionComparisonData[regionKey][existingIndex].position = Math.min(
              regionComparisonData[regionKey][existingIndex].position,
              entry.position
            )
          } else {
            regionComparisonData[regionKey].push({
              date: dateStr,
              position: entry.position,
              streams: entry.streams ? parseInt(entry.streams.toString()) : null,
            })
          }
        })

        // Sort each region's data by date
        Object.keys(regionComparisonData).forEach(region => {
          regionComparisonData[region].sort((a: any, b: any) => a.date.localeCompare(b.date))
        })
      }
    }

    // Calculate stats
    const allPositions = (chartEntries || []).map((e: any) => e.position)
    const allStreams = (chartEntries || [])
      .map((e: any) => e.streams ? parseInt(e.streams.toString()) : 0)
      .reduce((sum, s) => sum + s, 0)
    
    const peakStreams = chartEntries && chartEntries.length > 0
      ? Math.max(...chartEntries.map((e: any) => e.streams ? parseInt(e.streams.toString()) : 0))
      : 0

    // Calculate dashboard-style metrics
    const positions = (chartEntries || []).map((e: any) => e.position)
    const dates = (chartEntries || []).map((e: any) => format(new Date(e.date), 'yyyy-MM-dd'))
    
    const trackMetrics: TrackMetrics = {
      trackId: track.id,
      trackName: track.name,
      artistId: artist?.id || '',
      artistName: artist?.name || 'Unknown',
      positions,
      dates,
      chartType: chartTypeParam,
      chartPeriod: chartPeriodParam,
      region: regionParam,
    }
    
    // Load multipliers
    const multipliers = await getLeadScoreMultipliers()
    
    const leadScore = await calculateLeadScore(trackMetrics, multipliers)
    const hasRisingTrend = hasUpwardTrend(positions)
    const consistencyScore = positions.length >= 2 ? calculateConsistencyScore(positions) : null

    // Calculate stats for LAST 30 DAYS period
    const last30DaysStart = subDays(endDate, 30)
    const last30DaysEntries = (chartEntries || []).filter((e: any) => {
      const entryDate = new Date(e.date)
      return entryDate >= last30DaysStart && entryDate <= endDate
    })
    const last30DaysPositions = last30DaysEntries.map((e: any) => e.position)
    const last30DaysMetrics: TrackMetrics = {
      ...trackMetrics,
      positions: last30DaysPositions,
      dates: last30DaysEntries.map((e: any) => format(new Date(e.date), 'yyyy-MM-dd')),
    }
    const last30DaysLeadScore = await calculateLeadScore(last30DaysMetrics, multipliers)

    // Calculate stats for THIS YEAR period
    const thisYearStart = startOfYear(endDate)
    const thisYearEntries = (chartEntries || []).filter((e: any) => {
      const entryDate = new Date(e.date)
      return entryDate >= thisYearStart && entryDate <= endDate
    })
    const thisYearPositions = thisYearEntries.map((e: any) => e.position)
    const thisYearMetrics: TrackMetrics = {
      ...trackMetrics,
      positions: thisYearPositions,
      dates: thisYearEntries.map((e: any) => format(new Date(e.date), 'yyyy-MM-dd')),
    }
    const thisYearLeadScore = await calculateLeadScore(thisYearMetrics, multipliers)

    const stats = {
      bestPosition: allPositions.length > 0 ? Math.min(...allPositions) : null,
      averagePosition: allPositions.length > 0 
        ? Math.round((allPositions.reduce((a, b) => a + b, 0) / allPositions.length) * 10) / 10
        : null,
      totalStreams: allStreams,
      daysOnChart: chartEntries?.length || 0,
      peakStreams,
      // Dashboard metrics
      leadScore: leadScore.score,
      leadScoreBreakdown: leadScore.breakdown,
      hasRisingTrend,
      consistencyScore,
      // Period-specific stats
      last30Days: {
        highestPosition: last30DaysPositions.length > 0 ? Math.min(...last30DaysPositions) : null,
        averagePosition: last30DaysPositions.length > 0 
          ? Math.round((last30DaysPositions.reduce((a, b) => a + b, 0) / last30DaysPositions.length) * 10) / 10
          : null,
        daysInTop10: last30DaysLeadScore.breakdown.daysInTop10,
        daysInTop20: last30DaysLeadScore.breakdown.daysInTop20,
        leadScore: last30DaysLeadScore.score,
      },
      thisYear: {
        highestPosition: thisYearPositions.length > 0 ? Math.min(...thisYearPositions) : null,
        averagePosition: thisYearPositions.length > 0 
          ? Math.round((thisYearPositions.reduce((a, b) => a + b, 0) / thisYearPositions.length) * 10) / 10
          : null,
        daysInTop10: thisYearLeadScore.breakdown.daysInTop10,
        daysInTop20: thisYearLeadScore.breakdown.daysInTop20,
        leadScore: thisYearLeadScore.score,
      },
    }

    return NextResponse.json({
      track: enrichedTrack,
      artist: enrichedArtist ? {
        ...enrichedArtist,
        followers: enrichedArtist.followers?.toString(),
      } : null,
      chartHistory: chartData,
      regionComparison: Object.keys(regionComparisonData).length > 0 ? regionComparisonData : null,
      stats,
    })
  } catch (error) {
    console.error('[TRACK DETAILS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch track details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
