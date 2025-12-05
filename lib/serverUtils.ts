import { supabase } from "./supabase"
import { format } from "date-fns"

/**
 * Get available dates from chart entries with simple caching
 */
let availableDatesCache: { dates: string[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 30 * 1000 // 30 seconds (reduced from 5 minutes for faster updates)

/**
 * Invalidate the available dates cache
 * Call this after uploading new data to ensure fresh dates are fetched
 */
export function invalidateAvailableDatesCache(): void {
  availableDatesCache = null
}

export async function getAvailableDates(forceRefresh = false): Promise<string[]> {
  // Check cache unless forced refresh
  if (!forceRefresh && availableDatesCache && availableDatesCache.expiresAt > Date.now()) {
    return availableDatesCache.dates
  }

  try {
    const { data, error } = await supabase
      .from('chart_entries')
      .select('date')
      .eq('platform', 'spotify')
      .order('date', { ascending: false })

    if (error) {
      console.error('[ServerUtils] Error fetching available dates:', error)
      return []
    }

    const dates = [...new Set((data || []).map(e => format(new Date(e.date), 'yyyy-MM-dd')))].sort()
    
    // Update cache
    availableDatesCache = {
      dates,
      expiresAt: Date.now() + CACHE_TTL_MS,
    }
    
    return dates
  } catch (error) {
    console.error('[ServerUtils] Error getting available dates:', error)
    return []
  }
}

/**
 * Get best chart positions for multiple artists/tracks in a single query
 */
export async function getBestChartPositions(
  artistIds?: string[],
  trackIds?: string[]
): Promise<Map<string, { position: number; chartType: string; chartPeriod: string }>> {
  const result = new Map<string, { position: number; chartType: string; chartPeriod: string }>()
  
  if ((!artistIds || artistIds.length === 0) && (!trackIds || trackIds.length === 0)) {
    return result
  }

  let query = supabase
    .from('chart_entries')
    .select('artistId, trackId, position, chartType, chartPeriod, date')
    .order('date', { ascending: false })
    .order('position', { ascending: true })

  if (artistIds && artistIds.length > 0) {
    query = query.in('artistId', artistIds)
  }
  if (trackIds && trackIds.length > 0) {
    query = query.in('trackId', trackIds)
  }

  const { data: entries } = await query.limit(1000) // Get enough entries to find best for each

  if (!entries) {
    return result
  }

  // Group by artistId or trackId and find best position
  const processed = new Set<string>()
  for (const entry of entries) {
    const key = artistIds && entry.artistId ? entry.artistId : entry.trackId
    if (!key || processed.has(key)) continue

    result.set(key, {
      position: entry.position,
      chartType: entry.chartType,
      chartPeriod: entry.chartPeriod,
    })
    processed.add(key)
  }

  return result
}


