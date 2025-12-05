/**
 * Deduplication System
 * 
 * Checks for duplicate chart entries and handles them based on user preference
 */

import { supabase } from './supabase'
import { ParsedChartRow } from './csvParser'

export interface DuplicateCheck {
  date: string
  chartType: string
  chartPeriod: string
  region: string | null
  exists: boolean
  existingEntryCount?: number
}

export interface DuplicateResult {
  hasDuplicates: boolean
  duplicates: DuplicateCheck[]
  totalExistingEntries: number
}

/**
 * Check for duplicate chart entries
 */
export async function checkDuplicates(
  date: string,
  chartType: string,
  chartPeriod: string,
  region: string | null
): Promise<DuplicateCheck> {
  const chartDate = new Date(date)
  
  let query = supabase
    .from('chart_entries')
    .select('id', { count: 'exact' })
    .eq('date', chartDate.toISOString())
    .eq('chartType', chartType)
    .eq('chartPeriod', chartPeriod)
    .eq('platform', 'spotify')

  // Handle null region correctly - use .is() for null checks
  if (region === null || region === undefined) {
    query = query.is('region', null)
  } else {
    query = query.eq('region', region)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[Deduplication] Error checking duplicates:', error)
    throw error
  }

  return {
    date,
    chartType,
    chartPeriod,
    region: region || null,
    exists: (count || 0) > 0,
    existingEntryCount: count || 0,
  }
}

/**
 * Check for duplicates across multiple chart configurations
 */
export async function checkMultipleDuplicates(
  checks: Array<{
    date: string
    chartType: string
    chartPeriod: string
    region: string | null
  }>
): Promise<DuplicateResult> {
  const duplicates: DuplicateCheck[] = []
  let totalExistingEntries = 0

  for (const check of checks) {
    const result = await checkDuplicates(
      check.date,
      check.chartType,
      check.chartPeriod,
      check.region
    )
    
    duplicates.push(result)
    if (result.exists && result.existingEntryCount) {
      totalExistingEntries += result.existingEntryCount
    }
  }

  return {
    hasDuplicates: duplicates.some(d => d.exists),
    duplicates,
    totalExistingEntries,
  }
}

/**
 * Handle duplicates based on action
 * 
 * Actions:
 * - 'skip': Don't insert duplicates
 * - 'update': Update existing entries with new data
 * - 'replace': Delete existing entries and insert new ones
 */
export async function handleDuplicates(
  date: string,
  chartType: string,
  chartPeriod: string,
  region: string | null,
  action: 'skip' | 'update' | 'replace'
): Promise<{ deleted: number; skipped: boolean }> {
  const duplicateCheck = await checkDuplicates(date, chartType, chartPeriod, region)

  if (!duplicateCheck.exists) {
    return { deleted: 0, skipped: false }
  }

  const chartDate = new Date(date)

  if (action === 'skip') {
    console.log(`[Deduplication] Skipping duplicate entries for ${date}`)
    return { deleted: 0, skipped: true }
  }

  if (action === 'replace') {
    // Delete existing entries
    let deleteQuery = supabase
      .from('chart_entries')
      .delete()
      .eq('date', chartDate.toISOString())
      .eq('chartType', chartType)
      .eq('chartPeriod', chartPeriod)
      .eq('platform', 'spotify')

    // Handle null region correctly
    if (region === null || region === undefined) {
      deleteQuery = deleteQuery.is('region', null)
    } else {
      deleteQuery = deleteQuery.eq('region', region)
    }

    const { data, error } = await deleteQuery.select()

    if (error) {
      throw new Error(`Failed to delete existing entries: ${error.message}`)
    }

    console.log(`[Deduplication] Replaced ${data?.length || 0} existing entries for ${date}`)
    return { deleted: data?.length || 0, skipped: false }
  }

  // For 'update', we'll let the processor handle it via upsert logic
  // This function just indicates we should proceed with upsert
  return { deleted: 0, skipped: false }
}

/**
 * Get default deduplication action from settings
 */
export async function getDefaultDeduplicationAction(source: 'playlist' | 'json_api' | 'csv_upload'): Promise<'skip' | 'update' | 'replace' | 'show-warning'> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'defaultDeduplicationAction')
      .eq('category', source)
      .limit(1)
      .single()

    if (data) {
      try {
        return JSON.parse(data.value) as 'skip' | 'update' | 'replace' | 'show-warning'
      } catch {
        return data.value as 'skip' | 'update' | 'replace' | 'show-warning'
      }
    }

    // Defaults
    if (source === 'csv_upload') {
      return 'show-warning'
    }
    return 'skip'
  } catch (error) {
    console.error('[Deduplication] Error getting default action:', error)
    return source === 'csv_upload' ? 'show-warning' : 'skip'
  }
}
