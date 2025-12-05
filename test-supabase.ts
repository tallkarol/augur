/**
 * Test Supabase connection and table structure
 * Run: npx tsx test-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load env vars - try multiple methods
let dotenvLoaded = false
try {
  const dotenv = require('dotenv')
  const result = dotenv.config({ path: path.join(process.cwd(), '.env') })
  if (result.error) {
    console.warn('⚠️  dotenv.config() failed:', result.error.message)
  } else {
    dotenvLoaded = true
    console.log('✅ Loaded .env file via dotenv')
  }
} catch (e) {
  // dotenv not available, will try manual parsing
}

// Always try reading .env file directly as fallback
try {
  const envPath = path.join(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim()
          // Remove surrounding quotes if present
          value = value.replace(/^["']|["']$/g, '')
          process.env[key] = value
        }
      }
    })
    if (!dotenvLoaded) {
      console.log('✅ Loaded .env file manually')
    }
  } else {
    console.warn('⚠️  .env file not found at:', envPath)
  }
} catch (e) {
  console.warn('⚠️  Could not read .env file:', e)
}

// Debug: Show what Supabase-related env vars we found
console.log('\n🔍 Checking environment variables...')
const envVars = {
  'SUPABASE_PROJECT_URL': process.env.SUPABASE_PROJECT_URL,
  'SUPABASE_API_KEY': process.env.SUPABASE_API_KEY,
  'SUPABASE_KEY': process.env.SUPABASE_KEY,
  'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
}

console.log('Found Supabase env vars:')
Object.entries(envVars).forEach(([key, value]) => {
  if (value) {
    console.log(`  ✅ ${key} = ${value.substring(0, 20)}...`)
  } else {
    console.log(`  ❌ ${key} = (not set)`)
  }
})

const supabaseUrl = process.env.SUPABASE_PROJECT_URL || 'https://yiyigevkkeuqngtpdjcz.supabase.co'

// Try multiple possible key names
const supabaseKey = 
  process.env.SUPABASE_API_KEY || 
  process.env.SUPABASE_KEY || 
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!supabaseKey) {
  console.error('\n❌ Missing Supabase API key!')
  console.error('   Looking for one of: SUPABASE_API_KEY, SUPABASE_KEY, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY')
  console.error('\n💡 To find your key:')
  console.error('   1. Go to: https://supabase.com/dashboard/project/yiyigevkkeuqngtpdjcz/settings/api')
  console.error('   2. Copy the "anon public" key or "service_role" key')
  console.error('   3. Add to .env as: SUPABASE_API_KEY=your_key_here')
  process.exit(1)
}

console.log(`\n✅ Using Supabase URL: ${supabaseUrl}`)
console.log(`✅ Using API key: ${supabaseKey.substring(0, 20)}...\n`)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n')

  // Test 1: Check if artists table exists
  console.log('1. Testing artists table...')
  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select('id')
    .limit(1)

  if (artistsError) {
    console.error('   ❌ Error:', artistsError.message)
    console.error('   Code:', artistsError.code)
    console.error('   Details:', artistsError.details)
    console.error('\n   💡 Solution: Run the SQL script in SUPABASE_SETUP.md')
    return false
  }
  console.log('   ✅ artists table accessible')

  // Test 2: Check if tracks table exists
  console.log('\n2. Testing tracks table...')
  const { data: tracks, error: tracksError } = await supabase
    .from('tracks')
    .select('id')
    .limit(1)

  if (tracksError) {
    console.error('   ❌ Error:', tracksError.message)
    console.error('   Code:', tracksError.code)
    return false
  }
  console.log('   ✅ tracks table accessible')

  // Test 3: Check if chart_entries table exists
  console.log('\n3. Testing chart_entries table...')
  const { data: entries, error: entriesError } = await supabase
    .from('chart_entries')
    .select('id')
    .limit(1)

  if (entriesError) {
    console.error('   ❌ Error:', entriesError.message)
    console.error('   Code:', entriesError.code)
    return false
  }
  console.log('   ✅ chart_entries table accessible')

  // Test 4: Check column names
  console.log('\n4. Testing column names...')
  const { data: sampleArtist, error: sampleError } = await supabase
    .from('artists')
    .select('id, name, "externalId", "imageUrl", genres, popularity, followers')
    .limit(1)

  if (sampleError) {
    console.error('   ❌ Column error:', sampleError.message)
    console.error('   💡 This might indicate column name mismatch')
    return false
  }
  console.log('   ✅ Column names match expected schema')

  console.log('\n✅ All tests passed! Supabase is configured correctly.')
  return true
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error)
    process.exit(1)
  })
