import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { autoEnrichTrack } from '@/lib/autoEnrich'
import { enrichTrackData } from '@/lib/enrichArtistData'

async function getAvailableDates(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('chart_entries')
      .select('date')
      .eq('platform', 'spotify')
      .order('date', { ascending: false })

    if (error) {
      console.error('[TracksAPI] Error fetching available dates:', error)
      return []
    }

    const dates = [...new Set((data || []).map(e => format(new Date(e.date), 'yyyy-MM-dd')))].sort()
    return dates
  } catch (error) {
    console.error('[TracksAPI] Error getting available dates:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const limitParam = searchParams.get('limit')
    const periodParam = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const chartTypeParam = searchParams.get('chartType') as 'regional' | 'viral' || 'regional'
    const regionParam = searchParams.get('region') || null
    const limit = limitParam ? parseInt(limitParam, 10) : 50

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
    if (regionParam === null || regionParam === 'global' || regionParam === '') {
      query = query.is('region', null)
    } else {
      query = query.eq('region', regionParam)
    }

    const { data, error } = await query

    if (error) {
      console.error('[TracksAPI] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tracks', details: error.message },
        { status: 500 }
      )
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
    let tracks = Array.from(trackMap.values())
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
      .slice(0, limit)

    // Enrich top tracks with Spotify API (on-the-fly, non-blocking)
    const topTracks = tracks.slice(0, 10)
    console.log('[Tracks API] Enriching top tracks', { count: topTracks.length })
    const enrichedTracks = await Promise.all(
      topTracks.map(async (track) => {
        console.log('[Tracks API] Enriching track', { 
          trackId: track.id, 
          trackName: track.name,
          currentPreviewUrl: track.previewUrl 
        })
        const enriched = await enrichTrackData(track.trackData, track.artist, true)
        console.log('[Tracks API] Enriched track result', { 
          trackId: track.id,
          enrichedPreviewUrl: enriched.previewUrl,
          hasPreviewUrl: !!enriched.previewUrl
        })
        return {
          ...track,
          previewUrl: enriched.previewUrl || track.previewUrl,
          imageUrl: enriched.imageUrl || track.imageUrl,
          externalId: enriched.externalId || track.externalId,
        }
      })
    )
    
    // Merge enriched tracks back
    tracks = tracks.map(track => {
      const enriched = enrichedTracks.find(e => e.id === track.id)
      return enriched || track
    })

    // Remove trackData from response
    tracks = tracks.map(({ trackData, ...rest }) => rest)

    console.log('[Tracks API] Returning tracks', { 
      count: tracks.length,
      tracksWithPreview: tracks.filter(t => t.previewUrl).length,
      sampleTrack: tracks[0] ? {
        id: tracks[0].id,
        name: tracks[0].name,
        previewUrl: tracks[0].previewUrl
      } : null
    })

    return NextResponse.json({ 
      tracks: tracks || [], 
      date: format(latestDate, 'yyyy-MM-dd'),
      chartType: chartTypeParam,
      chartPeriod: periodParam,
      region: regionParam,
      availableDates,
    })
  } catch (error) {
    console.error('Error fetching tracks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    )
  }
}

