import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { clearLeadScoreCache } from '@/lib/metrics'

// GET: Load all settings
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true })

    if (error) {
      throw error
    }

    // Transform to key-value object grouped by category
    const settings: Record<string, Record<string, any>> = {}
    
    data?.forEach((setting) => {
      if (!settings[setting.category]) {
        settings[setting.category] = {}
      }
      
      try {
        // Try to parse JSON value, fallback to string
        settings[setting.category][setting.key] = JSON.parse(setting.value)
      } catch {
        settings[setting.category][setting.key] = setting.value
      }
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[Settings] Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST: Update settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, updates } = body

    if (!category || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: category, updates' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['system', 'csv_upload', 'display', 'dashboard', 'export', 'lead_score']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    const results = []

    // Update each setting in the category
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      
      // Check if setting exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', key)
        .eq('category', category)
        .limit(1)

      if (existing && existing.length > 0) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('settings')
          .update({ value: stringValue })
          .eq('id', existing[0].id)
          .select()
          .single()

        if (error) {
          results.push({ key, success: false, error: error.message })
        } else {
          results.push({ key, success: true })
        }
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from('settings')
          .insert({
            key,
            value: stringValue,
            category,
          })
          .select()
          .single()

        if (error) {
          results.push({ key, success: false, error: error.message })
        } else {
          results.push({ key, success: true })
        }
      }
    }

    const allSuccess = results.every(r => r.success)
    
    // Clear lead score cache if lead_score settings were updated
    if (category === 'lead_score') {
      clearLeadScoreCache()
    }
    
    return NextResponse.json({
      success: allSuccess,
      results,
    }, { status: allSuccess ? 200 : 207 }) // 207 Multi-Status if some failed
  } catch (error) {
    console.error('[Settings] Error updating settings:', error)
    return NextResponse.json(
      {
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// Helper function to get default settings
function getDefaultSettings() {
  return {
    playlist: {
      enabled: false,
      regions: ['global'],
      defaultDeduplicationAction: 'skip',
    },
    json_api: {
      enabled: false,
      fetchSchedule: 'weekly',
      defaultDeduplicationAction: 'skip',
    },
    csv_upload: {
      defaultDeduplicationAction: 'show-warning',
      maxFileSize: 10485760, // 10MB
      autoProcess: false,
    },
    cron: {
      enabled: false,
      playlistSchedule: '0 2 * * *', // Daily at 2 AM
      weeklySchedule: '0 2 * * 1', // Monday at 2 AM
      retryAttempts: 3,
      backoffStrategy: 'exponential',
    },
    system: {
      errorNotifications: true,
    },
  }
}
