import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, parseISO } from 'date-fns'
import { arrayToCSV } from '@/lib/export'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 1000

    const date = dateParam ? parseISO(dateParam) : new Date()

    // Fetch chart entries
    const latestEntries = await db.chartEntry.findMany({
      where: {
        date: {
          lte: date,
        },
      },
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
      take: limit * 2,
    })

    // Get the latest date
    const latestDate = latestEntries[0]?.date || date
    const entriesForDate = latestEntries.filter(
      (e) => e.date.getTime() === latestDate.getTime()
    )

    // Get best position for each track
    const trackMap = new Map<
      string,
      {
        track: any
        artist: any
        bestPosition: number
        currentPosition: number
        previousPosition: number | null
        daysOnChart: number | null
        streams: bigint | null
      }
    >()

    entriesForDate.forEach((entry) => {
      const trackId = entry.trackId
      if (!trackMap.has(trackId)) {
        trackMap.set(trackId, {
          track: entry.track,
          artist: entry.track.artist,
          bestPosition: entry.position,
          currentPosition: entry.position,
          previousPosition: entry.previousRank,
          daysOnChart: entry.daysOnChart,
          streams: entry.streams,
        })
      } else {
        const trackData = trackMap.get(trackId)!
        trackData.bestPosition = Math.min(trackData.bestPosition, entry.position)
        trackData.currentPosition = Math.min(trackData.currentPosition, entry.position)
      }
    })

    // Convert to array and format for CSV
    const csvData = Array.from(trackMap.values())
      .map((data) => ({
        Position: data.currentPosition,
        Track: data.track.name,
        Artist: data.artist.name,
        'Best Position': data.bestPosition,
        'Previous Position': data.previousPosition || '',
        Change: data.previousPosition
          ? data.previousPosition - data.currentPosition
          : '',
        'Days on Chart': data.daysOnChart || '',
        Streams: data.streams?.toString() || '',
        Album: data.track.albumName || '',
        Duration: data.track.duration ? `${Math.round(data.track.duration / 1000)}s` : '',
        Popularity: data.track.popularity || '',
      }))
      .sort((a, b) => a.Position - b.Position)
      .slice(0, limit)

    const csv = arrayToCSV(csvData)
    const filename = `tracks_${format(latestDate, 'yyyy-MM-dd')}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting tracks:', error)
    return NextResponse.json({ error: 'Failed to export tracks' }, { status: 500 })
  }
}
