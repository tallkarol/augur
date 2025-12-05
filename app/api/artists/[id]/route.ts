import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'

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
    if (regionParam === null || regionParam === 'global' || regionParam === '') {
      entriesQuery = entriesQuery.is('region', null)
    } else {
      entriesQuery = entriesQuery.eq('region', regionParam)
    }

    const { data: chartEntries, error: entriesError } = await entriesQuery

    if (entriesError) {
      console.error('[ArtistDetailAPI] Error fetching chart entries:', entriesError)
    }

    const entries = chartEntries || []

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

    // Get unique tracks
    const trackIds = Array.from(totalTracks)
    const tracksData = []
    
    if (trackIds.length > 0) {
      const { data: tracks } = await supabase
        .from('tracks')
        .select('*')
        .in('id', trackIds)
        .eq('artistId', params.id)

      tracksData.push(...(tracks || []))
    }

    // Format chart history
    const chartHistory = entries.map(entry => ({
      date: entry.date,
      position: entry.position,
      streams: entry.streams ? Number(entry.streams) : null,
      trackName: entry.tracks?.name || 'Unknown',
    }))

    return NextResponse.json({
      artist,
      tracks: tracksData,
      chartHistory,
      stats: {
        bestPosition: bestPosition === Infinity ? null : bestPosition,
        averagePosition,
        totalStreams: totalStreams.toString(),
        totalTracks: totalTracks.size,
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
