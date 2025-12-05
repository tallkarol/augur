import { spotifyClient } from './spotify'
import { supabase } from './supabase'

/**
 * Enrich artist data with Spotify API metadata
 * This enriches on-the-fly and optionally saves to Supabase
 */
export async function enrichArtistData(artist: any, saveToDb: boolean = false): Promise<any> {
  // If already enriched, return as-is
  if (artist.imageUrl && artist.externalId) {
    return artist
  }

  // Check if Spotify credentials are available
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.log('[ENRICH] Spotify credentials not configured, skipping enrichment')
    return artist
  }

  try {
    let spotifyArtist = null

    // Try to get by externalId if we have it
    if (artist.externalId) {
      spotifyArtist = await spotifyClient.getArtist(artist.externalId).catch(() => null)
    }

    // Otherwise, search by name
    if (!spotifyArtist && artist.name) {
      spotifyArtist = await spotifyClient.searchArtist(artist.name).catch(() => null)
    }

    if (!spotifyArtist) {
      console.log(`[ENRICH] Artist "${artist.name}" not found on Spotify`)
      return artist
    }

    // Merge Spotify data with existing artist data
    const enrichedArtist = {
      ...artist,
      externalId: spotifyArtist.id,
      imageUrl: spotifyArtist.images[0]?.url || artist.imageUrl || null,
      genres: spotifyArtist.genres || artist.genres || [],
      popularity: spotifyArtist.popularity ?? artist.popularity ?? null,
      followers: spotifyArtist.followers?.total?.toString() || artist.followers || null,
    }

    // Optionally save to Supabase
    if (saveToDb && artist.id) {
      try {
        await supabase
          .from('artists')
          .update({
            externalId: enrichedArtist.externalId,
            imageUrl: enrichedArtist.imageUrl,
            genres: enrichedArtist.genres,
            popularity: enrichedArtist.popularity,
            followers: enrichedArtist.followers,
          })
          .eq('id', artist.id)
        console.log(`[ENRICH] ✅ Saved enriched data for artist: ${artist.name}`)
      } catch (error) {
        console.warn(`[ENRICH] Failed to save to Supabase:`, error)
        // Continue anyway - we still have the enriched data
      }
    }

    return enrichedArtist
  } catch (error) {
    console.warn(`[ENRICH] Failed to enrich artist "${artist.name}":`, error)
    return artist // Return original if enrichment fails
  }
}

/**
 * Enrich track data with Spotify API metadata
 */
export async function enrichTrackData(track: any, artistName?: string, saveToDb: boolean = false): Promise<any> {
  console.log('[ENRICH] enrichTrackData called', {
    trackId: track.id,
    trackName: track.name,
    artistName,
    hasImageUrl: !!track.imageUrl,
    hasExternalId: !!track.externalId,
    hasPreviewUrl: !!track.previewUrl,
    currentPreviewUrl: track.previewUrl
  })

  // If already enriched with previewUrl, return as-is
  if (track.imageUrl && track.externalId && track.previewUrl) {
    console.log('[ENRICH] Track already enriched, skipping', { trackId: track.id })
    return track
  }

  // Check if Spotify credentials are available
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.log('[ENRICH] Spotify credentials not available, skipping enrichment')
    return track
  }

  try {
    let spotifyTrack = null

    // Try to get by externalId if we have it
    if (track.externalId) {
      console.log('[ENRICH] Trying to get track by externalId', { externalId: track.externalId })
      spotifyTrack = await spotifyClient.getTrack(track.externalId).catch((err) => {
        console.log('[ENRICH] Failed to get track by externalId', { error: err })
        return null
      })
    }

    // Try to extract from URI
    if (!spotifyTrack && track.uri) {
      const match = track.uri.match(/spotify:track:([a-zA-Z0-9]+)/)
      if (match) {
        console.log('[ENRICH] Trying to get track from URI', { spotifyId: match[1] })
        spotifyTrack = await spotifyClient.getTrack(match[1]).catch((err) => {
          console.log('[ENRICH] Failed to get track from URI', { error: err })
          return null
        })
      }
    }

    // Search by name and artist
    if (!spotifyTrack && track.name && artistName) {
      console.log('[ENRICH] Searching for track', { trackName: track.name, artistName })
      spotifyTrack = await spotifyClient.searchTrack(track.name, artistName).catch((err) => {
        console.log('[ENRICH] Failed to search track', { error: err })
        return null
      })
    }

    if (!spotifyTrack) {
      console.log('[ENRICH] Spotify track not found', { trackName: track.name })
      return track
    }

    console.log('[ENRICH] Found Spotify track', {
      spotifyId: spotifyTrack.id,
      hasPreviewUrl: !!spotifyTrack.preview_url,
      previewUrl: spotifyTrack.preview_url
    })

    // Merge Spotify data
    const enrichedTrack = {
      ...track,
      externalId: spotifyTrack.id,
      imageUrl: spotifyTrack.album.images[0]?.url || track.imageUrl || null,
      previewUrl: spotifyTrack.preview_url || track.previewUrl || null,
      duration: spotifyTrack.duration_ms || track.duration || null,
      popularity: spotifyTrack.popularity ?? track.popularity ?? null,
      albumName: spotifyTrack.album.name || track.albumName || null,
    }

    // Optionally save to Supabase
    if (saveToDb && track.id) {
      try {
        await supabase
          .from('tracks')
          .update({
            externalId: enrichedTrack.externalId,
            imageUrl: enrichedTrack.imageUrl,
            previewUrl: enrichedTrack.previewUrl,
            duration: enrichedTrack.duration,
            popularity: enrichedTrack.popularity,
            albumName: enrichedTrack.albumName,
          })
          .eq('id', track.id)
      } catch (error) {
        console.warn(`[ENRICH] Failed to save track to Supabase:`, error)
      }
    }

    return enrichedTrack
  } catch (error) {
    console.warn(`[ENRICH] Failed to enrich track "${track.name}":`, error)
    return track
  }
}
