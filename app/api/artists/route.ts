import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { autoEnrichArtists } from '@/lib/autoEnrich'

async function getAvailableDates(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('chart_entries')
      .select('date')
      .eq('platform', 'spotify')
      .order('date', { ascending: false })

    if (error) {
      console.error('[ArtistsAPI] Error fetching available dates:', error)
      return []
    }

    const dates = [...new Set((data || []).map(e => format(new Date(e.date), 'yyyy-MM-dd')))].sort()
    return dates
  } catch (error) {
    console.error('[ArtistsAPI] Error getting available dates:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const limitParam = searchParams.get('limit')
    const periodParam = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const chartTypeParam = searchParams.get('chartType') as 'regional' | 'viral' || 'regional'
    const regionParam = searchParams.get('region') || null
    const limit = limitParam ? parseInt(limitParam, 10) : 50

    const availableDates = await getAvailableDates()
    const date = dateParam ? dateParam : (availableDates[availableDates.length - 1] || format(new Date(), 'yyyy-MM-dd'))

    // Build query with filters
    let query = supabase
      .from('chart_entries')
      .select(`
        *,
        artists (*),
        tracks (*)
      `)
      .lte('date', parseISO(date).toISOString())
      .eq('chartType', chartTypeParam)
      .eq('chartPeriod', periodParam)
      .eq('platform', 'spotify')
      .order('date', { ascending: false })
      .order('position', { ascending: true })
      .limit(limit * 10) // Get more entries to aggregate

    // Handle region filter
    if (regionParam === null || regionParam === 'global' || regionParam === '') {
      query = query.is('region', null)
    } else {
      query = query.eq('region', regionParam)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ArtistsAPI] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch artists', details: error.message },
        { status: 500 }
      )
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
    const latestDate = chartEntries[0]?.date ? new Date(chartEntries[0].date) : parseISO(date)
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
    const artists = Array.from(artistMap.values())
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
      .slice(0, limit)

    // Auto-enrich top artists in background (non-blocking)
    const topArtistIds = artists.slice(0, 5).map(a => a.id)
    autoEnrichArtists(topArtistIds).catch(() => {
      // Silently handle errors
    })

    return NextResponse.json({ 
      artists: artists || [], 
      date: format(latestDate, 'yyyy-MM-dd'),
      chartType: chartTypeParam,
      chartPeriod: periodParam,
      region: regionParam,
      availableDates,
    })
  } catch (error) {
    console.error('Error fetching artists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artists' },
      { status: 500 }
    )
  }
}

