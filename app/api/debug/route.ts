import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    // Get all recent chart entries
    const { data: entries, error } = await supabase
      .from('chart_entries')
      .select('date, chartType, chartPeriod, region, position, platform')
      .eq('platform', 'spotify')
      .order('date', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by date
    const byDate = new Map<string, any[]>()
    entries?.forEach(entry => {
      const dateStr = format(new Date(entry.date), 'yyyy-MM-dd')
      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, [])
      }
      byDate.get(dateStr)!.push({
        chartType: entry.chartType,
        chartPeriod: entry.chartPeriod,
        region: entry.region,
        position: entry.position,
      })
    })

    // Get unique dates
    const dates = Array.from(byDate.keys()).sort()

    return NextResponse.json({
      totalEntries: entries?.length || 0,
      uniqueDates: dates,
      entriesByDate: Object.fromEntries(byDate),
      sampleEntries: entries?.slice(0, 10),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
