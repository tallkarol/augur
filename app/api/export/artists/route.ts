import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, parseISO } from 'date-fns'
import { arrayToCSV } from '@/lib/export'
import { getServerSettings } from '@/lib/formatUtilsServer'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const limitParam = searchParams.get('limit')
    const periodParam = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const limit = limitParam ? parseInt(limitParam, 10) : 1000

    const date = dateParam ? parseISO(dateParam) : new Date()

    // Fetch chart entries
    const chartEntries = await db.chartEntry.findMany({
      where: {
        date: {
          lte: date,
        },
      },
      include: {
        artist: true,
        track: true,
      },
      orderBy: [
        { date: 'desc' },
        { position: 'asc' },
      ],
      take: limit * 10,
    })

    // Get latest date's entries
    const latestDate = chartEntries[0]?.date || date
    const latestEntries = chartEntries.filter(
      (e) => e.date.getTime() === latestDate.getTime()
    )

    // Aggregate by artist
    const artistMap = new Map<
      string,
      {
        artist: any
        bestPosition: number
        currentPosition: number
        tracks: Array<{ name: string; position: number }>
        totalStreams: bigint
        averagePosition: number
        positions: number[]
      }
    >()

    latestEntries.forEach((entry) => {
      const artistId = entry.artistId
      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          artist: entry.artist,
          bestPosition: entry.position,
          currentPosition: entry.position,
          tracks: [],
          totalStreams: BigInt(0),
          averagePosition: 0,
          positions: [],
        })
      }

      const artistData = artistMap.get(artistId)!
      artistData.bestPosition = Math.min(artistData.bestPosition, entry.position)
      artistData.currentPosition = Math.min(artistData.currentPosition, entry.position)
      artistData.tracks.push({
        name: entry.track.name,
        position: entry.position,
      })
      if (entry.streams) {
        artistData.totalStreams += entry.streams
      }
      artistData.positions.push(entry.position)
    })

    // Get export settings
    const settings = await getServerSettings()
    const exportSettings = settings.export || {}
    const includeStreams = exportSettings.includeStreams !== false
    const includePositions = exportSettings.includePositions !== false

    // Convert to array and format for CSV
    const csvData = Array.from(artistMap.values())
      .map((data) => {
        const avgPosition =
          data.positions.reduce((a, b) => a + b, 0) / data.positions.length
        const topTrack = data.tracks.sort((a, b) => a.position - b.position)[0]?.name || ''

        const row: Record<string, any> = {
          Artist: data.artist.name,
          'Top Track': topTrack,
          'Track Count': data.tracks.length,
        }

        if (includePositions) {
          row.Rank = data.currentPosition
          row['Best Position'] = data.bestPosition
          row['Current Position'] = data.currentPosition
          row['Average Position'] = Math.round(avgPosition * 10) / 10
        }

        if (includeStreams && data.totalStreams) {
          row['Total Streams'] = data.totalStreams.toString()
        }

        row.Genres = Array.isArray(data.artist.genres) ? data.artist.genres.join('; ') : ''
        row.Popularity = data.artist.popularity || ''
        if (data.artist.followers) {
          row.Followers = data.artist.followers.toString()
        }

        return row
      })
      .sort((a, b) => (a['Current Position'] || 999) - (b['Current Position'] || 999))
      .slice(0, limit)

    const csv = arrayToCSV(csvData)
    const filename = `artists_${format(latestDate, 'yyyy-MM-dd')}_${periodParam}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting artists:', error)
    return NextResponse.json({ error: 'Failed to export artists' }, { status: 500 })
  }
}
