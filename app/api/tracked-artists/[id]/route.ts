import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseISO, subDays } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const endDate = endDateParam ? parseISO(endDateParam) : new Date()
    const startDate = startDateParam ? parseISO(startDateParam) : subDays(endDate, 30)

    // Get tracked artist
    const { data: trackedArtist, error: trackedError } = await supabase
      .from('tracked_artists')
      .select(`
        *,
        artists (*)
      `)
      .eq('artistId', params.id)
      .single()

    if (trackedError || !trackedArtist) {
      return NextResponse.json(
        { error: 'Tracked artist not found' },
        { status: 404 }
      )
    }

    // Get comprehensive chart data across all charts/regions
    const { data: chartEntries } = await supabase
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

    // Organize by chart/region combination
    const crossChartData: Record<string, any[]> = {}
    const currentPositions: Record<string, any> = {}
    let bestPosition = Infinity
    let totalStreams = BigInt(0)

    chartEntries?.forEach(entry => {
      const chartKey = `${entry.chartType}-${entry.chartPeriod}-${entry.region || 'global'}`
      
      if (!crossChartData[chartKey]) {
        crossChartData[chartKey] = []
      }
      
      crossChartData[chartKey].push({
        date: entry.date,
        position: entry.position,
        streams: entry.streams ? Number(entry.streams) : null,
        trackName: entry.tracks?.name || 'Unknown',
      })

      // Track current position (most recent)
      if (!currentPositions[chartKey] || new Date(entry.date) > new Date(currentPositions[chartKey].date)) {
        currentPositions[chartKey] = {
          position: entry.position,
          date: entry.date,
          chartType: entry.chartType,
          chartPeriod: entry.chartPeriod,
          region: entry.region,
        }
      }

      if (entry.position < bestPosition) {
        bestPosition = entry.position
      }
      if (entry.streams) {
        totalStreams += BigInt(entry.streams)
      }
    })

    return NextResponse.json({
      trackedArtist,
      crossChartData,
      currentPositions,
      stats: {
        bestPosition: bestPosition === Infinity ? null : bestPosition,
        totalStreams: totalStreams.toString(),
        chartTypes: [...new Set(chartEntries?.map(e => e.chartType) || [])],
        regions: [...new Set(chartEntries?.map(e => e.region).filter(Boolean) || [])],
      },
    })
  } catch (error) {
    console.error('[TrackedArtistsAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracked artist details' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('tracked_artists')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[TrackedArtistsAPI] Error deleting tracked artist:', error)
      return NextResponse.json(
        { error: 'Failed to untrack artist', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[TrackedArtistsAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to untrack artist' },
      { status: 500 }
    )
  }
}

// Also support DELETE by artistId
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'delete') {
      // Try to delete by artistId (assuming id is actually artistId)
      const { error } = await supabase
        .from('tracked_artists')
        .delete()
        .eq('artistId', params.id)

      if (error) {
        console.error('[TrackedArtistsAPI] Error deleting tracked artist:', error)
        return NextResponse.json(
          { error: 'Failed to untrack artist', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[TrackedArtistsAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to untrack artist' },
      { status: 500 }
    )
  }
}
