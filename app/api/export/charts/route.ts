import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, parseISO } from 'date-fns'
import { arrayToCSV } from '@/lib/export'

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

    // Format for CSV
    const csvData = chartEntries.map((entry) => ({
      Date: format(entry.date, 'yyyy-MM-dd'),
      Position: entry.position,
      Track: entry.track.name,
      Artist: entry.track.artist.name,
      'Chart Type': entry.chartType,
      'Chart Period': entry.chartPeriod,
      'Previous Rank': entry.previousRank || '',
      'Peak Rank': entry.peakRank || '',
      'Days on Chart': entry.daysOnChart || '',
      Streams: entry.streams?.toString() || '',
      Source: entry.source || '',
      Platform: entry.platform,
    }))

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
