import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO, subDays } from 'date-fns'
import { enrichTrackData, enrichArtistData } from '@/lib/enrichArtistData'

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

    // Calculate stats
    const allPositions = (chartEntries || []).map((e: any) => e.position)
    const allStreams = (chartEntries || [])
      .map((e: any) => e.streams ? parseInt(e.streams.toString()) : 0)
      .reduce((sum, s) => sum + s, 0)
    
    const peakStreams = chartEntries && chartEntries.length > 0
      ? Math.max(...chartEntries.map((e: any) => e.streams ? parseInt(e.streams.toString()) : 0))
      : 0

    const stats = {
      bestPosition: allPositions.length > 0 ? Math.min(...allPositions) : null,
      averagePosition: allPositions.length > 0 
        ? Math.round((allPositions.reduce((a, b) => a + b, 0) / allPositions.length) * 10) / 10
        : null,
      totalStreams: allStreams,
      daysOnChart: chartEntries?.length || 0,
      peakStreams,
    }

    return NextResponse.json({
      track: enrichedTrack,
      artist: enrichedArtist ? {
        ...enrichedArtist,
        followers: enrichedArtist.followers?.toString(),
      } : null,
      chartHistory: chartData,
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
