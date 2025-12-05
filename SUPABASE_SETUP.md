# Supabase Setup Guide - Step by Step

## Step 1: Verify Your Supabase Project is Active

1. Go to: https://supabase.com/dashboard/project/yiyigevkkeuqngtpdjcz
2. Check if the project shows "Active" status
3. If paused, click "Restore" to activate it

## Step 2: Create Tables in Supabase

1. Go to: https://supabase.com/dashboard/project/yiyigevkkeuqngtpdjcz/sql/new
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste this SQL:

```sql
-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT DEFAULT 'spotify',
  "externalId" TEXT,
  "imageUrl" TEXT,
  genres TEXT[] DEFAULT '{}',
  popularity INTEGER,
  followers BIGINT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "artistId" TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform TEXT DEFAULT 'spotify',
  "externalId" TEXT,
  uri TEXT,
  "imageUrl" TEXT,
  "previewUrl" TEXT,
  duration INTEGER,
  popularity INTEGER,
  "albumName" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chart_entries table
CREATE TABLE IF NOT EXISTS chart_entries (
  id TEXT PRIMARY KEY,
  "trackId" TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  "artistId" TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  platform TEXT DEFAULT 'spotify',
  "chartType" TEXT DEFAULT 'regional',
  "chartPeriod" TEXT DEFAULT 'daily',
  source TEXT,
  "peakRank" INTEGER,
  "previousRank" INTEGER,
  "daysOnChart" INTEGER,
  streams BIGINT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_artists_name_platform ON artists(name, platform);
CREATE INDEX IF NOT EXISTS idx_artists_platform ON artists(platform);
CREATE INDEX IF NOT EXISTS idx_tracks_name_platform ON tracks(name, platform);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks("artistId");
CREATE INDEX IF NOT EXISTS idx_tracks_platform ON tracks(platform);
CREATE INDEX IF NOT EXISTS idx_chart_entries_date ON chart_entries(date);
CREATE INDEX IF NOT EXISTS idx_chart_entries_platform_date ON chart_entries(platform, date);
CREATE INDEX IF NOT EXISTS idx_chart_entries_position ON chart_entries(position);
CREATE INDEX IF NOT EXISTS idx_chart_entries_track_id_date ON chart_entries("trackId", date);
CREATE INDEX IF NOT EXISTS idx_chart_entries_artist_id_date ON chart_entries("artistId", date);

-- Disable RLS for now (enable later if needed)
ALTER TABLE artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE chart_entries DISABLE ROW LEVEL SECURITY;
```

5. Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)
6. You should see "Success. No rows returned"

## Step 3: Verify Tables Were Created

1. Go to: https://supabase.com/dashboard/project/yiyigevkkeuqngtpdjcz/editor
2. Click "Table Editor" in the left sidebar
3. You should see three tables: `artists`, `tracks`, `chart_entries`

## Step 4: Test Connection

Run the test script:

```bash
cd /Users/karolbuczek/Work/augur
npx tsx test-supabase.ts
```

This will:
- ✅ Test connection to Supabase
- ✅ Verify all three tables exist
- ✅ Check column names match
- ✅ Show specific error messages if something is wrong

**Expected output:**
```
🔍 Testing Supabase connection...

1. Testing artists table...
   ✅ artists table accessible

2. Testing tracks table...
   ✅ tracks table accessible

3. Testing chart_entries table...
   ✅ chart_entries table accessible

4. Testing column names...
   ✅ Column names match expected schema

✅ All tests passed! Supabase is configured correctly.
```

## Step 5: Import Sample Data (Optional)

If you want to test with real data, you can import from your CSV files. The importer page will handle this once the tables exist.

## Troubleshooting

### Issue: "Could not find the table"
- **Solution**: Make sure you ran the SQL script in Step 2
- Check Table Editor to verify tables exist

### Issue: "RLS policy violation"
- **Solution**: The SQL script disables RLS. If you still get errors, run:
```sql
ALTER TABLE artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE chart_entries DISABLE ROW LEVEL SECURITY;
```

### Issue: "Column does not exist"
- **Solution**: Make sure you used the exact column names from the SQL script (with quotes for camelCase)

### Issue: Connection timeout
- **Solution**: Check your Supabase project status - it might be paused
- Verify your `.env` has the correct `SUPABASE_PROJECT_URL` and `SUPABASE_API_KEY`

## Next Steps After Setup

1. Tables are created ✅
2. Test the connection ✅
3. Try loading artists page - enrichment will happen automatically
4. Click on an artist to see the modal with charts
