/**
 * Chart Data Processor
 * 
 * Processes parsed CSV data, upserts artists/tracks, and creates chart entries
 */

import { supabase } from './supabase'
import { ParsedChartData, ParsedChartRow, extractSpotifyTrackId } from './csvParser'
import { format, parseISO } from 'date-fns'

export interface ProcessChartResult {
  success: boolean
  artistsCreated: number
  artistsUpdated: number
  tracksCreated: number
  tracksUpdated: number
  entriesCreated: number
  entriesUpdated: number
  errors: string[]
}

/**
 * Process parsed chart data and store in database
 */
export async function processChartData(
  data: ParsedChartData,
  region?: string,
  regionType?: 'city' | 'country' | null,
  uploadId?: string
): Promise<ProcessChartResult> {
  const result: ProcessChartResult = {
    success: true,
    artistsCreated: 0,
    artistsUpdated: 0,
    tracksCreated: 0,
    tracksUpdated: 0,
    entriesCreated: 0,
    entriesUpdated: 0,
    errors: [],
  }

  const chartDate = parseISO(data.date)
  
  console.log(`[ChartProcessor] Processing ${data.rows.length} chart entries for ${data.date}`)

  // Process rows in batches to avoid overwhelming the database
  const batchSize = 50
  for (let i = 0; i < data.rows.length; i += batchSize) {
    const batch = data.rows.slice(i, i + batchSize)
    
    try {
      console.log(`[ChartProcessor] Processing batch ${i}-${i + batch.length} of ${data.rows.length}`)
      await processBatch(batch, data, chartDate, region, regionType, result, uploadId)
      console.log(`[ChartProcessor] Completed batch ${i}-${i + batch.length}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[ChartProcessor] Error processing batch ${i}-${i + batch.length}:`, errorMsg)
      result.errors.push(`Batch ${i}-${i + batch.length}: ${errorMsg}`)
      result.success = false
    }
  }

  console.log(`[ChartProcessor] Processing complete:`, {
    artists: result.artistsCreated + result.artistsUpdated,
    tracks: result.tracksCreated + result.tracksUpdated,
    entries: result.entriesCreated + result.entriesUpdated,
  })

  return result
}

/**
 * Process a batch of chart rows
 */
async function processBatch(
  batch: ParsedChartRow[],
  data: ParsedChartData,
  chartDate: Date,
  region: string | undefined,
  regionType: 'city' | 'country' | null | undefined,
  result: ProcessChartResult,
  uploadId?: string
): Promise<void> {
  console.log(`[ChartProcessor] Starting batch processing for ${batch.length} rows`)
  
  // First, ensure all artists and tracks exist
  const artistMap = new Map<string, string>() // artist name -> artist id
  const trackMap = new Map<string, { trackId: string; artistId: string }>() // track URI -> {trackId, artistId}

  // Collect unique artist names
  const uniqueArtists = new Set<string>()
  for (const row of batch) {
    uniqueArtists.add(row.artistNames.trim())
  }
  
  console.log(`[ChartProcessor] Processing ${uniqueArtists.size} unique artists`)

  // Process artists sequentially to avoid race conditions (they're fast enough)
  for (const artistName of uniqueArtists) {
    if (!artistMap.has(artistName)) {
      try {
        const artistId = await upsertArtist(artistName, result)
        artistMap.set(artistName, artistId)
      } catch (error) {
        // If artist creation fails, try to fetch existing one (might have been created by another batch)
        const { data: existing } = await supabase
          .from('artists')
          .select('id')
          .eq('name', artistName)
          .eq('platform', 'spotify')
          .limit(1)
        if (existing && existing.length > 0) {
          artistMap.set(artistName, existing[0].id)
        } else {
          throw error
        }
      }
    }
  }
  
  console.log(`[ChartProcessor] Processed artists, now processing ${batch.length} tracks`)

  // Process tracks - limit concurrency to avoid overwhelming database
  const trackConcurrency = 10
  for (let i = 0; i < batch.length; i += trackConcurrency) {
    const trackBatch = batch.slice(i, i + trackConcurrency)
    const trackPromises = trackBatch.map(async (row) => {
      const artistId = artistMap.get(row.artistNames.trim())!
      const trackId = await upsertTrack(row, artistId, result)
      trackMap.set(row.uri, { trackId, artistId })
    })
    await Promise.all(trackPromises)
  }
  
  console.log(`[ChartProcessor] Processed tracks, now creating ${batch.length} chart entries`)

  // Create chart entries - limit concurrency
  const entryConcurrency = 10
  for (let i = 0; i < batch.length; i += entryConcurrency) {
    const entryBatch = batch.slice(i, i + entryConcurrency)
    const entryPromises = entryBatch.map(async (row) => {
      const { trackId, artistId } = trackMap.get(row.uri)!
      await upsertChartEntry(
        trackId,
        artistId,
        row,
        data,
        chartDate,
        region,
        regionType,
        result,
        uploadId
      )
    })
    await Promise.all(entryPromises)
  }
  
  console.log(`[ChartProcessor] Completed batch processing`)
}

/**
 * Upsert an artist
 */
async function upsertArtist(artistName: string, result: ProcessChartResult): Promise<string> {
  // Check if artist exists
  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .eq('name', artistName)
    .eq('platform', 'spotify')
    .limit(1)

  if (existing && existing.length > 0) {
    return existing[0].id
  }

  // Create new artist - generate ID using crypto.randomUUID()
  const artistId = crypto.randomUUID()
  const { data: newArtist, error } = await supabase
    .from('artists')
    .insert({
      id: artistId,
      name: artistName,
      platform: 'spotify',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create artist ${artistName}: ${error.message}`)
  }

  result.artistsCreated++
  return newArtist.id
}

/**
 * Upsert a track
 */
async function upsertTrack(
  row: ParsedChartRow,
  artistId: string,
  result: ProcessChartResult
): Promise<string> {
  const trackId = extractSpotifyTrackId(row.uri)
  
  // Check if track exists by URI or externalId
  const { data: existing } = await supabase
    .from('tracks')
    .select('id')
    .eq('artistId', artistId)
    .eq('name', row.trackName)
    .eq('platform', 'spotify')
    .limit(1)

  if (existing && existing.length > 0) {
    // Update track with URI/externalId if we have it
    if (trackId) {
      await supabase
        .from('tracks')
        .update({
          uri: row.uri,
          externalId: trackId,
        })
        .eq('id', existing[0].id)
      result.tracksUpdated++
    }
    return existing[0].id
  }

  // Create new track - generate ID using crypto.randomUUID()
  const newTrackId = crypto.randomUUID()
  const { data: newTrack, error } = await supabase
    .from('tracks')
    .insert({
      id: newTrackId,
      name: row.trackName,
      artistId,
      platform: 'spotify',
      uri: row.uri,
      externalId: trackId || null,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create track ${row.trackName}: ${error.message}`)
  }

  result.tracksCreated++
  return newTrack.id
}

/**
 * Upsert a chart entry
 */
async function upsertChartEntry(
  trackId: string,
  artistId: string,
  row: ParsedChartRow,
  data: ParsedChartData,
  chartDate: Date,
  region: string | undefined,
  regionType: 'city' | 'country' | null | undefined,
  result: ProcessChartResult,
  uploadId?: string
): Promise<void> {
  // Check if entry already exists
  const { data: existing } = await supabase
    .from('chart_entries')
    .select('id')
    .eq('trackId', trackId)
    .eq('artistId', artistId)
    .eq('date', chartDate.toISOString())
    .eq('chartType', data.chartType)
    .eq('chartPeriod', data.chartPeriod)
    .eq('platform', 'spotify')
    .limit(1)

  const entryData = {
    trackId,
    artistId,
    position: row.rank,
    date: chartDate.toISOString(),
    platform: 'spotify',
    chartType: data.chartType,
    chartPeriod: data.chartPeriod,
    region: region || null,
    regionType: regionType || null,
    source: row.source || null,
    peakRank: row.peakRank || null,
    previousRank: row.previousRank || null,
    daysOnChart: row.daysOnChart || null,
    streams: row.streams ? BigInt(row.streams) : null,
    uploadId: uploadId || null,
  }

  if (existing && existing.length > 0) {
    // Update existing entry
    const { error } = await supabase
      .from('chart_entries')
      .update(entryData)
      .eq('id', existing[0].id)

    if (error) {
      throw new Error(`Failed to update chart entry: ${error.message}`)
    }

    result.entriesUpdated++
  } else {
    // Create new entry - generate ID using crypto.randomUUID()
    const entryId = crypto.randomUUID()
    const { error } = await supabase
      .from('chart_entries')
      .insert({
        id: entryId,
        ...entryData,
      })

    if (error) {
      throw new Error(`Failed to create chart entry: ${error.message}`)
    }

    result.entriesCreated++
  }
}
