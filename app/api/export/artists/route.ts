import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, parseISO } from 'date-fns'
import { arrayToCSV } from '@/lib/export'

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

    // Convert to array and format for CSV
    const csvData = Array.from(artistMap.values())
      .map((data) => {
        const avgPosition =
          data.positions.reduce((a, b) => a + b, 0) / data.positions.length
        const topTrack = data.tracks.sort((a, b) => a.position - b.position)[0]?.name || ''

        return {
          Rank: data.currentPosition,
          Artist: data.artist.name,
          'Best Position': data.bestPosition,
          'Current Position': data.currentPosition,
          'Average Position': Math.round(avgPosition * 10) / 10,
          'Top Track': topTrack,
          'Track Count': data.tracks.length,
          'Total Streams': data.totalStreams.toString(),
          Genres: Array.isArray(data.artist.genres) ? data.artist.genres.join('; ') : '',
          Popularity: data.artist.popularity || '',
          Followers: data.artist.followers?.toString() || '',
        }
      })
      .sort((a, b) => a['Current Position'] - b['Current Position'])
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
