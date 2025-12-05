import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseISO, format, subDays, subWeeks } from 'date-fns'
import { normalizeRegion } from '@/lib/utils'

/**
 * Period comparison endpoint with convenient defaults
 * Compares two date ranges (e.g., this week vs last week)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const periodType = searchParams.get('periodType') as 'week' | 'month' | 'custom' || 'week'
    const chartType = searchParams.get('chartType') as 'regional' | 'viral' | null
    const chartPeriod = searchParams.get('chartPeriod') as 'daily' | 'weekly' | null
    const region = searchParams.get('region')
    const artistId = searchParams.get('artistId')

    const now = new Date()
    let startDate1: Date
    let endDate1: Date
    let startDate2: Date
    let endDate2: Date

    if (periodType === 'week') {
      // This week vs last week
      endDate1 = now
      startDate1 = subWeeks(endDate1, 1)
      endDate2 = startDate1
      startDate2 = subWeeks(endDate2, 1)
    } else if (periodType === 'month') {
      // This month vs last month
      endDate1 = now
      startDate1 = subDays(endDate1, 30)
      endDate2 = startDate1
      startDate2 = subDays(endDate2, 30)
    } else {
      // Custom dates
      const startDate1Param = searchParams.get('startDate1')
      const endDate1Param = searchParams.get('endDate1')
      const startDate2Param = searchParams.get('startDate2')
      const endDate2Param = searchParams.get('endDate2')

      if (!startDate1Param || !endDate1Param || !startDate2Param || !endDate2Param) {
        return NextResponse.json(
          { error: 'Custom period requires startDate1, endDate1, startDate2, endDate2' },
          { status: 400 }
        )
      }

      startDate1 = parseISO(startDate1Param)
      endDate1 = parseISO(endDate1Param)
      startDate2 = parseISO(startDate2Param)
      endDate2 = parseISO(endDate2Param)
    }

    const normalizedRegion = normalizeRegion(region)

    // Fetch entries for period 1 (current/recent period)
    let period1Query = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (*),
        artists (*)
      `)
      .gte('date', startDate1.toISOString())
      .lte('date', endDate1.toISOString())
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

    const { data: period1Entries } = await period1Query

    // Fetch entries for period 2 (previous period)
    let period2Query = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (*),
        artists (*)
      `)
      .gte('date', startDate2.toISOString())
      .lte('date', endDate2.toISOString())
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

    // Find new entries (in period 1 but not period 2)
    const newEntries: any[] = []
    period1BestPositions.forEach(({ entry }, key) => {
      if (!period2BestPositions.has(key)) {
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

    // Find exits (in period 2 but not period 1)
    const exits: any[] = []
    period2BestPositions.forEach(({ entry }, key) => {
      if (!period1BestPositions.has(key)) {
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
    period1BestPositions.forEach(({ entry: entry1 }, key) => {
      const period2Data = period2BestPositions.get(key)
      if (period2Data) {
        const change = period2Data.position - entry1.position // Positive = moved up
        positionChanges.push({
          track: entry1.tracks,
          artist: entry1.artists,
          period1Position: entry1.position,
          period2Position: period2Data.position,
          change,
          chartType: entry1.chartType,
          chartPeriod: entry1.chartPeriod,
          region: entry1.region,
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
        startDate: format(startDate1, 'yyyy-MM-dd'),
        endDate: format(endDate1, 'yyyy-MM-dd'),
        entryCount: period1Entries?.length || 0,
      },
      period2: {
        startDate: format(startDate2, 'yyyy-MM-dd'),
        endDate: format(endDate2, 'yyyy-MM-dd'),
        entryCount: period2Entries?.length || 0,
      },
      newEntries,
      exits,
      positionChanges,
      biggestMovers,
      biggestDroppers,
    })
  } catch (error) {
    console.error('[PeriodCompareAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to compare periods',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
