/**
 * CSV Parser for Spotify Charts
 * 
 * Parses downloaded CSV files and maps to ChartEntry format
 * Also includes JSON API response parser
 */

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
  const lines = csvText.trim().split('\n')
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row')
  }

  // Parse header
  const header = parseCSVLine(lines[0])
  const expectedHeaders = chartType === 'regional' 
    ? ['rank', 'uri', 'artist_names', 'track_name', 'source', 'peak_rank', 'previous_rank', 'days_on_chart', 'streams']
    : ['rank', 'uri', 'artist_names', 'track_name', 'source', 'peak_rank', 'previous_rank', 'days_on_chart']

  // Validate headers
  const normalizedHeaders = header.map(h => h.toLowerCase().trim())
  const hasRequiredHeaders = expectedHeaders.every(h => normalizedHeaders.includes(h))
  
  if (!hasRequiredHeaders) {
    throw new Error(`CSV headers don't match expected format. Expected: ${expectedHeaders.join(', ')}`)
  }

  // Create column index map
  const columnMap: Record<string, number> = {}
  header.forEach((col, index) => {
    columnMap[col.toLowerCase().trim()] = index
  })

  // Parse data rows
  const rows: ParsedChartRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    try {
      const values = parseCSVLine(line)
      
      const row: ParsedChartRow = {
        rank: parseInt(values[columnMap['rank']] || '0', 10),
        uri: values[columnMap['uri']]?.replace(/^"|"$/g, '') || '', // Remove quotes
        artistNames: values[columnMap['artist_names']]?.replace(/^"|"$/g, '') || '',
        trackName: values[columnMap['track_name']]?.replace(/^"|"$/g, '') || '',
      }

      // Optional fields
      if (columnMap['source'] !== undefined) {
        row.source = values[columnMap['source']]?.replace(/^"|"$/g, '') || undefined
      }
      
      if (columnMap['peak_rank'] !== undefined && values[columnMap['peak_rank']]) {
        row.peakRank = parseInt(values[columnMap['peak_rank']], 10) || undefined
      }
      
      if (columnMap['previous_rank'] !== undefined && values[columnMap['previous_rank']]) {
        row.previousRank = parseInt(values[columnMap['previous_rank']], 10) || undefined
      }
      
      if (columnMap['days_on_chart'] !== undefined && values[columnMap['days_on_chart']]) {
        row.daysOnChart = parseInt(values[columnMap['days_on_chart']], 10) || undefined
      }
      
      if (columnMap['streams'] !== undefined && values[columnMap['streams']]) {
        row.streams = values[columnMap['streams']]?.replace(/^"|"$/g, '') || undefined
      }

      // Validate required fields
      if (!row.uri || !row.artistNames || !row.trackName || !row.rank) {
        console.warn(`[CSVParser] Skipping invalid row ${i}:`, row)
        continue
      }

      rows.push(row)
    } catch (error) {
      console.warn(`[CSVParser] Error parsing row ${i}:`, error)
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
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  values.push(current)

  return values
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
