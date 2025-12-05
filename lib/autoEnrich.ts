import { spotifyClient } from './spotify'
import { supabase } from './supabase'

/**
 * Auto-enrich an artist if missing metadata (non-blocking, runs in background)
 */
export async function autoEnrichArtist(artistId: string): Promise<void> {
  try {
    // Fetch artist
    const { data: artists, error: fetchError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .limit(1)

    if (fetchError || !artists || artists.length === 0) {
      console.log(`[AUTO-ENRICH] Artist ${artistId} not found, skipping`)
      return
    }

    const artist = artists[0]

    // Skip if already enriched
    if (artist.imageUrl && artist.externalId) {
      return
    }

    // Search Spotify (non-blocking)
    const spotifyArtist = artist.externalId
      ? await spotifyClient.getArtist(artist.externalId).catch(() => null)
      : await spotifyClient.searchArtist(artist.name).catch(() => null)

    if (!spotifyArtist) {
      console.log(`[AUTO-ENRICH] Artist "${artist.name}" not found on Spotify`)
      return
    }

    // Update silently in background
    const updateData: any = {
      externalId: spotifyArtist.id,
      imageUrl: spotifyArtist.images[0]?.url || null,
      genres: spotifyArtist.genres || [],
      popularity: spotifyArtist.popularity || null,
    }

    if (spotifyArtist.followers?.total) {
      updateData.followers = spotifyArtist.followers.total.toString()
    }

    await supabase
      .from('artists')
      .update(updateData)
      .eq('id', artistId)

    console.log(`[AUTO-ENRICH] ✅ Enriched artist: ${artist.name}`)
  } catch (error) {
    // Silently fail - don't block the request
    console.warn(`[AUTO-ENRICH] Failed for artist ${artistId}:`, error)
  }
}

/**
 * Auto-enrich multiple artists in background (non-blocking)
 */
export async function autoEnrichArtists(artistIds: string[]): Promise<void> {
  // Enrich in parallel, but don't wait for all to complete
  Promise.all(artistIds.slice(0, 5).map(id => autoEnrichArtist(id))).catch(() => {
    // Silently handle errors
  })
}

/**
 * Auto-enrich a track if missing metadata (non-blocking)
 */
export async function autoEnrichTrack(trackId: string): Promise<void> {
  try {
    // Fetch track
    const { data: tracks, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .limit(1)

    if (trackError || !tracks || tracks.length === 0) return

    const track = tracks[0]

    // Skip if already enriched
    if (track.imageUrl && track.externalId) return

    // Fetch artist
    const { data: artists } = await supabase
      .from('artists')
      .select('*')
      .eq('id', track.artistId)
      .limit(1)

    if (!artists || artists.length === 0) return

    const artist = artists[0]

    // Search Spotify
    let spotifyTrack = null
    if (track.uri) {
      const match = track.uri.match(/spotify:(track|artist):([a-zA-Z0-9]+)/)
      const spotifyId = match ? match[2] : null
      if (spotifyId) {
        spotifyTrack = await spotifyClient.getTrack(spotifyId).catch(() => null)
      }
    }

    if (!spotifyTrack && track.externalId) {
      spotifyTrack = await spotifyClient.getTrack(track.externalId).catch(() => null)
    }

    if (!spotifyTrack) {
      spotifyTrack = await spotifyClient.searchTrack(track.name, artist.name).catch(() => null)
    }

    if (!spotifyTrack) return

    // Update silently
    await supabase
      .from('tracks')
      .update({
        externalId: spotifyTrack.id,
        imageUrl: spotifyTrack.album.images[0]?.url || null,
        previewUrl: spotifyTrack.preview_url || null,
        duration: spotifyTrack.duration_ms || null,
        popularity: spotifyTrack.popularity || null,
        albumName: spotifyTrack.album.name || null,
      })
      .eq('id', trackId)

    console.log(`[AUTO-ENRICH] ✅ Enriched track: ${track.name}`)
  } catch (error) {
    // Silently fail
    console.warn(`[AUTO-ENRICH] Failed for track ${trackId}:`, error)
  }
}
