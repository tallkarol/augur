import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { downloadChartCSV, validateChartRequest, type ChartRequest } from '@/lib/spotifyCharts'
import { parseChartCSV } from '@/lib/csvParser'
import { processChartData } from '@/lib/chartProcessor'
import { format, parseISO, eachDayOfInterval, addDays } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { configId, startDate, endDate } = body

    if (!configId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: configId, startDate, endDate' },
        { status: 400 }
      )
    }

    // Fetch configuration
    const { data: config, error: configError } = await supabase
      .from('chart_configs')
      .select('*')
      .eq('id', configId)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    // Validate dates
    const start = parseISO(startDate)
    const end = parseISO(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      )
    }

    console.log(`[Backfill] Starting backfill for config ${configId} from ${startDate} to ${endDate}`)

    // Generate date range
    // For weekly charts, we need to adjust the interval
    const dates = config.chartPeriod === 'weekly'
      ? getWeeklyDates(start, end)
      : eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'))

    const results = {
      totalDates: dates.length,
      processedDates: 0,
      successfulDates: [] as string[],
      failedDates: [] as { date: string; error: string }[],
      summary: {
        artistsCreated: 0,
        artistsUpdated: 0,
        tracksCreated: 0,
        tracksUpdated: 0,
        entriesCreated: 0,
        entriesUpdated: 0,
      },
    }

    // Process dates in batches to avoid timeouts
    const batchSize = 5
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize)
      
      for (const date of batch) {
        try {
          const chartRequest: ChartRequest = {
            chartType: config.chartType as 'regional' | 'viral',
            chartPeriod: config.chartPeriod as 'daily' | 'weekly',
            region: config.region || undefined,
            regionType: config.regionType as 'city' | 'country' | null | undefined,
            date,
          }

          // Validate request
          const validation = validateChartRequest(chartRequest)
          if (!validation.valid) {
            results.failedDates.push({ date, error: validation.error || 'Invalid request' })
            continue
          }

          // Download and process
          const csvText = await downloadChartCSV(chartRequest)
          const parsedData = parseChartCSV(
            csvText,
            chartRequest.chartType,
            chartRequest.chartPeriod,
            date
          )
          const processResult = await processChartData(
            parsedData,
            config.region || undefined,
            config.regionType as 'city' | 'country' | null | undefined
          )

          // Accumulate results
          results.summary.artistsCreated += processResult.artistsCreated
          results.summary.artistsUpdated += processResult.artistsUpdated
          results.summary.tracksCreated += processResult.tracksCreated
          results.summary.tracksUpdated += processResult.tracksUpdated
          results.summary.entriesCreated += processResult.entriesCreated
          results.summary.entriesUpdated += processResult.entriesUpdated

          results.successfulDates.push(date)
          results.processedDates++

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`[Backfill] Error processing date ${date}:`, errorMsg)
          results.failedDates.push({ date, error: errorMsg })
        }
      }

      // Update config lastRun
      await supabase
        .from('chart_configs')
        .update({ lastRun: new Date().toISOString() })
        .eq('id', configId)
    }

    console.log(`[Backfill] Completed: ${results.processedDates}/${results.totalDates} dates processed`)

    return NextResponse.json({
      success: true,
      message: 'Backfill completed',
      results,
    })
  } catch (error) {
    console.error('[Backfill] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to backfill chart data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * Get weekly dates (typically Mondays or specific day of week)
 * For simplicity, we'll use every 7 days from start date
 */
function getWeeklyDates(start: Date, end: Date): string[] {
  const dates: string[] = []
  let current = new Date(start)
  
  // Align to Monday (or adjust based on Spotify's weekly chart schedule)
  const dayOfWeek = current.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  current = addDays(current, -daysToMonday)

  while (current <= end) {
    dates.push(format(current, 'yyyy-MM-dd'))
    current = addDays(current, 7)
  }

  return dates
}
