/**
 * Spotify Playlists Integration
 * 
 * Fetches Viral 50 charts from official Spotify playlists
 * 
 * NOTE: Some Spotify playlists (including official chart playlists) may not be
 * accessible via the Client Credentials flow and may require user authentication.
 * If you encounter 404 errors, consider using the JSON API endpoint instead
 * (see lib/spotifyCharts.ts) or implementing user authentication.
 */

import { spotifyClient } from './spotify'

export interface PlaylistChartData {
  rank: number
  uri: string
  artistNames: string
  trackName: string
  imageUrl?: string
  addedAt: string
}

export interface ProcessedPlaylistChart {
  rows: PlaylistChartData[]
  chartType: 'viral'
  chartPeriod: 'daily'
  date: string
  region: string
  snapshotId: string
}

/**
 * Map region codes to Viral 50 playlist IDs
 * 
 * Playlist IDs for Viral 50 charts:
 * - Global: 37i9dQZEVXbLiRSasKsNU9 (Viral 50 - Global)
 * 
 * Note: Playlist IDs can be configured in the settings table.
 * To find a playlist ID:
 * 1. Open the playlist in Spotify
 * 2. Click "Share" > "Copy link to playlist"
 * 3. The ID is the last part of the URL: spotify.com/playlist/{PLAYLIST_ID}
 */
const DEFAULT_VIRAL_50_PLAYLIST_IDS: Record<string, string> = {
  global: '37i9dQZEVXbLiRSasKsNU9', // Viral 50 - Global
  // Add more as discovered:
  // us: 'PLAYLIST_ID_HERE', // Viral 50 - United States
  // gb: 'PLAYLIST_ID_HERE', // Viral 50 - United Kingdom
}

/**
 * Get Viral 50 playlist ID for a region
 * First checks settings table, then falls back to defaults
 */
export async function getViral50PlaylistId(region: string): Promise<string | null> {
  const { supabase } = await import('./supabase')
  
  // Try to get from settings first
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `viral50_playlist_${region.toLowerCase()}`)
      .eq('category', 'playlist')
      .limit(1)
      .single()

    if (data) {
      try {
        const playlistId = JSON.parse(data.value)
        if (playlistId && typeof playlistId === 'string') {
          console.log(`[SpotifyPlaylists] Using configured playlist ID for ${region}: ${playlistId}`)
          return playlistId
        }
      } catch {
        // If not JSON, treat as plain string
        if (data.value) {
          console.log(`[SpotifyPlaylists] Using configured playlist ID for ${region}: ${data.value}`)
          return data.value
        }
      }
    }
  } catch (error) {
    // Settings not found or error, fall back to defaults
    console.log(`[SpotifyPlaylists] No configured playlist ID for ${region}, using defaults`)
  }

  // Fall back to default playlist IDs
  const playlistId = DEFAULT_VIRAL_50_PLAYLIST_IDS[region.toLowerCase()]
  if (!playlistId) {
    console.warn(`[SpotifyPlaylists] No playlist ID found for region: ${region}`)
    return null
  }
  return playlistId
}

/**
 * Fetch Viral 50 chart from Spotify playlist
 */
export async function fetchViral50Chart(
  region: string,
  date: string
): Promise<ProcessedPlaylistChart> {
  let playlistId = await getViral50PlaylistId(region)
  
  if (!playlistId) {
    throw new Error(`No playlist ID found for region: ${region}. Please configure it in admin settings or add it to DEFAULT_VIRAL_50_PLAYLIST_IDS.`)
  }

  console.log(`[SpotifyPlaylists] Fetching Viral 50 chart for region: ${region}, date: ${date}, playlistId: ${playlistId}`)

  try {
    // Get playlist metadata
    console.log(`[SpotifyPlaylists] Fetching playlist metadata...`)
    let playlist
    try {
      // Use 'US' market - required for Client Credentials flow
      // According to Spotify docs: "If neither market or user country are provided,
      // the content is considered unavailable for the client."
      playlist = await spotifyClient.getPlaylist(playlistId, 'US')
    } catch (error: any) {
      // If playlist not found, try searching for it
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log(`[SpotifyPlaylists] Playlist ${playlistId} not found, searching for "Viral 50 ${region}"...`)
        try {
          const searchQuery = region === 'global' ? 'Viral 50 Global' : `Viral 50 ${region.toUpperCase()}`
          const searchResults = await spotifyClient.searchPlaylists(searchQuery, 5)
          
          console.log(`[SpotifyPlaylists] Search returned ${searchResults?.length || 0} results`)
          
          if (searchResults && searchResults.length > 0) {
            // Find the best match
            const match = searchResults.find(p => 
              p && p.name && 
              p.name.toLowerCase().includes('viral 50') && 
              (region === 'global' ? p.name.toLowerCase().includes('global') : true)
            ) || searchResults.find(p => p && p.name) || searchResults[0]
            
            if (match && match.id) {
              console.log(`[SpotifyPlaylists] Found playlist via search: ${match.name} (ID: ${match.id})`)
              playlistId = match.id
              playlist = await spotifyClient.getPlaylist(playlistId, 'US')
            } else {
              throw new Error(`Search found playlists but none matched "Viral 50" for region ${region}. Please verify the playlist ID in settings.`)
            }
          } else {
            throw new Error(`Could not find "Viral 50" playlist for region ${region} via search. The playlist ID ${playlistId} may be incorrect or the playlist may require user authentication. Please verify the playlist ID in settings.`)
          }
        } catch (searchError: any) {
          console.error(`[SpotifyPlaylists] Search also failed:`, searchError)
          throw new Error(
            `Playlist ${playlistId} not found and search failed. ` +
            `This may be because: 1) The playlist ID is incorrect, 2) The playlist requires user authentication, or 3) The playlist is not accessible via Client Credentials flow. ` +
            `Please verify the playlist ID in settings. Original error: ${error.message}`
          )
        }
      } else {
        throw error
      }
    }
    
    const snapshotId = playlist.snapshot_id
    console.log(`[SpotifyPlaylists] Playlist name: ${playlist.name}, snapshot: ${snapshotId}`)

    // Get all tracks from playlist
    console.log(`[SpotifyPlaylists] Fetching playlist tracks...`)
    // Use 'US' market - required for Client Credentials flow
    const tracks = await spotifyClient.getAllPlaylistTracks(playlistId, 'US')
    console.log(`[SpotifyPlaylists] Fetched ${tracks.length} tracks`)

    // Process tracks into chart data format
    const rows: PlaylistChartData[] = tracks
      .filter((item) => item.track !== null) // Filter out null tracks
      .map((item, index) => {
        const track = item.track!
        const artistNames = track.artists.map((a) => a.name).join(', ')

        return {
          rank: index + 1,
          uri: track.external_urls.spotify || `spotify:track:${track.id}`,
          artistNames,
          trackName: track.name,
          imageUrl: track.album.images[0]?.url,
          addedAt: item.added_at,
        }
      })

    console.log(`[SpotifyPlaylists] Fetched ${rows.length} tracks from playlist`)

    return {
      rows,
      chartType: 'viral',
      chartPeriod: 'daily',
      date,
      region,
      snapshotId,
    }
  } catch (error) {
    console.error(`[SpotifyPlaylists] Error fetching chart:`, error)
    throw error
  }
}

/**
 * Process playlist chart data for database insertion
 * This converts playlist data to the format expected by chartProcessor
 */
export function processPlaylistChart(
  chartData: ProcessedPlaylistChart
): Array<{
  rank: number
  uri: string
  artistNames: string
  trackName: string
  source?: string
  peakRank?: number
  previousRank?: number
  daysOnChart?: number
  streams?: string
}> {
  return chartData.rows.map((row) => ({
    rank: row.rank,
    uri: row.uri,
    artistNames: row.artistNames,
    trackName: row.trackName,
    // Playlist data doesn't include these fields, so they're undefined
    source: undefined,
    peakRank: undefined,
    previousRank: undefined,
    daysOnChart: undefined,
    streams: undefined,
  }))
}
