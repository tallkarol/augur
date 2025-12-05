import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { autoEnrichArtists } from '@/lib/autoEnrich'

export async function GET(request: NextRequest) {
  try {
    const { data: trackedArtists, error } = await supabase
      .from('tracked_artists')
      .select(`
        *,
        artists (*)
      `)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('[TrackedArtistsAPI] Error fetching tracked artists:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tracked artists', details: error.message },
        { status: 500 }
      )
    }

    // Get chart appearances for each tracked artist
    const artistIds = (trackedArtists || []).map(ta => ta.artistId)
    
    let chartAppearances: Record<string, any> = {}
    let crossChartData: Record<string, Record<string, any[]>> = {} // artistId -> chartKey -> entries
    
    if (artistIds.length > 0) {
      const { data: chartEntries } = await supabase
        .from('chart_entries')
        .select('artistId, chartType, chartPeriod, region, date, position, streams, tracks(name)')
        .in('artistId', artistIds)
        .order('date', { ascending: false })
        .limit(5000) // Get more entries for comprehensive view

      if (chartEntries) {
        chartEntries.forEach(entry => {
          const artistId = entry.artistId
          
          // Initialize stats
          if (!chartAppearances[artistId]) {
            chartAppearances[artistId] = {
              totalAppearances: 0,
              chartTypes: new Set<string>(),
              regions: new Set<string>(),
              bestPosition: Infinity,
              latestDate: null,
              totalStreams: BigInt(0),
              currentPositions: {}, // chartKey -> position
            }
          }
          
          const stats = chartAppearances[artistId]
          stats.totalAppearances++
          stats.chartTypes.add(entry.chartType)
          if (entry.region) stats.regions.add(entry.region)
          if (entry.position < stats.bestPosition) {
            stats.bestPosition = entry.position
          }
          if (!stats.latestDate || new Date(entry.date) > new Date(stats.latestDate)) {
            stats.latestDate = entry.date
          }
          if (entry.streams) {
            stats.totalStreams += BigInt(entry.streams)
          }

          // Track cross-chart data
          const chartKey = `${entry.chartType}-${entry.chartPeriod}-${entry.region || 'global'}`
          if (!crossChartData[artistId]) {
            crossChartData[artistId] = {}
          }
          if (!crossChartData[artistId][chartKey]) {
            crossChartData[artistId][chartKey] = []
          }
          
          // Add entry to cross-chart data (sorted by date)
          const tracks = entry.tracks as any
          const trackName = Array.isArray(tracks) 
            ? (tracks[0]?.name || 'Unknown')
            : (tracks?.name || 'Unknown')
          crossChartData[artistId][chartKey].push({
            date: entry.date,
            position: entry.position,
            streams: entry.streams ? Number(entry.streams) : null,
            trackName,
          })

          // Track current position (most recent entry for each chart)
          const currentDate = new Date(entry.date)
          const currentStatsDate = stats.currentPositions[chartKey]?.date 
            ? new Date(stats.currentPositions[chartKey].date)
            : null
          
          if (!currentStatsDate || currentDate >= currentStatsDate) {
            stats.currentPositions[chartKey] = {
              position: entry.position,
              date: entry.date,
              chartType: entry.chartType,
              chartPeriod: entry.chartPeriod,
              region: entry.region,
            }
          }
        })

        // Sort cross-chart data by date for each chart
        Object.keys(crossChartData).forEach(artistId => {
          Object.keys(crossChartData[artistId]).forEach(chartKey => {
            crossChartData[artistId][chartKey].sort((a, b) => 
              a.date.localeCompare(b.date)
            )
          })
        })
      }
    }

    // Format response
    const formatted = (trackedArtists || []).map(ta => {
      const stats = chartAppearances[ta.artistId] || {
        totalAppearances: 0,
        chartTypes: new Set(),
        regions: new Set(),
        bestPosition: null,
        latestDate: null,
        totalStreams: BigInt(0),
      }

      return {
        id: ta.id,
        artistId: ta.artistId,
        notes: ta.notes,
        createdAt: ta.createdAt,
        updatedAt: ta.updatedAt,
        artist: ta.artists,
        stats: {
          totalAppearances: stats.totalAppearances,
          chartTypes: Array.from(stats.chartTypes),
          regions: Array.from(stats.regions),
          bestPosition: stats.bestPosition === Infinity ? null : stats.bestPosition,
          latestDate: stats.latestDate,
          totalStreams: stats.totalStreams.toString(),
          currentPositions: stats.currentPositions || {},
        },
        crossChartData: crossChartData[ta.artistId] || {},
      }
    })

    return NextResponse.json({ trackedArtists: formatted })
  } catch (error) {
    console.error('[TrackedArtistsAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracked artists' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { artistId, notes } = body

    if (!artistId) {
      return NextResponse.json(
        { error: 'artistId is required' },
        { status: 400 }
      )
    }

    // Check if artist exists
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single()

    if (artistError || !artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      )
    }

    // Check if already tracked
    const { data: existing } = await supabase
      .from('tracked_artists')
      .select('*')
      .eq('artistId', artistId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Artist is already being tracked' },
        { status: 409 }
      )
    }

    // Create tracked artist entry - generate ID using crypto.randomUUID()
    const trackedArtistId = crypto.randomUUID()
    const { data: trackedArtist, error: createError } = await supabase
      .from('tracked_artists')
      .insert({
        id: trackedArtistId,
        artistId,
        notes: notes || null,
      })
      .select(`
        *,
        artists (*)
      `)
      .single()

    if (createError) {
      console.error('[TrackedArtistsAPI] Error creating tracked artist:', createError)
      return NextResponse.json(
        { error: 'Failed to track artist', details: createError.message },
        { status: 500 }
      )
    }

    // Auto-enrich the artist in background
    autoEnrichArtists([artistId]).catch(() => {
      // Silently handle errors
    })

    return NextResponse.json({ trackedArtist }, { status: 201 })
  } catch (error) {
    console.error('[TrackedArtistsAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to track artist' },
      { status: 500 }
    )
  }
}
