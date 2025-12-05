import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { autoEnrichTrack } from '@/lib/autoEnrich'
import { enrichTrackData } from '@/lib/enrichArtistData'
import { getAvailableDates } from '@/lib/serverUtils'
import { normalizeRegion } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const periodParam = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const chartTypeParam = searchParams.get('chartType') as 'regional' | 'viral' || 'regional'
    const regionParam = searchParams.get('region') || null
    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0

    const availableDates = await getAvailableDates()
    const date = dateParam ? dateParam : (availableDates[availableDates.length - 1] || format(new Date(), 'yyyy-MM-dd'))

    // Build query with filters
    let query = supabase
      .from('chart_entries')
      .select(`
        *,
        tracks (
          *,
          artists (*)
        )
      `)
      .lte('date', parseISO(date).toISOString())
      .eq('chartType', chartTypeParam)
      .eq('chartPeriod', periodParam)
      .eq('platform', 'spotify')
      .order('date', { ascending: false })
      .order('position', { ascending: true })
      .limit(limit * 2)

    // Handle region filter
    const normalizedRegion = normalizeRegion(regionParam)
    if (normalizedRegion === null) {
      query = query.is('region', null)
    } else {
      query = query.eq('region', normalizedRegion)
    }

    const { data, error } = await query

    if (error) {
      console.error('[TracksAPI] Database error:', error)
      const errorResponse = NextResponse.json(
        { error: 'Failed to fetch tracks', details: error.message },
        { status: 500 }
      )
      errorResponse.headers.set('Cache-Control', 'no-store')
      return errorResponse
    }

    const latestEntries = data || []

    // Get the latest date
    const latestDate = latestEntries[0]?.date ? new Date(latestEntries[0].date) : parseISO(date)
    const entriesForDate = latestEntries.filter(e => {
      const entryDate = new Date(e.date)
      return entryDate.getTime() === latestDate.getTime()
    })

    // Get best position for each track
    const trackMap = new Map<string, {
      track: any
      artist: any
      bestPosition: number
      currentPosition: number
      previousPosition: number | null
      daysOnChart: number | null
      streams: bigint | null
    }>()

    entriesForDate.forEach(entry => {
      const trackId = entry.trackId
      const track = entry.tracks || entry.track
      const artist = track?.artists || track?.artist
      
      if (!trackMap.has(trackId)) {
        trackMap.set(trackId, {
          track: track,
          artist: artist,
          bestPosition: entry.position,
          currentPosition: entry.position,
          previousPosition: entry.previousRank,
          daysOnChart: entry.daysOnChart,
          streams: entry.streams ? BigInt(entry.streams) : null,
        })
      } else {
        const trackData = trackMap.get(trackId)!
        trackData.bestPosition = Math.min(trackData.bestPosition, entry.position)
        trackData.currentPosition = Math.min(trackData.currentPosition, entry.position)
      }
    })

    // Get chart types for each track (viral vs regional)
    const trackIds = Array.from(trackMap.keys())
    const chartTypesMap = new Map<string, Set<string>>()
    
    if (trackIds.length > 0) {
      const { data: allChartTypes } = await supabase
        .from('chart_entries')
        .select('trackId, chartType')
        .in('trackId', trackIds)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .eq('platform', 'spotify')

      if (allChartTypes) {
        allChartTypes.forEach(entry => {
          if (!chartTypesMap.has(entry.trackId)) {
            chartTypesMap.set(entry.trackId, new Set())
          }
          chartTypesMap.get(entry.trackId)!.add(entry.chartType)
        })
      }
    }

    // Convert to array and sort by position
    let allTracks = Array.from(trackMap.values())
      .map(data => {
        const chartTypes = chartTypesMap.get(data.track.id) || new Set()
        return {
          id: data.track.id,
          name: data.track.name,
          artist: data.artist.name,
          position: data.currentPosition,
          bestPosition: data.bestPosition,
          previousPosition: data.previousPosition,
          daysOnChart: data.daysOnChart,
          streams: data.streams?.toString() || '0',
          change: data.previousPosition 
            ? data.previousPosition - data.currentPosition 
            : null,
          previewUrl: data.track.previewUrl || null,
          imageUrl: data.track.imageUrl || null,
          externalId: data.track.externalId || null,
          chartTypes: Array.from(chartTypes), // ['regional', 'viral'] or ['regional'] or ['viral']
          isViral: chartTypes.has('viral'),
          isTop: chartTypes.has('regional'),
          trackData: data.track, // Keep full track data for enrichment
        }
      })
      .sort((a, b) => a.position - b.position)
    
    const total = allTracks.length
    const paginatedTracks = allTracks.slice(offset, offset + limit)

    // Remove trackData from response before returning
    const finalTracks = paginatedTracks.map(track => {
      const { trackData, ...rest } = track
      return rest
    })

    // Enrich top tracks in background (non-blocking)
    // Don't wait for enrichment - return response immediately
    const topTracks = paginatedTracks.slice(0, 10)
    if (topTracks.length > 0) {
      // Fire and forget - enrich in background
      Promise.all(
        topTracks.map(async (track) => {
          try {
            // Only enrich if missing preview URL
            if (!track.previewUrl && track.trackData) {
              const enriched = await enrichTrackData(track.trackData, track.artist, true)
              // Update in database asynchronously (non-blocking)
              if (enriched.previewUrl || enriched.imageUrl || enriched.externalId) {
                await supabase
                  .from('tracks')
                  .update({
                    previewUrl: enriched.previewUrl || null,
                    imageUrl: enriched.imageUrl || null,
                    externalId: enriched.externalId || null,
                  })
                  .eq('id', track.id)
              }
            }
          } catch (error) {
            // Silently fail - enrichment is optional
            console.error('[Tracks API] Failed to enrich track:', track.id, error)
          }
        })
      ).catch(() => {
        // Silently handle any errors
      })
    }

    const response = NextResponse.json({ 
      tracks: finalTracks || [], 
      total,
      limit,
      offset,
      date: format(latestDate, 'yyyy-MM-dd'),
      chartType: chartTypeParam,
      chartPeriod: periodParam,
      region: regionParam,
      availableDates,
    })

    // Add caching headers - cache for 1 minute
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error fetching tracks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    )
  }
}

