import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, parseISO } from 'date-fns'
import { arrayToCSV } from '@/lib/export'
import { getServerSettings } from '@/lib/formatUtilsServer'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const trackIdParam = searchParams.get('trackId')
    const artistIdParam = searchParams.get('artistId')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 10000

    const startDate = startDateParam ? parseISO(startDateParam) : undefined
    const endDate = endDateParam ? parseISO(endDateParam) : new Date()

    // Build where clause
    const where: any = {}
    if (startDate) {
      where.date = { gte: startDate, lte: endDate }
    } else {
      where.date = { lte: endDate }
    }
    if (trackIdParam) {
      where.trackId = trackIdParam
    }
    if (artistIdParam) {
      where.artistId = artistIdParam
    }

    // Fetch chart entries
    const chartEntries = await db.chartEntry.findMany({
      where,
      include: {
        track: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { position: 'asc' },
      ],
      take: limit,
    })

    // Get export settings
    const settings = await getServerSettings()
    const exportSettings = settings.export || {}
    const includeStreams = exportSettings.includeStreams !== false
    const includePositions = exportSettings.includePositions !== false
    const includeLeadScores = exportSettings.includeLeadScores !== false

    // Format for CSV based on settings
    const csvData = chartEntries.map((entry) => {
      const row: Record<string, any> = {
      Date: format(entry.date, 'yyyy-MM-dd'),
      Track: entry.track.name,
      Artist: entry.track.artist.name,
      'Chart Type': entry.chartType,
      'Chart Period': entry.chartPeriod,
      Platform: entry.platform,
      }
      
      if (includePositions) {
        row.Position = entry.position
        row['Previous Rank'] = entry.previousRank || ''
        row['Peak Rank'] = entry.peakRank || ''
        row['Days on Chart'] = entry.daysOnChart || ''
      }
      
      if (includeStreams && entry.streams) {
        row.Streams = entry.streams.toString()
      }
      
      if (entry.source) {
        row.Source = entry.source
      }
      
      return row
    })

    const csv = arrayToCSV(csvData)
    const dateRange =
      startDate && endDate
        ? `${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`
        : format(endDate, 'yyyy-MM-dd')
    const filename = `chart_history_${dateRange}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting charts:', error)
    return NextResponse.json({ error: 'Failed to export charts' }, { status: 500 })
  }
}
