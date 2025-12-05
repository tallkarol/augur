import { NextRequest, NextResponse } from 'next/server'
import { downloadChartCSV, validateChartRequest, type ChartRequest } from '@/lib/spotifyCharts'
import { parseChartCSV } from '@/lib/csvParser'
import { processChartData } from '@/lib/chartProcessor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chartType, chartPeriod, region, regionType, date } = body

    // Validate request
    const chartRequest: ChartRequest = {
      chartType,
      chartPeriod,
      region,
      regionType,
      date,
    }

    const validation = validateChartRequest(chartRequest)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    console.log(`[ChartFetch] Fetching chart data:`, chartRequest)

    // Download CSV
    const csvText = await downloadChartCSV(chartRequest)

    // Parse CSV
    const parsedData = parseChartCSV(csvText, chartType, chartPeriod, date)

    // Process and store data
    const result = await processChartData(parsedData, region, regionType)

    return NextResponse.json({
      success: true,
      message: 'Chart data fetched and processed successfully',
      data: {
        chartType,
        chartPeriod,
        region: region || 'global',
        date,
        recordsProcessed: parsedData.rows.length,
        result,
      },
    })
  } catch (error) {
    console.error('[ChartFetch] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch chart data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
