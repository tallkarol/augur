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
      console.warn('Spotify credentials not configured')
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

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
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
      const error = await response.text()
      throw new Error(`Spotify API error: ${response.status} ${error}`)
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
   * Extract Spotify ID from URI
   */
  extractIdFromUri(uri: string): string | null {
    // Format: spotify:track:4iV5W9uYEdYUVa79Axb7Rh
    const match = uri.match(/spotify:(track|artist):([a-zA-Z0-9]+)/)
    return match ? match[2] : null
  }
}

// Export singleton instance
export const spotifyClient = new SpotifyClient()

// Export types for use in other files
export type { SpotifyArtist, SpotifyTrack }
