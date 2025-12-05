/**
 * Spotify Charts API Integration
 * 
 * Handles both CSV downloads (for manual uploads) and JSON API for weekly charts
 */

const SPOTIFY_CHARTS_BASE_URL = process.env.SPOTIFY_CHARTS_BASE_URL || 
  'https://charts-spotify-com-service.spotify.com/v1/charts'

const SPOTIFY_CHARTS_JSON_API = 'https://charts-spotify-com-service.spotify.com/public/v0/charts'

export interface SpotifyChartResponse {
  chartEntryViewResponses: Array<{
    displayChart: {
      date: string
      description: string
      chartMetadata: {
        uri: string
        alias: string
        entityType: string
        readableTitle: string
      }
    }
    entries: Array<{
      trackMetadata: {
        trackName: string
        trackUri: string
        artists: Array<{
          name: string
          spotifyUri?: string
        }>
        displayImageUri?: string
        labels?: Array<{
          name: string
        }>
      }
      chartEntryData: {
        currentRank: number
        previousRank?: number
        peakRank?: number
        peakDate?: string
        appearancesOnChart?: number
        consecutiveAppearancesOnChart?: number
        entryStatus?: string
      }
    }>
  }>
}

export interface ChartRequest {
  chartType: 'regional' | 'viral'
  chartPeriod: 'daily' | 'weekly'
  region?: string // e.g., 'global', 'us', 'gb', 'nyc', 'london'
  regionType?: 'city' | 'country' | null
  date: string // YYYY-MM-DD format
}

/**
 * Construct Spotify Charts CSV URL
 * 
 * URL format based on sample files:
 * - Regional Global Daily: regional-global-daily-2025-12-03
 * - Regional US Daily: regional-us-daily-2025-12-03
 * - Viral Global Daily: viral-global-daily-2025-12-03
 * - Regional Global Weekly: regional-global-weekly-2025-11-27
 */
export function constructChartUrl(request: ChartRequest): string {
  const { chartType, chartPeriod, region = 'global', date } = request
  
  // Format: {chartType}-{region}-{period}-{date}
  const chartName = `${chartType}-${region}-${chartPeriod}-${date}`
  return `${SPOTIFY_CHARTS_BASE_URL}/${chartName}`
}

/**
 * Download CSV file from Spotify Charts
 * 
 * NOTE: This endpoint may not work directly. CSV files may need to be:
 * - Downloaded manually from spotifycharts.com
 * - Obtained via web scraping
 * - Retrieved from an alternative endpoint
 */
export async function downloadChartCSV(request: ChartRequest): Promise<string> {
  const url = constructChartUrl(request)
  
  console.log(`[SpotifyCharts] Attempting to download CSV from: ${url}`)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'Mozilla/5.0 (compatible; Augur/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    
    // Check if we got HTML instead of CSV
    if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
      throw new Error('Received HTML instead of CSV. CSV download endpoint may not be available.')
    }
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Downloaded CSV is empty')
    }

    // Validate it's actually CSV
    if (!csvText.startsWith('rank,')) {
      throw new Error('Response does not appear to be a valid CSV file')
    }

    console.log(`[SpotifyCharts] Successfully downloaded CSV (${csvText.length} bytes)`)
    return csvText
  } catch (error) {
    console.error(`[SpotifyCharts] Error downloading CSV:`, error)
    throw error
  }
}

/**
 * Validate chart request parameters
 */
export function validateChartRequest(request: ChartRequest): { valid: boolean; error?: string } {
  if (!['regional', 'viral'].includes(request.chartType)) {
    return { valid: false, error: 'Invalid chartType. Must be "regional" or "viral"' }
  }

  if (!['daily', 'weekly'].includes(request.chartPeriod)) {
    return { valid: false, error: 'Invalid chartPeriod. Must be "daily" or "weekly"' }
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(request.date)) {
    return { valid: false, error: 'Invalid date format. Must be YYYY-MM-DD' }
  }

  // Validate date is valid
  const dateObj = new Date(request.date)
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Invalid date' }
  }

  return { valid: true }
}

/**
 * Fetch weekly chart data from Spotify JSON API
 * 
 * This endpoint works without authentication and returns weekly chart data
 */
export async function fetchWeeklyChartData(): Promise<SpotifyChartResponse> {
  console.log(`[SpotifyCharts] Fetching weekly chart data from JSON API: ${SPOTIFY_CHARTS_JSON_API}`)
  
  try {
    const response = await fetch(SPOTIFY_CHARTS_JSON_API, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Augur/1.0)',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[SpotifyCharts] API returned ${response.status}:`, errorText)
      throw new Error(`Failed to fetch chart data: ${response.status} ${response.statusText}. Response: ${errorText.substring(0, 200)}`)
    }

    const data: SpotifyChartResponse = await response.json()
    
    console.log(`[SpotifyCharts] API response structure:`, {
      hasChartEntryViewResponses: !!data.chartEntryViewResponses,
      responseCount: data.chartEntryViewResponses?.length || 0,
      firstResponseEntries: data.chartEntryViewResponses?.[0]?.entries?.length || 0,
    })
    
    if (!data.chartEntryViewResponses || data.chartEntryViewResponses.length === 0) {
      throw new Error('No chart data returned from API. Response structure may have changed.')
    }

    const entryCount = data.chartEntryViewResponses[0]?.entries?.length || 0
    console.log(`[SpotifyCharts] Successfully fetched weekly chart data (${entryCount} entries)`)
    
    return data
  } catch (error) {
    console.error(`[SpotifyCharts] Error fetching weekly chart data:`, error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch weekly charts: ${error.message}`)
    }
    throw error
  }
}

/**
 * Get available regions (common cities and countries)
 * This can be expanded based on Spotify's available regions
 */
export const AVAILABLE_REGIONS = {
  global: { name: 'Global', type: null },
  // Countries
  us: { name: 'United States', type: 'country' as const },
  ar: { name: 'Argentina', type: 'country' as const },
  au: { name: 'Australia', type: 'country' as const },
  at: { name: 'Austria', type: 'country' as const },
  by: { name: 'Belarus', type: 'country' as const },
  be: { name: 'Belgium', type: 'country' as const },
  bo: { name: 'Bolivia', type: 'country' as const },
  br: { name: 'Brazil', type: 'country' as const },
  bg: { name: 'Bulgaria', type: 'country' as const },
  ca: { name: 'Canada', type: 'country' as const },
  cl: { name: 'Chile', type: 'country' as const },
  co: { name: 'Colombia', type: 'country' as const },
  cr: { name: 'Costa Rica', type: 'country' as const },
  cy: { name: 'Cyprus', type: 'country' as const },
  cz: { name: 'Czech Republic', type: 'country' as const },
  dk: { name: 'Denmark', type: 'country' as const },
  do: { name: 'Dominican Republic', type: 'country' as const },
  ec: { name: 'Ecuador', type: 'country' as const },
  eg: { name: 'Egypt', type: 'country' as const },
  sv: { name: 'El Salvador', type: 'country' as const },
  ee: { name: 'Estonia', type: 'country' as const },
  fi: { name: 'Finland', type: 'country' as const },
  fr: { name: 'France', type: 'country' as const },
  de: { name: 'Germany', type: 'country' as const },
  gr: { name: 'Greece', type: 'country' as const },
  gt: { name: 'Guatemala', type: 'country' as const },
  hn: { name: 'Honduras', type: 'country' as const },
  hk: { name: 'Hong Kong', type: 'country' as const },
  hu: { name: 'Hungary', type: 'country' as const },
  is: { name: 'Iceland', type: 'country' as const },
  in: { name: 'India', type: 'country' as const },
  id: { name: 'Indonesia', type: 'country' as const },
  ie: { name: 'Ireland', type: 'country' as const },
  il: { name: 'Israel', type: 'country' as const },
  it: { name: 'Italy', type: 'country' as const },
  jp: { name: 'Japan', type: 'country' as const },
  kz: { name: 'Kazakhstan', type: 'country' as const },
  lv: { name: 'Latvia', type: 'country' as const },
  lt: { name: 'Lithuania', type: 'country' as const },
  lu: { name: 'Luxembourg', type: 'country' as const },
  my: { name: 'Malaysia', type: 'country' as const },
  mx: { name: 'Mexico', type: 'country' as const },
  ma: { name: 'Morocco', type: 'country' as const },
  nl: { name: 'Netherlands', type: 'country' as const },
  nz: { name: 'New Zealand', type: 'country' as const },
  ni: { name: 'Nicaragua', type: 'country' as const },
  ng: { name: 'Nigeria', type: 'country' as const },
  no: { name: 'Norway', type: 'country' as const },
  pk: { name: 'Pakistan', type: 'country' as const },
  pa: { name: 'Panama', type: 'country' as const },
  py: { name: 'Paraguay', type: 'country' as const },
  pe: { name: 'Peru', type: 'country' as const },
  ph: { name: 'Philippines', type: 'country' as const },
  pl: { name: 'Poland', type: 'country' as const },
  pt: { name: 'Portugal', type: 'country' as const },
  ro: { name: 'Romania', type: 'country' as const },
  sa: { name: 'Saudi Arabia', type: 'country' as const },
  sg: { name: 'Singapore', type: 'country' as const },
  sk: { name: 'Slovakia', type: 'country' as const },
  za: { name: 'South Africa', type: 'country' as const },
  kr: { name: 'South Korea', type: 'country' as const },
  es: { name: 'Spain', type: 'country' as const },
  se: { name: 'Sweden', type: 'country' as const },
  ch: { name: 'Switzerland', type: 'country' as const },
  tw: { name: 'Taiwan', type: 'country' as const },
  th: { name: 'Thailand', type: 'country' as const },
  tr: { name: 'Turkey', type: 'country' as const },
  ae: { name: 'UAE', type: 'country' as const },
  ua: { name: 'Ukraine', type: 'country' as const },
  gb: { name: 'United Kingdom', type: 'country' as const },
  uy: { name: 'Uruguay', type: 'country' as const },
  ve: { name: 'Venezuela', type: 'country' as const },
  vn: { name: 'Vietnam', type: 'country' as const },
  // US Cities
  nyc: { name: 'New York City', type: 'city' as const },
  la: { name: 'Los Angeles', type: 'city' as const },
  chicago: { name: 'Chicago', type: 'city' as const },
  miami: { name: 'Miami', type: 'city' as const },
  // Other Cities
  london: { name: 'London', type: 'city' as const },
  toronto: { name: 'Toronto', type: 'city' as const },
  sydney: { name: 'Sydney', type: 'city' as const },
  paris: { name: 'Paris', type: 'city' as const },
  berlin: { name: 'Berlin', type: 'city' as const },
  tokyo: { name: 'Tokyo', type: 'city' as const },
}

// Helper to get US cities
export const US_CITIES = Object.entries(AVAILABLE_REGIONS)
  .filter(([code, info]) => info.type === 'city' && ['nyc', 'la', 'chicago', 'miami'].includes(code))
  .map(([code, info]) => ({ code, name: info.name, type: info.type }))

// Helper to get all countries except US
export const OTHER_COUNTRIES = Object.entries(AVAILABLE_REGIONS)
  .filter(([code, info]) => info.type === 'country' && code !== 'us')
  .map(([code, info]) => ({ code, name: info.name, type: info.type }))
