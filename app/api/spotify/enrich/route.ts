import { NextRequest, NextResponse } from 'next/server'
import { spotifyClient } from '@/lib/spotify'
import { supabase } from '@/lib/supabase'

/**
 * Enrich artists and tracks with Spotify metadata
 * POST /api/spotify/enrich
 * Body: { type: 'artist' | 'track', ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    // Check Spotify credentials
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Spotify credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env' },
        { status: 500 }
      )
    }

    // Check Supabase connection
    const { error: testError } = await supabase.from('artists').select('id').limit(1)
    if (testError) {
      console.error('Supabase connection test failed:', testError)
      return NextResponse.json(
        { error: `Supabase connection failed: ${testError.message}. Make sure tables exist and RLS policies allow access.` },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { type, ids } = body

    if (!type || !ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { type: "artist" | "track", ids: string[] }' },
        { status: 400 }
      )
    }

    if (type === 'artist') {
      const results = await enrichArtists(ids)
      return NextResponse.json({ success: true, results })
    } else if (type === 'track') {
      const results = await enrichTracks(ids)
      return NextResponse.json({ success: true, results })
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "artist" or "track"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error enriching data:', error)
    return NextResponse.json(
      { error: 'Failed to enrich data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function enrichArtists(artistIds: string[]) {
  const results = []

  for (const artistId of artistIds) {
    try {
      // Fetch artist from Supabase
      const { data: artist, error: fetchError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single()

      if (fetchError || !artist) {
        results.push({ id: artistId, success: false, error: `Artist not found: ${fetchError?.message || 'Unknown error'}` })
        continue
      }

      // Skip if already enriched (has imageUrl or externalId)
      if (artist.imageUrl && artist.externalId) {
        results.push({ id: artistId, success: true, skipped: true, message: 'Already enriched' })
        continue
      }

      // Try to find Spotify artist
      let spotifyArtist = null
      let spotifyError: Error | null = null

      // If we have externalId, use it directly
      if (artist.externalId) {
        try {
          spotifyArtist = await spotifyClient.getArtist(artist.externalId)
        } catch (error) {
          spotifyError = error instanceof Error ? error : new Error(String(error))
          console.warn(`Failed to get artist by ID ${artist.externalId}:`, error)
        }
      }

      // Otherwise, search by name
      if (!spotifyArtist) {
        try {
          spotifyArtist = await spotifyClient.searchArtist(artist.name)
        } catch (error) {
          spotifyError = error instanceof Error ? error : new Error(String(error))
          console.error(`Failed to search for artist "${artist.name}":`, error)
        }
      }

      if (!spotifyArtist) {
        const errorMsg = spotifyError 
          ? `Spotify API error: ${spotifyError.message}` 
          : 'Artist not found on Spotify'
        results.push({ id: artistId, success: false, error: errorMsg })
        continue
      }

      // Update artist with Spotify data
      const updateData: any = {
        externalId: spotifyArtist.id,
        imageUrl: spotifyArtist.images[0]?.url || null,
        genres: spotifyArtist.genres || [],
        popularity: spotifyArtist.popularity || null,
      }

      // Only add followers if the column exists (handle BigInt)
      if (spotifyArtist.followers?.total) {
        updateData.followers = spotifyArtist.followers.total.toString()
      }

      const { data: updated, error: updateError } = await supabase
        .from('artists')
        .update(updateData)
        .eq('id', artistId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update artist: ${updateError.message} (code: ${updateError.code})`)
      }

      results.push({
        id: artistId,
        success: true,
        data: {
          name: updated.name,
          imageUrl: updated.imageUrl,
          genres: updated.genres,
          popularity: updated.popularity,
          followers: updated.followers?.toString(),
        },
      })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Error enriching artist ${artistId}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorDetails = error instanceof Error && 'code' in error ? ` (code: ${(error as any).code})` : ''
      results.push({
        id: artistId,
        success: false,
        error: `${errorMessage}${errorDetails}`,
        details: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  return results
}

async function enrichTracks(trackIds: string[]) {
  const results = []

  for (const trackId of trackIds) {
    try {
      // Fetch track from Supabase
      const { data: track, error: fetchError } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single()

      if (fetchError || !track) {
        results.push({ id: trackId, success: false, error: `Track not found: ${fetchError?.message || 'Unknown error'}` })
        continue
      }

      // Skip if already enriched
      if (track.imageUrl && track.externalId) {
        results.push({ id: trackId, success: true, skipped: true, message: 'Already enriched' })
        continue
      }

      // Fetch artist separately
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', track.artistId)
        .single()

      if (artistError || !artist) {
        results.push({ id: trackId, success: false, error: `Artist not found for track: ${artistError?.message || 'Unknown error'}` })
        continue
      }

      // Try to find Spotify track
      let spotifyTrack = null
      let spotifyError: Error | null = null

      // If we have URI, extract ID and use it
      if (track.uri) {
        const match = track.uri.match(/spotify:(track|artist):([a-zA-Z0-9]+)/)
        const spotifyId = match ? match[2] : null
        if (spotifyId) {
          try {
            spotifyTrack = await spotifyClient.getTrack(spotifyId)
          } catch (error) {
            spotifyError = error instanceof Error ? error : new Error(String(error))
            console.warn(`Failed to get track by ID ${spotifyId}:`, error)
          }
        }
      }

      // If we have externalId, use it directly
      if (!spotifyTrack && track.externalId) {
        try {
          spotifyTrack = await spotifyClient.getTrack(track.externalId)
        } catch (error) {
          spotifyError = error instanceof Error ? error : new Error(String(error))
          console.warn(`Failed to get track by externalId ${track.externalId}:`, error)
        }
      }

      // Otherwise, search by name and artist
      if (!spotifyTrack) {
        try {
          spotifyTrack = await spotifyClient.searchTrack(track.name, artist.name)
        } catch (error) {
          spotifyError = error instanceof Error ? error : new Error(String(error))
          console.error(`Failed to search for track "${track.name}" by "${artist.name}":`, error)
        }
      }

      if (!spotifyTrack) {
        const errorMsg = spotifyError 
          ? `Spotify API error: ${spotifyError.message}` 
          : 'Track not found on Spotify'
        results.push({ id: trackId, success: false, error: errorMsg })
        continue
      }

      // Update track with Spotify data
      const updateData: any = {
        externalId: spotifyTrack.id,
        imageUrl: spotifyTrack.album.images[0]?.url || null,
        previewUrl: spotifyTrack.preview_url || null,
        duration: spotifyTrack.duration_ms || null,
        popularity: spotifyTrack.popularity || null,
        albumName: spotifyTrack.album.name || null,
      }

      const { data: updated, error: updateError } = await supabase
        .from('tracks')
        .update(updateData)
        .eq('id', trackId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update track: ${updateError.message} (code: ${updateError.code})`)
      }

      results.push({
        id: trackId,
        success: true,
        data: {
          name: updated.name,
          imageUrl: updated.imageUrl,
          previewUrl: updated.previewUrl,
          duration: updated.duration,
          popularity: updated.popularity,
          albumName: updated.albumName,
        },
      })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Error enriching track ${trackId}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorDetails = error instanceof Error && 'code' in error ? ` (code: ${(error as any).code})` : ''
      results.push({
        id: trackId,
        success: false,
        error: `${errorMessage}${errorDetails}`,
        details: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  return results
}
