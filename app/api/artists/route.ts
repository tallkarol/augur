import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, parseISO } from 'date-fns'
import { getArtistsForDate, getAvailableDates } from '@/lib/mockData'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const limitParam = searchParams.get('limit')
    const periodParam = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const limit = limitParam ? parseInt(limitParam, 10) : 50

    const availableDates = getAvailableDates()
    const date = dateParam ? dateParam : (availableDates[availableDates.length - 1] || format(new Date(), 'yyyy-MM-dd'))

    // Try database first, fallback to mock data
    let chartEntries
    try {
      chartEntries = await db.chartEntry.findMany({
      where: {
        date: {
          lte: parseISO(date),
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
      take: limit * 10, // Get more entries to aggregate
    })
    } catch (dbError) {
      // Database unavailable, return mock data
      console.log('Database unavailable, using mock data')
      const artists = getArtistsForDate(date, limit, periodParam)
      return NextResponse.json({ 
        artists,
        date,
        period: periodParam,
        availableDates,
      })
    }

    // Aggregate by artist
    const artistMap = new Map<string, {
      artist: any
      bestPosition: number
      currentPosition: number
      tracks: Array<{ name: string; position: number }>
      totalStreams: bigint
    }>()

    // Get latest date's entries
    const latestDate = chartEntries[0]?.date || date
    const latestEntries = chartEntries.filter(e => 
      e.date.getTime() === latestDate.getTime()
    )

    latestEntries.forEach(entry => {
      const artistId = entry.artistId
      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          artist: entry.artist,
          bestPosition: entry.position,
          currentPosition: entry.position,
          tracks: [],
          totalStreams: BigInt(0),
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
    })

    // Convert to array and sort by best position
    const artists = Array.from(artistMap.values())
      .map(data => ({
        id: data.artist.id,
        name: data.artist.name,
        bestPosition: data.bestPosition,
        currentPosition: data.currentPosition,
        trackCount: data.tracks.length,
        topTrack: data.tracks.sort((a, b) => a.position - b.position)[0]?.name || '',
        totalStreams: data.totalStreams.toString(),
      }))
      .sort((a, b) => a.bestPosition - b.bestPosition)
      .slice(0, limit)

    return NextResponse.json({ artists, date: format(latestDate, 'yyyy-MM-dd') })
  } catch (error) {
    console.error('Error fetching artists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artists' },
      { status: 500 }
    )
  }
}

