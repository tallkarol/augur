import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { spotifyClient } from '@/lib/spotify'
import { getBestChartPositions } from '@/lib/serverUtils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim() || ''
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!query || query.length < 2) {
      return NextResponse.json({
        artists: [],
        tracks: [],
      })
    }

    // Search Spotify API for artists
    let spotifyArtists: any[] = []
    try {
      spotifyArtists = await spotifyClient.searchArtists(query, limit)
    } catch (error) {
      console.error('[SearchAPI] Error searching Spotify:', error)
      // Fall back to database search if Spotify fails
    }

    // Search database artists as fallback or supplement
    const { data: dbArtists, error: artistsError } = await supabase
      .from('artists')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (artistsError) {
      console.error('[SearchAPI] Error searching artists:', artistsError)
    }

    // Merge Spotify results with database results
    // Create a map of existing artists by externalId
    const existingArtistsMap = new Map<string, any>()
    ;(dbArtists || []).forEach(artist => {
      if (artist.externalId) {
        existingArtistsMap.set(artist.externalId, artist)
      }
    })

    // Process Spotify artists: create in DB if needed, or merge with existing
    const processedArtists = await Promise.all(
      spotifyArtists.map(async (spotifyArtist) => {
        let artist = existingArtistsMap.get(spotifyArtist.id)
        
        // If artist doesn't exist in DB, create it
        if (!artist) {
          const newArtistId = globalThis.crypto.randomUUID()
          const { data: newArtist, error: insertError } = await supabase
            .from('artists')
            .insert({
              id: newArtistId,
              name: spotifyArtist.name,
              externalId: spotifyArtist.id,
              imageUrl: spotifyArtist.images[0]?.url || null,
              genres: spotifyArtist.genres || [],
              popularity: spotifyArtist.popularity ?? null,
              followers: spotifyArtist.followers?.total?.toString() || null,
            })
            .select()
            .single()
          
          if (!insertError && newArtist) {
            artist = newArtist
          } else {
            console.error('[SearchAPI] Error creating artist:', insertError)
            // Return Spotify data even if DB insert fails
            artist = {
              id: spotifyArtist.id,
              name: spotifyArtist.name,
              externalId: spotifyArtist.id,
              imageUrl: spotifyArtist.images[0]?.url || null,
              genres: spotifyArtist.genres || [],
              popularity: spotifyArtist.popularity ?? null,
              followers: spotifyArtist.followers?.total?.toString() || null,
            }
          }
        }

        return artist
      })
    )

    // Batch fetch chart positions for all artists
    const artistIds = processedArtists.map(a => a.id).filter(Boolean)
    const chartPositions = await getBestChartPositions(artistIds, undefined)

    // Attach chart data to artists
    const processedArtistsWithCharts = processedArtists.map(artist => {
      const chartData = chartPositions.get(artist.id)
      return {
        ...artist,
        bestPosition: chartData?.position || null,
        chartType: chartData?.chartType || null,
        chartPeriod: chartData?.chartPeriod || null,
      }
    })

    // Also include database artists that weren't in Spotify results
    const dbArtistsNotInSpotify = (dbArtists || []).filter(dbArtist => {
      return !spotifyArtists.some(sa => sa.id === dbArtist.externalId)
    })

    // Batch fetch chart positions for DB artists
    const dbArtistIds = dbArtistsNotInSpotify.map(a => a.id).filter(Boolean)
    const dbChartPositions = await getBestChartPositions(dbArtistIds, undefined)

    const dbArtistsWithCharts = dbArtistsNotInSpotify.map(artist => {
      const chartData = dbChartPositions.get(artist.id)
      return {
        ...artist,
        bestPosition: chartData?.position || null,
        chartType: chartData?.chartType || null,
        chartPeriod: chartData?.chartPeriod || null,
      }
    })

    // Search tracks (keep existing logic)
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select(`
        *,
        artists (*)
      `)
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (tracksError) {
      console.error('[SearchAPI] Error searching tracks:', tracksError)
    }

    // Batch fetch chart positions for tracks
    const trackIds = (tracks || []).map(t => t.id).filter(Boolean)
    const trackChartPositions = await getBestChartPositions(undefined, trackIds)

    const tracksWithCharts = (tracks || []).map(track => {
      const chartData = trackChartPositions.get(track.id)
      return {
        ...track,
        bestPosition: chartData?.position || null,
        chartType: chartData?.chartType || null,
        chartPeriod: chartData?.chartPeriod || null,
      }
    })

    return NextResponse.json({
      artists: [...processedArtistsWithCharts, ...dbArtistsWithCharts].slice(0, limit),
      tracks: tracksWithCharts,
    })
  } catch (error) {
    console.error('[SearchAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to perform search',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
