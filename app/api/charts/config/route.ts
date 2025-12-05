import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: List all chart configurations
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('chart_configs')
      .select('*')
      .order('createdAt', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ configs: data || [] })
  } catch (error) {
    console.error('[ChartConfig] Error fetching configs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart configurations' },
      { status: 500 }
    )
  }
}

// POST: Create new configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, chartType, chartPeriod, region, regionType, enabled = true } = body

    // Validate required fields
    if (!name || !chartType || !chartPeriod) {
      return NextResponse.json(
        { error: 'Missing required fields: name, chartType, chartPeriod' },
        { status: 400 }
      )
    }

    // Validate chartType and chartPeriod
    if (!['regional', 'viral'].includes(chartType)) {
      return NextResponse.json(
        { error: 'Invalid chartType. Must be "regional" or "viral"' },
        { status: 400 }
      )
    }

    if (!['daily', 'weekly'].includes(chartPeriod)) {
      return NextResponse.json(
        { error: 'Invalid chartPeriod. Must be "daily" or "weekly"' },
        { status: 400 }
      )
    }

    // Check for duplicate
    let duplicateQuery = supabase
      .from('chart_configs')
      .select('id')
      .eq('chartType', chartType)
      .eq('chartPeriod', chartPeriod)

    // Handle null region correctly
    if (region === null || region === undefined) {
      duplicateQuery = duplicateQuery.is('region', null)
    } else {
      duplicateQuery = duplicateQuery.eq('region', region)
    }

    const { data: existing } = await duplicateQuery.limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Configuration with these settings already exists' },
        { status: 409 }
      )
    }

    // Create configuration
    const { data: newConfig, error } = await supabase
      .from('chart_configs')
      .insert({
        name,
        chartType,
        chartPeriod,
        region: region || null,
        regionType: regionType || null,
        enabled: enabled !== false,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ config: newConfig }, { status: 201 })
  } catch (error) {
    console.error('[ChartConfig] Error creating config:', error)
    return NextResponse.json(
      {
        error: 'Failed to create chart configuration',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// PATCH: Update configuration
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Validate chartType and chartPeriod if provided
    if (updates.chartType && !['regional', 'viral'].includes(updates.chartType)) {
      return NextResponse.json(
        { error: 'Invalid chartType. Must be "regional" or "viral"' },
        { status: 400 }
      )
    }

    if (updates.chartPeriod && !['daily', 'weekly'].includes(updates.chartPeriod)) {
      return NextResponse.json(
        { error: 'Invalid chartPeriod. Must be "daily" or "weekly"' },
        { status: 400 }
      )
    }

    // Update configuration
    const { data: updatedConfig, error } = await supabase
      .from('chart_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!updatedConfig) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config: updatedConfig })
  } catch (error) {
    console.error('[ChartConfig] Error updating config:', error)
    return NextResponse.json(
      {
        error: 'Failed to update chart configuration',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// DELETE: Remove configuration
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('chart_configs')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ChartConfig] Error deleting config:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete chart configuration',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
