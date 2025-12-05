/**
 * Spotify API Client
 * Handles OAuth2 authentication and API requests
 */

interface SpotifyToken {
  access_token: string
  token_type: string
  expires_in: number
}

interface SpotifyImage {
  url: string
  height: number | null
  width: number | null
}

interface SpotifyArtist {
  id: string
  name: string
  images: SpotifyImage[]
  genres: string[]
  popularity: number
  followers: {
    total: number
  }
  external_urls: {
    spotify: string
  }
}

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ id: string; name: string }>
  album: {
    name: string
    images: SpotifyImage[]
  }
  preview_url: string | null
  duration_ms: number
  popularity: number
  external_urls: {
    spotify: string
  }
}

interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyTrack[]
  }
  artists?: {
    items: SpotifyArtist[]
  }
}

class SpotifyClient {
  private clientId: string
  private clientSecret: string
  private tokenCache: { token: string; expiresAt: number } | null = null
  private baseUrl = 'https://api.spotify.com/v1'

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || ''
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || ''

    if (!this.clientId || !this.clientSecret) {
      console.warn('[SpotifyClient] Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env')
    } else {
      console.log('[SpotifyClient] Spotify credentials configured')
    }
  }

  /**
   * Get access token using Client Credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token
    }

    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to get Spotify token: ${response.status} ${error}`)
      }

      const data: SpotifyToken = await response.json()
      
      // Cache token with 5 minute buffer before expiry
      this.tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000,
      }

      return data.access_token
    } catch (error) {
      console.error('Error getting Spotify access token:', error)
      throw error
    }
  }

  /**
   * Make authenticated request to Spotify API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken()

    const url = `${this.baseUrl}${endpoint}`
    console.log(`[SpotifyClient] Making request to: ${url}`)

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`)
      }
      
      const errorText = await response.text()
      let errorDetails: any = {}
      try {
        errorDetails = JSON.parse(errorText)
      } catch {
        errorDetails = { raw: errorText }
      }
      
      console.error(`[SpotifyClient] API Error ${response.status}:`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
      })
      
      // Provide more helpful error messages
      if (response.status === 404) {
        throw new Error(`Spotify API error: 404 - Resource not found. The playlist ID may be incorrect or the playlist may not be accessible with your current authentication. Error: ${JSON.stringify(errorDetails)}`)
      }
      
      throw new Error(`Spotify API error: ${response.status} ${JSON.stringify(errorDetails)}`)
    }

    return response.json()
  }

  /**
   * Search for an artist by name
   */
  async searchArtist(name: string): Promise<SpotifyArtist | null> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Spotify credentials not configured')
      }
      const encodedName = encodeURIComponent(name)
      const response: SpotifySearchResponse = await this.request(
        `/search?q=${encodedName}&type=artist&limit=1`
      )

      return response.artists?.items[0] || null
    } catch (error) {
      console.error(`Error searching for artist "${name}":`, error)
      throw error // Re-throw to get better error messages
    }
  }

  /**
   * Search for a track by name and artist
   */
  async searchTrack(trackName: string, artistName: string): Promise<SpotifyTrack | null> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Spotify credentials not configured')
      }
      const query = encodeURIComponent(`track:"${trackName}" artist:"${artistName}"`)
      const response: SpotifySearchResponse = await this.request(
        `/search?q=${query}&type=track&limit=1`
      )

      return response.tracks?.items[0] || null
    } catch (error) {
      console.error(`Error searching for track "${trackName}" by "${artistName}":`, error)
      throw error // Re-throw to get better error messages
    }
  }

  /**
   * Get artist by Spotify ID
   */
  async getArtist(spotifyId: string): Promise<SpotifyArtist | null> {
    try {
      return await this.request<SpotifyArtist>(`/artists/${spotifyId}`)
    } catch (error) {
      console.error(`Error getting artist ${spotifyId}:`, error)
      return null
    }
  }

  /**
   * Get track by Spotify ID
   */
  async getTrack(spotifyId: string): Promise<SpotifyTrack | null> {
    try {
      return await this.request<SpotifyTrack>(`/tracks/${spotifyId}`)
    } catch (error) {
      console.error(`Error getting track ${spotifyId}:`, error)
      return null
    }
  }

  /**
   * Get artist's top tracks from Spotify
   */
  async getArtistTopTracks(spotifyArtistId: string, market: string = 'US'): Promise<SpotifyTrack[]> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Spotify credentials not configured')
      }
      const response = await this.request<{ tracks: SpotifyTrack[] }>(
        `/artists/${spotifyArtistId}/top-tracks?market=${market}`
      )
      return response.tracks || []
    } catch (error) {
      console.error(`Error getting top tracks for artist ${spotifyArtistId}:`, error)
      return []
    }
  }

  /**
   * Search for multiple artists (returns more results)
   */
  async searchArtists(query: string, limit: number = 20): Promise<SpotifyArtist[]> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Spotify credentials not configured')
      }
      const encodedQuery = encodeURIComponent(query)
      const response: SpotifySearchResponse = await this.request(
        `/search?q=${encodedQuery}&type=artist&limit=${limit}`
      )
      return response.artists?.items || []
    } catch (error) {
      console.error(`Error searching for artists "${query}":`, error)
      throw error
    }
  }

  /**
   * Extract Spotify ID from URI
   */
  extractIdFromUri(uri: string): string | null {
    // Format: spotify:track:4iV5W9uYEdYUVa79Axb7Rh
    const match = uri.match(/spotify:(track|artist):([a-zA-Z0-9]+)/)
    return match ? match[2] : null
  }

  /**
   * Search for playlists
   */
  async searchPlaylists(query: string, limit: number = 10): Promise<any[]> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Spotify credentials not configured. Cannot search playlists.')
      }
      const encodedQuery = encodeURIComponent(query)
      console.log(`[SpotifyClient] Searching playlists with query: "${query}"`)
      const response = await this.request<any>(
        `/search?q=${encodedQuery}&type=playlist&limit=${limit}`
      )
      
      const playlists = response.playlists?.items || []
      console.log(`[SpotifyClient] Search returned ${playlists.length} playlists`)
      if (playlists.length > 0 && playlists[0]) {
        console.log(`[SpotifyClient] First result: ${playlists[0].name || 'Unknown'} (ID: ${playlists[0].id || 'N/A'})`)
      }
      
      return playlists.filter((p: any) => p !== null && p !== undefined)
    } catch (error) {
      console.error(`[SpotifyClient] Error searching playlists:`, error)
      throw error
    }
  }

  /**
   * Get playlist by ID
   * 
   * Note: According to Spotify API docs, if neither market or user country are provided,
   * the content is considered unavailable. We use 'US' as default market.
   */
  async getPlaylist(playlistId: string, market: string = 'US'): Promise<any> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Spotify credentials not configured. Cannot fetch playlists.')
      }
      console.log(`[SpotifyClient] Fetching playlist: ${playlistId} (market: ${market})`)
      
      // Add market parameter - required for Client Credentials flow
      // According to Spotify docs: "If neither market or user country are provided, 
      // the content is considered unavailable for the client."
      const playlist = await this.request<any>(`/playlists/${playlistId}?market=${market}`)
      console.log(`[SpotifyClient] Successfully fetched playlist: ${playlist.name}`)
      return playlist
    } catch (error: any) {
      console.error(`[SpotifyClient] Error getting playlist ${playlistId}:`, error)
      
      // If 404, try searching for the playlist as a fallback
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log(`[SpotifyClient] Playlist not found, attempting to search for "Viral 50" playlists...`)
        try {
          const searchResults = await this.searchPlaylists('Viral 50', 5)
          if (searchResults.length > 0) {
            console.log(`[SpotifyClient] Found ${searchResults.length} "Viral 50" playlists. First result: ${searchResults[0].name} (ID: ${searchResults[0].id})`)
            throw new Error(
              `Playlist ID ${playlistId} not found. Found similar playlists: ${searchResults.map(p => `${p.name} (${p.id})`).join(', ')}. ` +
              `Please verify the playlist ID or use one of the found IDs.`
            )
          }
        } catch (searchError) {
          // If search also fails, just throw the original error
        }
      }
      
      throw error
    }
  }

  /**
   * Get playlist tracks (handles pagination)
   * 
   * Note: According to Spotify API docs, if neither market or user country are provided,
   * the content is considered unavailable. We use 'US' as default market.
   */
  async getPlaylistTracks(playlistId: string, limit: number = 50, offset: number = 0, market: string = 'US'): Promise<any> {
    try {
      // Add market parameter - required for Client Credentials flow
      const response = await this.request<{
        items: Array<{
          track: SpotifyTrack | null
          added_at: string
        }>
        total: number
        limit: number
        offset: number
        next: string | null
      }>(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&market=${market}`)

      return response
    } catch (error) {
      console.error(`Error getting playlist tracks ${playlistId}:`, error)
      throw error
    }
  }

  /**
   * Get all tracks from a playlist (handles pagination automatically)
   * 
   * Note: According to Spotify API docs, if neither market or user country are provided,
   * the content is considered unavailable. We use 'US' as default market.
   */
  async getAllPlaylistTracks(playlistId: string, market: string = 'US'): Promise<Array<{
    track: SpotifyTrack | null
    added_at: string
    position: number
  }>> {
    const allTracks: Array<{
      track: SpotifyTrack | null
      added_at: string
      position: number
    }> = []
    
    let offset = 0
    const limit = 50
    let hasMore = true

    while (hasMore) {
      try {
        const response = await this.getPlaylistTracks(playlistId, limit, offset, market)
        
        response.items.forEach((item: any, index: number) => {
          allTracks.push({
            ...item,
            position: offset + index + 1,
          })
        })

        hasMore = response.next !== null
        offset += limit

        // Rate limit protection - small delay between requests
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Error fetching playlist tracks at offset ${offset}:`, error)
        throw error
      }
    }

    return allTracks
  }
}

// Export singleton instance
export const spotifyClient = new SpotifyClient()

// Export types for use in other files
export type { SpotifyArtist, SpotifyTrack }
