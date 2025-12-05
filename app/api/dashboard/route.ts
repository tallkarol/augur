import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { 
  getAvailableDates, 
  getBiggestMovers, 
  getBiggestDrops, 
  getNewEntries,
  getTopTracksTrend,
  getTopArtistsTrend
} from '@/lib/mockData'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const periodParam = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    
    const availableDates = getAvailableDates()
    const date = dateParam || availableDates[availableDates.length - 1] || format(new Date(), 'yyyy-MM-dd')

    const biggestMovers = getBiggestMovers(date, 10)
    const biggestDrops = getBiggestDrops(date, 10)
    const newEntries = getNewEntries(date, 10)
    const topTracks = getTopTracksTrend(date, 10)
    const topArtists = getTopArtistsTrend(date, 10)

    return NextResponse.json({
      date,
      period: periodParam,
      availableDates,
      biggestMovers,
      biggestDrops,
      newEntries,
      topTracks,
      topArtists,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

