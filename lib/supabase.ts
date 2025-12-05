import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_PROJECT_URL || 'https://yiyigevkkeuqngtpdjcz.supabase.co'
const supabaseKey = process.env.SUPABASE_API_KEY

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_API_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
