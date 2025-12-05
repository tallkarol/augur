// Server-side only formatting utilities
// This file should ONLY be imported in API routes, never in client components

import { format, parseISO } from 'date-fns'

let serverSettingsCache: any = null
let serverCacheTimestamp = 0
const CACHE_TTL = 60000 // 1 minute

export async function getServerSettings() {
  const now = Date.now()
  if (serverSettingsCache && (now - serverCacheTimestamp) < CACHE_TTL) {
    return serverSettingsCache
  }

  try {
    // Dynamically import supabase only on server-side
    const { supabase } = await import('./supabase')
    
    const { data, error } = await supabase
      .from('settings')
      .select('*')

    if (error) throw error

    const settings: Record<string, Record<string, any>> = {}
    data?.forEach((setting) => {
      if (!settings[setting.category]) {
        settings[setting.category] = {}
      }
      try {
        settings[setting.category][setting.key] = JSON.parse(setting.value)
      } catch {
        settings[setting.category][setting.key] = setting.value
      }
    })

    serverSettingsCache = settings
    serverCacheTimestamp = now
    return settings
  } catch (error) {
    console.error('Failed to load server settings:', error)
    return {}
  }
}

// Server-side: Format date
export async function formatDateServer(date: Date | string, formatString?: string): Promise<string> {
  try {
    const settings = await getServerSettings()
    const displaySettings = settings.display || {}
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!dateObj || isNaN(dateObj.getTime())) {
      return String(date) // Return original if invalid
    }
    const dateFormat = formatString || displaySettings.dateFormat || 'MM/dd/yyyy'
    
    return format(dateObj, dateFormat)
  } catch (error) {
    return String(date) // Return original if parsing fails
  }
}

// Server-side: Format number
export async function formatNumberServer(value: number | bigint | string | null | undefined): Promise<string> {
  if (value === null || value === undefined) return 'N/A'
  
  const settings = await getServerSettings()
  const displaySettings = settings.display || {}
  const numberFormat = displaySettings.numberFormat || 'standard'
  
  const numValue = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'bigint' ? Number(value) : value
  
  if (isNaN(numValue)) return 'N/A'
  
  if (numberFormat === 'compact') {
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`
    }
    if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`
    }
    return numValue.toString()
  }
  
  return numValue.toLocaleString('en-US')
}
