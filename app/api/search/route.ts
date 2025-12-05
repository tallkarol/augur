import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim() || ''
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!query || query.length < 2) {
      return NextResponse.json({
        artists: [],
        tracks: [],
      })
    }

    // Search artists
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (artistsError) {
      console.error('[SearchAPI] Error searching artists:', artistsError)
    }

    // Search tracks
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select(`
        *,
        artists (*)
      `)
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (tracksError) {
      console.error('[SearchAPI] Error searching tracks:', tracksError)
    }

    // For each artist, get their charting data
    const artistsWithCharts = await Promise.all(
      (artists || []).map(async (artist) => {
        const { data: chartEntries } = await supabase
          .from('chart_entries')
          .select('*')
          .eq('artistId', artist.id)
          .order('date', { ascending: false })
          .order('position', { ascending: true })
          .limit(1)

        const bestPosition = chartEntries && chartEntries.length > 0 
          ? chartEntries[0].position 
          : null
        const chartType = chartEntries && chartEntries.length > 0 
          ? chartEntries[0].chartType 
          : null
        const chartPeriod = chartEntries && chartEntries.length > 0 
          ? chartEntries[0].chartPeriod 
          : null

        return {
          ...artist,
          bestPosition,
          chartType,
          chartPeriod,
        }
      })
    )

    // For each track, get its charting data
    const tracksWithCharts = await Promise.all(
      (tracks || []).map(async (track) => {
        const { data: chartEntries } = await supabase
          .from('chart_entries')
          .select('*')
          .eq('trackId', track.id)
          .order('date', { ascending: false })
          .order('position', { ascending: true })
          .limit(1)

        const bestPosition = chartEntries && chartEntries.length > 0 
          ? chartEntries[0].position 
          : null
        const chartType = chartEntries && chartEntries.length > 0 
          ? chartEntries[0].chartType 
          : null
        const chartPeriod = chartEntries && chartEntries.length > 0 
          ? chartEntries[0].chartPeriod 
          : null

        return {
          ...track,
          bestPosition,
          chartType,
          chartPeriod,
        }
      })
    )

    return NextResponse.json({
      artists: artistsWithCharts,
      tracks: tracksWithCharts,
    })
  } catch (error) {
    console.error('[SearchAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to perform search',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
