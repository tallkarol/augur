import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { spotifyClient } from '@/lib/spotify'
import { format, parseISO, subDays, startOfYear } from 'date-fns'
import { normalizeRegion } from '@/lib/utils'
import { calculateLeadScore, getLeadScoreMultipliers, calculateArtistLeadScore, groupEntriesByTrack, type TrackMetrics } from '@/lib/metrics'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const chartTypeParam = searchParams.get('chartType') as 'regional' | 'viral' || 'regional'
    const chartPeriodParam = searchParams.get('chartPeriod') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const regionParam = searchParams.get('region') || null

    const startDate = startDateParam ? parseISO(startDateParam) : new Date()
    startDate.setDate(startDate.getDate() - 30)
    const endDate = endDateParam ? parseISO(endDateParam) : new Date()

    // Fetch artist
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', params.id)
      .single()

    if (artistError || !artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      )
    }

    // Build chart entries query with filters
    let entriesQuery = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (*)
      `)
      .eq('artistId', params.id)
      .eq('chartType', chartTypeParam)
      .eq('chartPeriod', chartPeriodParam)
      .eq('platform', 'spotify')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true })
      .order('position', { ascending: true })

    // Handle region filter
    const normalizedRegion = normalizeRegion(regionParam)
    if (normalizedRegion === null) {
      entriesQuery = entriesQuery.is('region', null)
    } else {
      entriesQuery = entriesQuery.eq('region', normalizedRegion)
    }

    const { data: chartEntries, error: entriesError } = await entriesQuery

    if (entriesError) {
      console.error('[ArtistDetailAPI] Error fetching chart entries:', entriesError)
    }

    const entries = chartEntries || []

    // Get comprehensive cross-chart data (all charts/regions for this artist)
    let crossChartQuery = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (*)
      `)
      .eq('artistId', params.id)
      .eq('platform', 'spotify')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true })
      .order('position', { ascending: true })

    const { data: crossChartEntries } = await crossChartQuery

    // Organize cross-chart data by chart/region combination
    const crossChartData: Record<string, any[]> = {}
    if (crossChartEntries) {
      crossChartEntries.forEach(entry => {
        const key = `${entry.chartType}-${entry.chartPeriod}-${entry.region || 'global'}`
        if (!crossChartData[key]) {
          crossChartData[key] = []
        }
        crossChartData[key].push({
          date: entry.date,
          position: entry.position,
          streams: entry.streams ? Number(entry.streams) : null,
          trackName: entry.tracks?.name || 'Unknown',
          chartType: entry.chartType,
          chartPeriod: entry.chartPeriod,
          region: entry.region,
        })
      })
    }

    // Calculate stats
    let bestPosition = Infinity
    let totalStreams = BigInt(0)
    let totalTracks = new Set<string>()
    const positions: number[] = []

    entries.forEach(entry => {
      if (entry.position < bestPosition) {
        bestPosition = entry.position
      }
      positions.push(entry.position)
      totalTracks.add(entry.trackId)
      if (entry.streams) {
        totalStreams += BigInt(entry.streams)
      }
    })

    const averagePosition = positions.length > 0
      ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)
      : null

    // Calculate dashboard-style metrics (lead scores for all tracks)
    const trackMetricsMap = groupEntriesByTrack(entries)
    
    // Load multipliers once
    const multipliers = await getLeadScoreMultipliers()
    
    const trackLeadScoresPromises = Array.from(trackMetricsMap.values()).map(metrics => calculateLeadScore(metrics, multipliers))
    const trackLeadScores = await Promise.all(trackLeadScoresPromises)
    const aggregateLeadScore = calculateArtistLeadScore(trackLeadScores)
    
    // Get top performing track by lead score
    const topTrackByScorePromises = Array.from(trackMetricsMap.values()).map(async (metrics) => {
      const leadScore = await calculateLeadScore(metrics, multipliers)
      return {
        metrics,
        leadScore,
      }
    })
    const topTrackByScore = (await Promise.all(topTrackByScorePromises))
      .sort((a, b) => b.leadScore.score - a.leadScore.score)[0]

    // Get unique tracks
    const trackIds = Array.from(totalTracks)
    let tracksData = []
    
    if (trackIds.length > 0) {
      const { data: tracks } = await supabase
        .from('tracks')
        .select('*')
        .in('id', trackIds)
        .eq('artistId', params.id)

      tracksData.push(...(tracks || []))
    }

    // If no chart tracks, try to get top tracks from Spotify
    if (tracksData.length === 0 && artist.externalId) {
      try {
        const spotifyTracks = await spotifyClient.getArtistTopTracks(artist.externalId)
        tracksData = spotifyTracks.map((track, index) => ({
          id: track.id,
          name: track.name,
          externalId: track.id,
          imageUrl: track.album.images[0]?.url || null,
          albumName: track.album.name,
          popularity: track.popularity,
          previewUrl: track.preview_url,
          duration: track.duration_ms,
          artistId: artist.id,
          // Add position based on index
          position: index + 1,
        }))
      } catch (error) {
        console.error('[ArtistDetailAPI] Error fetching Spotify top tracks:', error)
      }
    }

    // Check if artist is tracked
    const { data: trackedArtist } = await supabase
      .from('tracked_artists')
      .select('*')
      .eq('artistId', params.id)
      .single()

    // Get chart appearances summary
    const chartAppearances = {
      total: entries.length,
      chartTypes: [...new Set(entries.map(e => e.chartType))],
      regions: [...new Set(entries.map(e => e.region).filter(Boolean))],
      periods: [...new Set(entries.map(e => e.chartPeriod))],
    }

    // Format chart history
    const chartHistory = entries.map(entry => ({
      date: entry.date,
      position: entry.position,
      streams: entry.streams ? Number(entry.streams) : null,
      trackName: entry.tracks?.name || 'Unknown',
    }))

    // Calculate stats for LAST 30 DAYS period
    const last30DaysStart = subDays(endDate, 30)
    const last30DaysEntries = entries.filter(e => {
      const entryDate = new Date(e.date)
      return entryDate >= last30DaysStart && entryDate <= endDate
    })
    const last30DaysTrackMetricsMap = groupEntriesByTrack(last30DaysEntries)
    const last30DaysTrackScoresPromises = Array.from(last30DaysTrackMetricsMap.values()).map(metrics => calculateLeadScore(metrics, multipliers))
    const last30DaysTrackScores = await Promise.all(last30DaysTrackScoresPromises)
    const last30DaysAggregateLeadScore = calculateArtistLeadScore(last30DaysTrackScores)
    const last30DaysPositions = last30DaysEntries.map(e => e.position)
    const last30DaysBestPosition = last30DaysPositions.length > 0 ? Math.min(...last30DaysPositions) : null
    const last30DaysAveragePosition = last30DaysPositions.length > 0
      ? Math.round(last30DaysPositions.reduce((a, b) => a + b, 0) / last30DaysPositions.length)
      : null
    const last30DaysDaysInTop10 = last30DaysPositions.filter(p => p <= 10).length
    const last30DaysDaysInTop20 = last30DaysPositions.filter(p => p <= 20).length

    // Calculate stats for THIS YEAR period
    const thisYearStart = startOfYear(endDate)
    const thisYearEntries = entries.filter(e => {
      const entryDate = new Date(e.date)
      return entryDate >= thisYearStart && entryDate <= endDate
    })
    const thisYearTrackMetricsMap = groupEntriesByTrack(thisYearEntries)
    const thisYearTrackScoresPromises = Array.from(thisYearTrackMetricsMap.values()).map(metrics => calculateLeadScore(metrics, multipliers))
    const thisYearTrackScores = await Promise.all(thisYearTrackScoresPromises)
    const thisYearAggregateLeadScore = calculateArtistLeadScore(thisYearTrackScores)
    const thisYearPositions = thisYearEntries.map(e => e.position)
    const thisYearBestPosition = thisYearPositions.length > 0 ? Math.min(...thisYearPositions) : null
    const thisYearAveragePosition = thisYearPositions.length > 0
      ? Math.round(thisYearPositions.reduce((a, b) => a + b, 0) / thisYearPositions.length)
      : null
    const thisYearDaysInTop10 = thisYearPositions.filter(p => p <= 10).length
    const thisYearDaysInTop20 = thisYearPositions.filter(p => p <= 20).length

    return NextResponse.json({
      artist,
      tracks: tracksData,
      chartHistory,
      crossChartData, // New: comprehensive data across all charts/regions
      stats: {
        bestPosition: bestPosition === Infinity ? null : bestPosition,
        averagePosition,
        totalStreams: totalStreams.toString(),
        totalTracks: totalTracks.size,
        isTracked: !!trackedArtist,
        chartAppearances,
        // Dashboard metrics
        aggregateLeadScore,
        topTrackLeadScore: topTrackByScore ? {
          trackName: topTrackByScore.metrics.trackName,
          score: topTrackByScore.leadScore.score,
          breakdown: topTrackByScore.leadScore.breakdown,
        } : null,
        // Period-specific stats
        last30Days: {
          highestPosition: last30DaysBestPosition,
          averagePosition: last30DaysAveragePosition,
          daysInTop10: last30DaysDaysInTop10,
          daysInTop20: last30DaysDaysInTop20,
          leadScore: last30DaysAggregateLeadScore,
        },
        thisYear: {
          highestPosition: thisYearBestPosition,
          averagePosition: thisYearAveragePosition,
          daysInTop10: thisYearDaysInTop10,
          daysInTop20: thisYearDaysInTop20,
          leadScore: thisYearAggregateLeadScore,
        },
      },
    })
  } catch (error) {
    console.error('[ArtistDetailAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch artist details',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
