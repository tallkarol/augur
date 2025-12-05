import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_PROJECT_URL
const supabaseKey = process.env.SUPABASE_API_KEY

let supabaseInstance: SupabaseClient | null = null

/**
 * Get the Supabase client instance.
 * Creates client lazily to avoid errors during build when env vars aren't set.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_PROJECT_URL environment variable')
  }

  if (!supabaseKey) {
    throw new Error('Missing SUPABASE_API_KEY environment variable')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey)
  return supabaseInstance
}

// Export a lazy-loading proxy for backwards compatibility
// This allows `supabase.from('table')` syntax to work while deferring initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = (client as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
