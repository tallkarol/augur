# Quick Start: Fix Supabase Issues

## What Changed

✅ **Removed Enrich Button** - Enrichment now happens automatically in the background when you load artists/tracks  
✅ **Created Auto-Enrich System** - Top 5 artists/tracks are enriched silently when data loads  
✅ **Created Test Script** - Easy way to verify Supabase is working

## Step-by-Step Fix

### 1. Run the SQL Script in Supabase

1. Open: https://supabase.com/dashboard/project/yiyigevkkeuqngtpdjcz/sql/new
2. Copy the SQL from `SUPABASE_SETUP.md` (Step 2)
3. Paste and click "Run"
4. You should see "Success. No rows returned"

### 2. Test Your Connection

```bash
cd /Users/karolbuczek/Work/augur

# Install dotenv if needed (optional, test script will work without it)
npm install --save-dev dotenv

# Run the test
npx tsx test-supabase.ts
```

**If you see errors:**
- ❌ "Could not find the table" → Go back to Step 1, make sure SQL ran successfully
- ❌ "RLS policy violation" → Run the RLS disable commands in `SUPABASE_SETUP.md`
- ❌ "Column does not exist" → Check that you used the exact SQL from the guide (with quotes around camelCase columns)

### 3. Verify in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/yiyigevkkeuqngtpdjcz/editor
2. Click "Table Editor"
3. You should see: `artists`, `tracks`, `chart_entries`

### 4. Test the App

```bash
npm run dev
```

Then:
1. Go to `/artists` page
2. Check browser console - you should see `[AUTO-ENRICH]` logs
3. Enrichment happens automatically for top 5 artists (no button needed!)

## Common Issues

### "Prisma still has issues"
- **Solution**: We're using Supabase client now, not Prisma for enrichment
- Prisma is only used for reading data in some routes (which fall back to mock data if DB fails)
- The enrichment route (`/api/spotify/enrich`) uses Supabase client only

### "Enrichment not working"
- Check browser console for `[AUTO-ENRICH]` logs
- Check server logs (terminal where `npm run dev` is running)
- Verify Spotify credentials in `.env`:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`

### "Tables don't exist"
- Make sure you ran the SQL script in Supabase SQL Editor
- Check Table Editor to verify tables were created
- Column names must match exactly (camelCase with quotes in SQL)

## What's Next?

Once Supabase is working:
1. ✅ Enrichment happens automatically
2. ✅ Click any artist to see detailed modal with charts
3. ✅ Export data to CSV
4. ✅ View insights and visualizations
