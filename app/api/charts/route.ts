import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 100

    const startDate = startDateParam ? parseISO(startDateParam) : undefined
    const endDate = endDateParam ? parseISO(endDateParam) : new Date()

    const where: any = {}
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = startDate
      if (endDate) where.date.lte = endDate
    }

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

    return NextResponse.json({ entries: chartEntries })
  } catch (error) {
    console.error('Error fetching charts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch charts' },
      { status: 500 }
    )
  }
}

