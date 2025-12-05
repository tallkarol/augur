import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'

async function getAvailableDates(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('chart_entries')
      .select('date')
      .eq('platform', 'spotify')
      .order('date', { ascending: false })

    if (error) {
      console.error('[DashboardAPI] Error fetching available dates:', error)
      return []
    }

    const dates = [...new Set((data || []).map(e => format(new Date(e.date), 'yyyy-MM-dd')))].sort()
    return dates
  } catch (error) {
    console.error('[DashboardAPI] Error getting available dates:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const periodParam = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const chartTypeParam = searchParams.get('chartType') as 'regional' | 'viral' | 'blended' || 'regional'
    const regionParam = searchParams.get('region') || null
    
    const availableDates = await getAvailableDates()
    const date = dateParam || availableDates[availableDates.length - 1] || format(new Date(), 'yyyy-MM-dd')

    // Build query with filters
    let query = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (*),
        artists (*)
      `)
      .eq('date', parseISO(date).toISOString())
      .eq('chartPeriod', periodParam)
      .eq('platform', 'spotify')
      .order('position', { ascending: true })

    // Handle chart type filter - 'blended' includes both viral and regional
    if (chartTypeParam === 'blended') {
      query = query.in('chartType', ['viral', 'regional'])
    } else {
      query = query.eq('chartType', chartTypeParam)
    }

    // Handle region filter
    if (regionParam === null || regionParam === 'global' || regionParam === '') {
      query = query.is('region', null)
    } else {
      query = query.eq('region', regionParam)
    }

    const { data: chartEntries, error: entriesError } = await query

    if (entriesError) {
      console.error('[DashboardAPI] Error fetching chart entries:', entriesError)
      return NextResponse.json({
        date,
        period: periodParam,
        availableDates,
        biggestMovers: [],
        biggestDrops: [],
        newEntries: [],
        topTracks: [],
        topArtists: [],
      })
    }

    const entries = chartEntries || []

    // Calculate biggest movers (improved position)
    const tracksWithChange = entries.map(entry => ({
      id: entry.trackId,
      name: entry.tracks?.name || 'Unknown',
      artist: entry.artists?.name || 'Unknown',
      position: entry.position,
      previousPosition: entry.previousRank,
      change: entry.previousRank ? entry.previousRank - entry.position : null,
    }))

    const biggestMovers = tracksWithChange
      .filter(t => t.change !== null && t.change > 0)
      .sort((a, b) => (b.change || 0) - (a.change || 0))
      .slice(0, 10)

    const biggestDrops = tracksWithChange
      .filter(t => t.change !== null && t.change < 0)
      .sort((a, b) => (a.change || 0) - (b.change || 0))
      .slice(0, 10)

    const newEntries = tracksWithChange
      .filter(t => t.change === null || t.previousPosition === null)
      .sort((a, b) => a.position - b.position)
      .slice(0, 10)

    // Top tracks
    const topTracks = entries
      .slice(0, 10)
      .map(entry => ({
        id: entry.trackId,
        name: entry.tracks?.name || 'Unknown',
        artist: entry.artists?.name || 'Unknown',
        position: entry.position,
        streams: entry.streams ? entry.streams.toString() : '0',
      }))

    // Top artists (aggregate by artist)
    const artistMap = new Map<string, {
      id: string
      name: string
      bestPosition: number
      trackCount: number
      totalStreams: bigint
    }>()

    entries.forEach(entry => {
      const artistId = entry.artistId
      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          id: artistId,
          name: entry.artists?.name || 'Unknown',
          bestPosition: entry.position,
          trackCount: 0,
          totalStreams: BigInt(0),
        })
      }
      const artistData = artistMap.get(artistId)!
      artistData.bestPosition = Math.min(artistData.bestPosition, entry.position)
      artistData.trackCount += 1
      if (entry.streams) {
        artistData.totalStreams += BigInt(entry.streams)
      }
    })

    // Get top track for each artist
    const topArtists = Array.from(artistMap.values())
      .sort((a, b) => a.bestPosition - b.bestPosition)
      .slice(0, 10)
      .map(artist => {
        // Find the track with the best position for this artist
        const artistEntries = entries.filter(e => e.artistId === artist.id)
        const topTrackEntry = artistEntries.sort((a, b) => a.position - b.position)[0]
        
        return {
          id: artist.id,
          name: artist.name,
          bestPosition: artist.bestPosition,
          trackCount: artist.trackCount,
          totalStreams: artist.totalStreams.toString(),
          topTrack: topTrackEntry?.tracks?.name || 'Unknown',
        }
      })

    return NextResponse.json({
      date,
      period: periodParam,
      chartType: chartTypeParam,
      region: regionParam,
      availableDates,
      biggestMovers,
      biggestDrops,
      newEntries,
      topTracks,
      topArtists,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
