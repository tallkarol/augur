/**
 * Metrics calculation utilities for dashboard views
 * Handles lead scoring, aggregations, and trend calculations
 */

import { supabase } from '@/lib/supabase'

// Cache for multipliers to avoid repeated DB calls
let multipliersCache: {
  daysTop10Multiplier: number
  daysTop20Multiplier: number
  avgPositionMultiplier: number
  bestPositionMultiplier: number
} | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 1 minute cache

function getDefaultMultipliers() {
  return {
    daysTop10Multiplier: 15,
    daysTop20Multiplier: 8,
    avgPositionMultiplier: 10,
    bestPositionMultiplier: 5,
  }
}

/**
 * Get lead score multipliers from settings with caching
 * Exported for use in API routes
 */
export async function getLeadScoreMultipliers(): Promise<{
  daysTop10Multiplier: number
  daysTop20Multiplier: number
  avgPositionMultiplier: number
  bestPositionMultiplier: number
}> {
  // Return cached value if still valid
  if (multipliersCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return multipliersCache
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('category', 'lead_score')

    if (error) {
      console.warn('[Metrics] Failed to load lead score settings, using defaults:', error)
      multipliersCache = getDefaultMultipliers()
      cacheTimestamp = Date.now()
      return multipliersCache
    }

    const multipliers = getDefaultMultipliers()

    data?.forEach((setting) => {
      try {
        const value = JSON.parse(setting.value)
        if (setting.key === 'daysTop10Multiplier') multipliers.daysTop10Multiplier = value
        else if (setting.key === 'daysTop20Multiplier') multipliers.daysTop20Multiplier = value
        else if (setting.key === 'avgPositionMultiplier') multipliers.avgPositionMultiplier = value
        else if (setting.key === 'bestPositionMultiplier') multipliers.bestPositionMultiplier = value
      } catch {
        // Ignore parse errors
      }
    })

    multipliersCache = multipliers
    cacheTimestamp = Date.now()
    return multipliers
  } catch (error) {
    console.warn('[Metrics] Error loading lead score settings, using defaults:', error)
    multipliersCache = getDefaultMultipliers()
    cacheTimestamp = Date.now()
    return multipliersCache
  }
}

/**
 * Clear the multipliers cache (useful after settings updates)
 */
export function clearLeadScoreCache() {
  multipliersCache = null
  cacheTimestamp = 0
}

export interface TrackMetrics {
  trackId: string
  trackName: string
  artistId: string
  artistName: string
  positions: number[]
  dates: string[]
  chartType: string
  chartPeriod: string
  region: string | null
}

export interface LeadScoreBreakdown {
  daysInTop10: number
  daysInTop20: number
  averagePosition: number
  bestPosition: number
  totalDays: number
}

export interface CalculatedLeadScore {
  score: number
  breakdown: LeadScoreBreakdown
}

/**
 * Calculate lead score for a track based on its performance over a date range
 * Uses configurable multipliers from settings, with defaults if not configured
 * Formula: (days_top10 × multiplier) + (days_top20_only × multiplier) + ((51 - avg_position) × multiplier) + ((51 - best_position) × multiplier)
 */
export async function calculateLeadScore(metrics: TrackMetrics, multipliers?: {
  daysTop10Multiplier: number
  daysTop20Multiplier: number
  avgPositionMultiplier: number
  bestPositionMultiplier: number
}): Promise<CalculatedLeadScore> {
  if (!metrics.positions || metrics.positions.length === 0) {
    return {
      score: 0,
      breakdown: {
        daysInTop10: 0,
        daysInTop20: 0,
        averagePosition: 0,
        bestPosition: 0,
        totalDays: 0,
      },
    }
  }

  // Get multipliers from parameter or settings
  const m = multipliers || await getLeadScoreMultipliers()

  const positions = metrics.positions
  const daysInTop10 = positions.filter(p => p <= 10).length
  const daysInTop20 = positions.filter(p => p <= 20).length
  const averagePosition = positions.reduce((sum, p) => sum + p, 0) / positions.length
  const bestPosition = Math.min(...positions)
  const totalDays = positions.length

  // Cumulative: days in top 10 also count toward top 20
  const daysInTop20Only = daysInTop20 - daysInTop10

  const score =
    daysInTop10 * m.daysTop10Multiplier +
    daysInTop20Only * m.daysTop20Multiplier +
    (51 - averagePosition) * m.avgPositionMultiplier +
    (51 - bestPosition) * m.bestPositionMultiplier

  return {
    score: Math.round(score * 10) / 10, // Round to 1 decimal place
    breakdown: {
      daysInTop10,
      daysInTop20: daysInTop20, // Total days in top 20 (includes top 10)
      averagePosition: Math.round(averagePosition * 10) / 10,
      bestPosition,
      totalDays,
    },
  }
}

/**
 * Synchronous version that uses default multipliers (for backwards compatibility)
 * Prefer using the async version with settings
 */
export function calculateLeadScoreSync(metrics: TrackMetrics, multipliers?: {
  daysTop10Multiplier: number
  daysTop20Multiplier: number
  avgPositionMultiplier: number
  bestPositionMultiplier: number
}): CalculatedLeadScore {
  if (!metrics.positions || metrics.positions.length === 0) {
    return {
      score: 0,
      breakdown: {
        daysInTop10: 0,
        daysInTop20: 0,
        averagePosition: 0,
        bestPosition: 0,
        totalDays: 0,
      },
    }
  }

  const m = multipliers || getDefaultMultipliers()

  const positions = metrics.positions
  const daysInTop10 = positions.filter(p => p <= 10).length
  const daysInTop20 = positions.filter(p => p <= 20).length
  const averagePosition = positions.reduce((sum, p) => sum + p, 0) / positions.length
  const bestPosition = Math.min(...positions)
  const totalDays = positions.length

  const daysInTop20Only = daysInTop20 - daysInTop10

  const score =
    daysInTop10 * m.daysTop10Multiplier +
    daysInTop20Only * m.daysTop20Multiplier +
    (51 - averagePosition) * m.avgPositionMultiplier +
    (51 - bestPosition) * m.bestPositionMultiplier

  return {
    score: Math.round(score * 10) / 10,
    breakdown: {
      daysInTop10,
      daysInTop20,
      averagePosition: Math.round(averagePosition * 10) / 10,
      bestPosition,
      totalDays,
    },
  }
}

/**
 * Calculate aggregate lead score for an artist across all their tracks
 */
export function calculateArtistLeadScore(trackScores: CalculatedLeadScore[]): number {
  const total = trackScores.reduce((sum, trackScore) => sum + trackScore.score, 0)
  return Math.round(total * 10) / 10 // Round to 1 decimal place
}

/**
 * Check if a track shows consistent upward trend
 * Returns true if 3+ consecutive days improving OR 5+ days improving out of 7
 */
export function hasUpwardTrend(positions: number[]): boolean {
  if (positions.length < 3) return false

  // Check for 3+ consecutive days improving
  let consecutiveImprovements = 0
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] < positions[i - 1]) {
      // Position improved (lower number = better)
      consecutiveImprovements++
      if (consecutiveImprovements >= 2) {
        // 2 improvements = 3 consecutive days
        return true
      }
    } else {
      consecutiveImprovements = 0
    }
  }

  // Check for 5+ days improving out of last 7
  if (positions.length >= 7) {
    const last7 = positions.slice(-7)
    let improvements = 0
    for (let i = 1; i < last7.length; i++) {
      if (last7[i] < last7[i - 1]) {
        improvements++
      }
    }
    if (improvements >= 5) {
      return true
    }
  }

  return false
}

/**
 * Calculate consistency score (standard deviation of positions)
 * Lower score = more consistent
 */
export function calculateConsistencyScore(positions: number[]): number {
  if (positions.length < 2) return 0

  const avg = positions.reduce((sum, p) => sum + p, 0) / positions.length
  const variance =
    positions.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / positions.length
  return Math.round(Math.sqrt(variance) * 10) / 10
}

/**
 * Group chart entries by track for aggregation
 */
export function groupEntriesByTrack(entries: any[]): Map<string, TrackMetrics> {
  const trackMap = new Map<string, TrackMetrics>()

  for (const entry of entries) {
    const key = `${entry.trackId}-${entry.chartType}-${entry.chartPeriod}-${entry.region || 'global'}`
    
    if (!trackMap.has(key)) {
      trackMap.set(key, {
        trackId: entry.trackId,
        trackName: entry.tracks?.name || 'Unknown',
        artistId: entry.artistId,
        artistName: entry.artists?.name || 'Unknown',
        positions: [],
        dates: [],
        chartType: entry.chartType,
        chartPeriod: entry.chartPeriod,
        region: entry.region,
      })
    }

    const metrics = trackMap.get(key)!
    metrics.positions.push(entry.position)
    metrics.dates.push(entry.date)
  }

  // Sort by date to ensure chronological order
  for (const [key, metrics] of trackMap.entries()) {
    const dateIndices = metrics.dates
      .map((date, idx) => ({ date, idx }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    metrics.positions = dateIndices.map(({ idx }) => metrics.positions[idx])
    metrics.dates = dateIndices.map(({ date }) => date)
  }

  return trackMap
}

/**
 * Group chart entries by artist for aggregation
 */
export function groupEntriesByArtist(entries: any[]): Map<string, any[]> {
  const artistMap = new Map<string, any[]>()

  for (const entry of entries) {
    const artistId = entry.artistId
    if (!artistMap.has(artistId)) {
      artistMap.set(artistId, [])
    }
    artistMap.get(artistId)!.push(entry)
  }

  return artistMap
}
