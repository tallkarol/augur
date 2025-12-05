import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseISO, format } from 'date-fns'
import { normalizeRegion } from '@/lib/utils'

/**
 * Period-over-period comparison endpoint
 * Compares two date ranges and returns position changes, new entries, exits, biggest movers
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate1 = searchParams.get('startDate1')
    const endDate1 = searchParams.get('endDate1')
    const startDate2 = searchParams.get('startDate2')
    const endDate2 = searchParams.get('endDate2')
    const chartType = searchParams.get('chartType') as 'regional' | 'viral' | null
    const chartPeriod = searchParams.get('chartPeriod') as 'daily' | 'weekly' | null
    const region = searchParams.get('region')
    const artistId = searchParams.get('artistId')
    const trackId = searchParams.get('trackId')

    if (!startDate1 || !endDate1 || !startDate2 || !endDate2) {
      return NextResponse.json(
        { error: 'All date parameters (startDate1, endDate1, startDate2, endDate2) are required' },
        { status: 400 }
      )
    }

    const period1Start = parseISO(startDate1)
    const period1End = parseISO(endDate1)
    const period2Start = parseISO(startDate2)
    const period2End = parseISO(endDate2)

    const normalizedRegion = normalizeRegion(region)

    // Fetch entries for period 1
    let period1Query = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (*),
        artists (*)
      `)
      .gte('date', period1Start.toISOString())
      .lte('date', period1End.toISOString())
      .eq('platform', 'spotify')

    if (chartType) {
      period1Query = period1Query.eq('chartType', chartType)
    }
    if (chartPeriod) {
      period1Query = period1Query.eq('chartPeriod', chartPeriod)
    }
    if (normalizedRegion === null) {
      period1Query = period1Query.is('region', null)
    } else if (normalizedRegion) {
      period1Query = period1Query.eq('region', normalizedRegion)
    }
    if (artistId) {
      period1Query = period1Query.eq('artistId', artistId)
    }
    if (trackId) {
      period1Query = period1Query.eq('trackId', trackId)
    }

    const { data: period1Entries } = await period1Query

    // Fetch entries for period 2
    let period2Query = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (*),
        artists (*)
      `)
      .gte('date', period2Start.toISOString())
      .lte('date', period2End.toISOString())
      .eq('platform', 'spotify')

    if (chartType) {
      period2Query = period2Query.eq('chartType', chartType)
    }
    if (chartPeriod) {
      period2Query = period2Query.eq('chartPeriod', chartPeriod)
    }
    if (normalizedRegion === null) {
      period2Query = period2Query.is('region', null)
    } else if (normalizedRegion) {
      period2Query = period2Query.eq('region', normalizedRegion)
    }
    if (artistId) {
      period2Query = period2Query.eq('artistId', artistId)
    }
    if (trackId) {
      period2Query = period2Query.eq('trackId', trackId)
    }

    const { data: period2Entries } = await period2Query

    // Get best positions for each track in each period
    const period1BestPositions = new Map<string, { position: number; entry: any }>()
    const period2BestPositions = new Map<string, { position: number; entry: any }>()

    period1Entries?.forEach((entry: any) => {
      const key = `${entry.trackId}-${entry.chartType}-${entry.chartPeriod}-${entry.region || 'global'}`
      const current = period1BestPositions.get(key)
      if (!current || entry.position < current.position) {
        period1BestPositions.set(key, { position: entry.position, entry })
      }
    })

    period2Entries?.forEach((entry: any) => {
      const key = `${entry.trackId}-${entry.chartType}-${entry.chartPeriod}-${entry.region || 'global'}`
      const current = period2BestPositions.get(key)
      if (!current || entry.position < current.position) {
        period2BestPositions.set(key, { position: entry.position, entry })
      }
    })

    // Find new entries (in period 2 but not period 1)
    const newEntries: any[] = []
    period2BestPositions.forEach(({ entry }, key) => {
      if (!period1BestPositions.has(key)) {
        newEntries.push({
          track: entry.tracks,
          artist: entry.artists,
          position: entry.position,
          chartType: entry.chartType,
          chartPeriod: entry.chartPeriod,
          region: entry.region,
        })
      }
    })

    // Find exits (in period 1 but not period 2)
    const exits: any[] = []
    period1BestPositions.forEach(({ entry }, key) => {
      if (!period2BestPositions.has(key)) {
        exits.push({
          track: entry.tracks,
          artist: entry.artists,
          position: entry.position,
          chartType: entry.chartType,
          chartPeriod: entry.chartPeriod,
          region: entry.region,
        })
      }
    })

    // Find position changes
    const positionChanges: any[] = []
    period2BestPositions.forEach(({ entry: entry2 }, key) => {
      const period1Data = period1BestPositions.get(key)
      if (period1Data) {
        const change = period1Data.position - entry2.position // Positive = moved up
        positionChanges.push({
          track: entry2.tracks,
          artist: entry2.artists,
          period1Position: period1Data.position,
          period2Position: entry2.position,
          change,
          chartType: entry2.chartType,
          chartPeriod: entry2.chartPeriod,
          region: entry2.region,
        })
      }
    })

    // Sort by biggest moves
    const biggestMovers = [...positionChanges]
      .filter(p => p.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 20)

    const biggestDroppers = [...positionChanges]
      .filter(p => p.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 20)

    return NextResponse.json({
      period1: {
        startDate: format(period1Start, 'yyyy-MM-dd'),
        endDate: format(period1End, 'yyyy-MM-dd'),
        entryCount: period1Entries?.length || 0,
      },
      period2: {
        startDate: format(period2Start, 'yyyy-MM-dd'),
        endDate: format(period2End, 'yyyy-MM-dd'),
        entryCount: period2Entries?.length || 0,
      },
      newEntries,
      exits,
      positionChanges,
      biggestMovers,
      biggestDroppers,
    })
  } catch (error) {
    console.error('[ChartCompareAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to compare periods',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
