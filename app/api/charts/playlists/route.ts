import { NextRequest, NextResponse } from 'next/server'
import { fetchViral50Chart, processPlaylistChart } from '@/lib/spotifyPlaylists'
import { processChartData } from '@/lib/chartProcessor'
import { checkDuplicates, getDefaultDeduplicationAction, handleDuplicates } from '@/lib/deduplication'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    let body = {}
    try {
      body = await request.json().catch(() => ({}))
    } catch {
      // No body provided
    }
    const { region, date } = body as { region?: string; date?: string }

    if (!region) {
      return NextResponse.json(
        { error: 'Missing required field: region' },
        { status: 400 }
      )
    }

    const fetchDate = date || format(new Date(), 'yyyy-MM-dd')

    console.log(`[PlaylistAPI] Fetching Viral 50 chart for region: ${region}, date: ${fetchDate}`)

    // Fetch chart data
    const chartData = await fetchViral50Chart(region, fetchDate)

    // Check for duplicates
    const dedupAction = await getDefaultDeduplicationAction('playlist')
    const duplicateCheck = await checkDuplicates(
      fetchDate,
      'viral',
      'daily',
      region === 'global' ? null : region
    )

    // Handle duplicates
    if (duplicateCheck.exists) {
      const handleResult = await handleDuplicates(
        fetchDate,
        'viral',
        'daily',
        region === 'global' ? null : region,
        dedupAction
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

    // Process playlist data to chart format
    const processedRows = processPlaylistChart(chartData)

    // Convert to ParsedChartData format
    const parsedData = {
      rows: processedRows,
      chartType: 'viral' as const,
      chartPeriod: 'daily' as const,
      date: fetchDate,
    }

    // Process and store
    const result = await processChartData(
      parsedData,
      region === 'global' ? undefined : region,
      undefined // regionType
    )

    return NextResponse.json({
      success: true,
      message: 'Playlist chart data fetched and processed successfully',
      data: {
        region,
        date: fetchDate,
        snapshotId: chartData.snapshotId,
        recordsProcessed: chartData.rows.length,
        result,
      },
    })
  } catch (error) {
    console.error('[PlaylistAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch playlist chart data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
