import { NextRequest, NextResponse } from 'next/server'
import { fetchViral50Chart, processPlaylistChart } from '@/lib/spotifyPlaylists'
import { processChartData } from '@/lib/chartProcessor'
import { checkDuplicates, getDefaultDeduplicationAction, handleDuplicates } from '@/lib/deduplication'
import { format } from 'date-fns'
import { normalizeRegion } from '@/lib/utils'

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
    const normalizedRegion = normalizeRegion(region)

    console.log(`[PlaylistAPI] Fetching Viral 50 chart for region: ${region}, date: ${fetchDate}`)

    // Fetch chart data
    const chartData = await fetchViral50Chart(region, fetchDate)

    // Check for duplicates
    const dedupAction = await getDefaultDeduplicationAction('playlist')
    const duplicateCheck = await checkDuplicates(
      fetchDate,
      'viral',
      'daily',
      normalizedRegion
    )

    // Handle duplicates
    if (duplicateCheck.exists) {
      // Map 'show-warning' to 'replace' for API calls (show-warning is for UI)
      const actionForHandle = dedupAction === 'show-warning' ? 'replace' : dedupAction
      const handleResult = await handleDuplicates(
        fetchDate,
        'viral',
        'daily',
        normalizedRegion,
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
      normalizedRegion || undefined,
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
