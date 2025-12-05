/**
 * CSV Parser for Spotify Charts
 * 
 * Parses downloaded CSV files and maps to ChartEntry format
 * Also includes JSON API response parser
 */

import { parse } from 'csv-parse/sync'
import { SpotifyChartResponse } from './spotifyCharts'

export interface ParsedChartRow {
  rank: number
  uri: string
  artistNames: string
  trackName: string
  source?: string
  peakRank?: number
  previousRank?: number
  daysOnChart?: number
  streams?: string // Keep as string to handle large numbers
}

export interface ParsedChartData {
  rows: ParsedChartRow[]
  chartType: 'regional' | 'viral'
  chartPeriod: 'daily' | 'weekly'
  date: string
}

/**
 * Parse CSV text into structured data
 */
export function parseChartCSV(
  csvText: string,
  chartType: 'regional' | 'viral',
  chartPeriod: 'daily' | 'weekly',
  date: string
): ParsedChartData {
  const expectedHeaders = chartType === 'regional' 
    ? ['rank', 'uri', 'artist_names', 'track_name', 'source', 'peak_rank', 'previous_rank', 'days_on_chart', 'streams']
    : ['rank', 'uri', 'artist_names', 'track_name', 'source', 'peak_rank', 'previous_rank', 'days_on_chart']

  // Parse CSV using csv-parse library
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  if (!records || records.length === 0) {
    throw new Error('CSV file must have at least a header and one data row')
  }

  // Validate headers
  const headerKeys = Object.keys(records[0]).map(h => h.toLowerCase().trim())
  const hasRequiredHeaders = expectedHeaders.every(h => headerKeys.includes(h))
  
  if (!hasRequiredHeaders) {
    throw new Error(`CSV headers don't match expected format. Expected: ${expectedHeaders.join(', ')}`)
  }

  // Parse data rows
  const rows: ParsedChartRow[] = []
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    
    try {
      const row: ParsedChartRow = {
        rank: parseInt(record['rank'] || '0', 10),
        uri: (record['uri'] || '').trim(),
        artistNames: (record['artist_names'] || '').trim(),
        trackName: (record['track_name'] || '').trim(),
      }

      // Optional fields
      if (record['source']) {
        row.source = record['source'].trim() || undefined
      }
      
      if (record['peak_rank'] && record['peak_rank'].trim()) {
        const peakRank = parseInt(record['peak_rank'], 10)
        if (!isNaN(peakRank)) {
          row.peakRank = peakRank
        }
      }
      
      if (record['previous_rank'] && record['previous_rank'].trim()) {
        const previousRank = parseInt(record['previous_rank'], 10)
        if (!isNaN(previousRank)) {
          row.previousRank = previousRank
        }
      }
      
      if (record['days_on_chart'] && record['days_on_chart'].trim()) {
        const daysOnChart = parseInt(record['days_on_chart'], 10)
        if (!isNaN(daysOnChart)) {
          row.daysOnChart = daysOnChart
        }
      }
      
      if (record['streams'] && record['streams'].trim()) {
        row.streams = record['streams'].trim()
      }

      // Validate required fields
      if (!row.uri || !row.artistNames || !row.trackName || !row.rank) {
        console.warn(`[CSVParser] Skipping invalid row ${i + 1}:`, row)
        continue
      }

      rows.push(row)
    } catch (error) {
      console.warn(`[CSVParser] Error parsing row ${i + 1}:`, error)
      continue
    }
  }

  console.log(`[CSVParser] Parsed ${rows.length} rows from CSV`)

  return {
    rows,
    chartType,
    chartPeriod,
    date,
  }
}

/**
 * Parse JSON API response into chart data format
 */
export function parseChartData(
  apiResponse: SpotifyChartResponse,
  chartType: 'regional' | 'viral',
  chartPeriod: 'daily' | 'weekly',
  date: string
): ParsedChartData {
  if (!apiResponse.chartEntryViewResponses || apiResponse.chartEntryViewResponses.length === 0) {
    throw new Error('No chart entry view responses in API response')
  }

  const entries = apiResponse.chartEntryViewResponses[0].entries
  
  if (!entries || entries.length === 0) {
    throw new Error('No entries found in chart response')
  }

  const rows: ParsedChartRow[] = entries.map((entry) => {
    const metadata = entry.trackMetadata
    const chartData = entry.chartEntryData

    // Extract artist names
    const artistNames = metadata.artists
      .map(artist => artist.name)
      .join(', ')

    // Extract track URI (format: spotify:track:...)
    const trackUri = metadata.trackUri || ''

    // Extract label/source (first label if available)
    const source = metadata.labels && metadata.labels.length > 0
      ? metadata.labels[0].name
      : undefined

    const row: ParsedChartRow = {
      rank: chartData.currentRank,
      uri: trackUri,
      artistNames,
      trackName: metadata.trackName,
      source,
      peakRank: chartData.peakRank,
      previousRank: chartData.previousRank,
      daysOnChart: chartData.appearancesOnChart,
      streams: chartData.appearancesOnChart ? String(chartData.appearancesOnChart) : undefined,
    }

    // Validate required fields
    if (!row.uri || !row.artistNames || !row.trackName || !row.rank) {
      console.warn(`[ChartParser] Skipping invalid entry:`, row)
      return null
    }

    return row
  }).filter((row): row is ParsedChartRow => row !== null)

  console.log(`[ChartParser] Parsed ${rows.length} entries from JSON API response`)

  return {
    rows,
    chartType,
    chartPeriod,
    date,
  }
}

/**
 * Extract Spotify track ID from URI
 * Format: spotify:track:4iV5W9uYEdYUVa79Axb7Rh
 */
export function extractSpotifyTrackId(uri: string): string | null {
  if (!uri) return null
  const match = uri.match(/spotify:track:([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

/**
 * Extract Spotify artist ID from URI (if available)
 * Format: spotify:artist:4iV5W9uYEdYUVa79Axb7Rh
 */
export function extractSpotifyArtistId(uri: string): string | null {
  if (!uri) return null
  const match = uri.match(/spotify:artist:([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}
