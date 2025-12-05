import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const trackId = searchParams.get('trackId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('chart_entries')
      .select('*')
      .eq('trackId', trackId)
      .eq('platform', 'spotify')
      .order('date', { ascending: true })

    if (startDate) {
      query = query.gte('date', parseISO(startDate).toISOString())
    }
    if (endDate) {
      query = query.lte('date', parseISO(endDate).toISOString())
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('[ChartHistoryAPI] Error fetching chart history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch chart history', details: error.message },
        { status: 500 }
      )
    }

    const history = (entries || []).map(entry => ({
      date: format(new Date(entry.date), 'yyyy-MM-dd'),
      position: entry.position,
      streams: entry.streams ? parseInt(entry.streams.toString()) : 0,
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching chart history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart history' },
      { status: 500 }
    )
  }
}
