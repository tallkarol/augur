import { NextRequest, NextResponse } from 'next/server'
import { getChartHistory } from '@/lib/mockData'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const trackId = searchParams.get('trackId')
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      )
    }

    const history = getChartHistory(trackId, startDate, endDate)
    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching chart history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart history' },
      { status: 500 }
    )
  }
}

