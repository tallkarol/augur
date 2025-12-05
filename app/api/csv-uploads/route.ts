import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const chartType = searchParams.get('chartType')
    const chartPeriod = searchParams.get('chartPeriod')

    let query = supabase
      .from('csv_uploads')
      .select('*', { count: 'exact' })
      .order('uploadedAt', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (chartType) {
      query = query.eq('chartType', chartType)
    }
    if (chartPeriod) {
      query = query.eq('chartPeriod', chartPeriod)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[CsvUploadsAPI] Error fetching uploads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch uploads', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      uploads: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[CsvUploadsAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch uploads',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
