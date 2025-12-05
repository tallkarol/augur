import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, parseISO } from 'date-fns'
import { getTracksForDate, getAvailableDates } from '@/lib/mockData'

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
    let latestEntries
    try {
      latestEntries = await db.chartEntry.findMany({
      where: {
        date: {
          lte: parseISO(date),
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
    } catch (dbError) {
      // Database unavailable, return mock data
      console.log('Database unavailable, using mock data')
      const tracks = getTracksForDate(date, limit)
      return NextResponse.json({ 
        tracks,
        date,
        period: periodParam,
        availableDates,
      })
    }

    // Get the latest date
    const latestDate = latestEntries[0]?.date || date
    const entriesForDate = latestEntries.filter(e => 
      e.date.getTime() === latestDate.getTime()
    )

    // Get best position for each track
    const trackMap = new Map<string, {
      track: any
      artist: any
      bestPosition: number
      currentPosition: number
      previousPosition: number | null
      daysOnChart: number | null
      streams: bigint | null
    }>()

    entriesForDate.forEach(entry => {
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

    // Convert to array and sort by position
    const tracks = Array.from(trackMap.values())
      .map(data => ({
        id: data.track.id,
        name: data.track.name,
        artist: data.artist.name,
        position: data.currentPosition,
        bestPosition: data.bestPosition,
        previousPosition: data.previousPosition,
        daysOnChart: data.daysOnChart,
        streams: data.streams?.toString() || '0',
        change: data.previousPosition 
          ? data.previousPosition - data.currentPosition 
          : null,
      }))
      .sort((a, b) => a.position - b.position)
      .slice(0, limit)

    return NextResponse.json({ tracks, date: format(latestDate, 'yyyy-MM-dd') })
  } catch (error) {
    console.error('Error fetching tracks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    )
  }
}

