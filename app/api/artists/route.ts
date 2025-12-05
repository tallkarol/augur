import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO, startOfYear, subDays } from 'date-fns'
import { autoEnrichArtists } from '@/lib/autoEnrich'
import { getAvailableDates } from '@/lib/serverUtils'
import { normalizeRegion } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const periodParam = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const chartTypeParam = searchParams.get('chartType') as 'regional' | 'viral' | 'blended' || 'regional'
    const regionParam = searchParams.get('region') || null
    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0

    const availableDates = await getAvailableDates()
    
    // Determine date range
    let startDate: Date
    let endDate: Date
    
    if (startDateParam && endDateParam) {
      startDate = parseISO(startDateParam)
      endDate = parseISO(endDateParam)
    } else if (dateParam) {
      startDate = parseISO(dateParam)
      endDate = parseISO(dateParam)
    } else {
      // Default to latest available date
      const latestDate = availableDates[availableDates.length - 1] || format(new Date(), 'yyyy-MM-dd')
      startDate = parseISO(latestDate)
      endDate = parseISO(latestDate)
    }

    // Build query with filters
    let query = supabase
      .from('chart_entries')
      .select(`
        *,
        artists (*),
        tracks (*)
      `)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .eq('chartPeriod', periodParam)
      .eq('platform', 'spotify')
      .order('date', { ascending: false })
      .order('position', { ascending: true })
      .limit(limit * 10) // Get more entries to aggregate

    // Handle chart type filter - 'blended' includes both viral and regional
    if (chartTypeParam === 'blended') {
      query = query.in('chartType', ['viral', 'regional'])
    } else {
      query = query.eq('chartType', chartTypeParam)
    }

    // Handle region filter
    const normalizedRegion = normalizeRegion(regionParam)
    if (regionParam === 'global') {
      query = query.is('region', null)
    } else if (normalizedRegion !== null && regionParam && regionParam !== '') {
      query = query.eq('region', normalizedRegion)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ArtistsAPI] Database error:', error)
      const errorResponse = NextResponse.json(
        { error: 'Failed to fetch artists', details: error.message },
        { status: 500 }
      )
      errorResponse.headers.set('Cache-Control', 'no-store')
      return errorResponse
    }

    const chartEntries = data || []

    // Aggregate by artist
    const artistMap = new Map<string, {
      artist: any
      bestPosition: number
      currentPosition: number
      tracks: Array<{ name: string; position: number }>
      totalStreams: bigint
    }>()

    // Get latest date's entries
    const latestDate = chartEntries[0]?.date ? new Date(chartEntries[0].date) : endDate
    const latestEntries = chartEntries.filter(e => {
      const entryDate = new Date(e.date)
      return entryDate.getTime() === latestDate.getTime()
    })

    latestEntries.forEach(entry => {
      const artistId = entry.artistId
      const artist = entry.artists || entry.artist
      const track = entry.tracks || entry.track
      
      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          artist: artist,
          bestPosition: entry.position,
          currentPosition: entry.position,
          tracks: [],
          totalStreams: BigInt(0),
        })
      }

      const artistData = artistMap.get(artistId)!
      artistData.bestPosition = Math.min(artistData.bestPosition, entry.position)
      artistData.currentPosition = Math.min(artistData.currentPosition, entry.position)
      artistData.tracks.push({
        name: track?.name || 'Unknown',
        position: entry.position,
      })
      if (entry.streams) {
        artistData.totalStreams += BigInt(entry.streams)
      }
    })

    // Get chart types for each artist (viral vs regional)
    const artistIds = Array.from(artistMap.keys())
    const chartTypesMap = new Map<string, Set<string>>()
    
    if (artistIds.length > 0) {
      const { data: allChartTypes } = await supabase
        .from('chart_entries')
        .select('artistId, chartType')
        .in('artistId', artistIds)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .eq('platform', 'spotify')

      if (allChartTypes) {
        allChartTypes.forEach(entry => {
          if (!chartTypesMap.has(entry.artistId)) {
            chartTypesMap.set(entry.artistId, new Set())
          }
          chartTypesMap.get(entry.artistId)!.add(entry.chartType)
        })
      }
    }

    // Convert to array and sort by best position
    const allArtists = Array.from(artistMap.values())
      .map(data => {
        const chartTypes = chartTypesMap.get(data.artist.id) || new Set()
        return {
          id: data.artist.id,
          name: data.artist.name,
          bestPosition: data.bestPosition,
          currentPosition: data.currentPosition,
          trackCount: data.tracks.length,
          topTrack: data.tracks.sort((a, b) => a.position - b.position)[0]?.name || '',
          totalStreams: data.totalStreams.toString(),
          chartTypes: Array.from(chartTypes), // ['regional', 'viral'] or ['regional'] or ['viral']
          isViral: chartTypes.has('viral'),
          isTop: chartTypes.has('regional'),
        }
      })
      .sort((a, b) => a.bestPosition - b.bestPosition)
    
    const total = allArtists.length
    const artists = allArtists.slice(offset, offset + limit)

    // Auto-enrich top artists in background (non-blocking)
    const topArtistIds = artists.slice(0, 5).map(a => a.id)
    autoEnrichArtists(topArtistIds).catch(() => {
      // Silently handle errors
    })

    // Calculate period stats
    const today = new Date()
    const thirtyDaysAgo = subDays(today, 30)
    const yearStart = startOfYear(today)
    
    // Query for period-specific stats
    const { data: last30DaysData } = await supabase
      .from('chart_entries')
      .select('position')
      .gte('date', thirtyDaysAgo.toISOString())
      .lte('date', today.toISOString())
      .in('artistId', artistIds.slice(0, 10))
      .eq('platform', 'spotify')
    
    const { data: thisYearData } = await supabase
      .from('chart_entries')
      .select('position')
      .gte('date', yearStart.toISOString())
      .lte('date', today.toISOString())
      .in('artistId', artistIds.slice(0, 10))
      .eq('platform', 'spotify')

    const periodStats = {
      last30Days: last30DaysData && last30DaysData.length > 0 ? {
        highestPosition: Math.min(...last30DaysData.map(d => d.position)),
        averagePosition: last30DaysData.reduce((sum, d) => sum + d.position, 0) / last30DaysData.length,
        daysInTop10: last30DaysData.filter(d => d.position <= 10).length,
        daysInTop20: last30DaysData.filter(d => d.position <= 20).length,
      } : null,
      thisYear: thisYearData && thisYearData.length > 0 ? {
        highestPosition: Math.min(...thisYearData.map(d => d.position)),
        averagePosition: thisYearData.reduce((sum, d) => sum + d.position, 0) / thisYearData.length,
        daysInTop10: thisYearData.filter(d => d.position <= 10).length,
        daysInTop20: thisYearData.filter(d => d.position <= 20).length,
      } : null,
    }

    const response = NextResponse.json({ 
      artists: artists || [], 
      total,
      limit,
      offset,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      date: format(latestDate, 'yyyy-MM-dd'),
      chartType: chartTypeParam,
      chartPeriod: periodParam,
      region: regionParam,
      availableDates,
      periodStats,
    })

    // Add caching headers - cache for 1 minute
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error fetching artists:', error)
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch artists' },
      { status: 500 }
    )
    errorResponse.headers.set('Cache-Control', 'no-store')
    return errorResponse
  }
}

