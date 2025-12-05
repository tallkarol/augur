import { NextRequest, NextResponse } from 'next/server'
import { fetchWeeklyChartData } from '@/lib/spotifyCharts'
import { parseChartData } from '@/lib/csvParser'
import { processChartData } from '@/lib/chartProcessor'
import { checkDuplicates, getDefaultDeduplicationAction, handleDuplicates } from '@/lib/deduplication'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    let body = {}
    try {
      body = await request.json().catch(() => ({}))
    } catch {
      // No body provided, use defaults
    }
    const { date } = body as { date?: string }

    const fetchDate = date || format(new Date(), 'yyyy-MM-dd')

    console.log(`[WeeklyAPI] Checking for existing weekly chart data for date: ${fetchDate}`)

    // Check for duplicates BEFORE fetching to avoid unnecessary API calls
    // Weekly charts from JSON API are typically regional/global weekly
    const dedupAction = await getDefaultDeduplicationAction('json_api')
    
    // Check for both regional and viral weekly charts (API may return either)
    const regionalCheck = await checkDuplicates(fetchDate, 'regional', 'weekly', null)
    const viralCheck = await checkDuplicates(fetchDate, 'viral', 'weekly', null)
    
    // If duplicates exist and action is 'skip', return early
    if (dedupAction === 'skip' && (regionalCheck.exists || viralCheck.exists)) {
      const existingCount = (regionalCheck.existingEntryCount || 0) + (viralCheck.existingEntryCount || 0)
      console.log(`[WeeklyAPI] Skipping fetch - duplicates exist (${existingCount} entries)`)
      return NextResponse.json({
        success: true,
        message: 'Duplicate entries found - skipping fetch',
        skipped: true,
        existingEntryCount: existingCount,
        regionalExists: regionalCheck.exists,
        viralExists: viralCheck.exists,
      })
    }

    console.log(`[WeeklyAPI] Fetching weekly chart data from API`)

    // Fetch chart data from JSON API
    const apiResponse = await fetchWeeklyChartData()

    // Extract chart metadata
    const chartResponse = apiResponse.chartEntryViewResponses[0]
    if (!chartResponse) {
      throw new Error('No chart data in API response')
    }

    const chartDate = chartResponse.displayChart.date || fetchDate
    const chartMetadata = chartResponse.displayChart.chartMetadata

    // Determine chart type and period from metadata
    const alias = chartMetadata.alias || ''
    const chartType = alias.includes('VIRAL') ? 'viral' : 'regional'
    const chartPeriod = alias.includes('WEEKLY') ? 'weekly' : 'daily'

    // Check for duplicates for the specific chart type we got
    const duplicateCheck = await checkDuplicates(
      chartDate,
      chartType,
      chartPeriod,
      null // Weekly charts are typically global
    )

    // Handle duplicates
    if (duplicateCheck.exists) {
      // Map 'show-warning' to 'replace' for API calls (show-warning is for UI)
      const actionForHandle = dedupAction === 'show-warning' ? 'replace' : dedupAction
      const handleResult = await handleDuplicates(
        chartDate,
        chartType,
        chartPeriod,
        null,
        actionForHandle as 'skip' | 'update' | 'replace'
      )

      if (handleResult.skipped) {
        return NextResponse.json({
          success: true,
          message: 'Duplicate entries skipped',
          skipped: true,
          existingEntryCount: duplicateCheck.existingEntryCount,
        })
      }
    }

    // Parse JSON response to chart data format
    const parsedData = parseChartData(apiResponse, chartType, chartPeriod, chartDate)

    // Process and store
    const result = await processChartData(parsedData, undefined, undefined)

    return NextResponse.json({
      success: true,
      message: 'Weekly chart data fetched and processed successfully',
      data: {
        date: chartDate,
        chartType,
        chartPeriod,
        chartTitle: chartMetadata.readableTitle,
        recordsProcessed: parsedData.rows.length,
        result,
      },
    })
  } catch (error) {
    console.error('[WeeklyAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch weekly chart data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
