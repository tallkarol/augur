-- Migration script for chart_entries table
-- Adds uploadId, lastUpdatedAt, unique constraint, and index

-- Step 1: Add uploadId column (nullable, references csv_uploads)
ALTER TABLE chart_entries
ADD COLUMN IF NOT EXISTS "uploadId" TEXT;

-- Step 2: Add lastUpdatedAt column with default value
ALTER TABLE chart_entries
ADD COLUMN IF NOT EXISTS "lastUpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Update existing rows to set lastUpdatedAt = createdAt
UPDATE chart_entries
SET "lastUpdatedAt" = "createdAt"
WHERE "lastUpdatedAt" IS NULL;

-- Step 4: Create function to automatically update lastUpdatedAt
CREATE OR REPLACE FUNCTION update_chart_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."lastUpdatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-update lastUpdatedAt
DROP TRIGGER IF EXISTS chart_entries_updated_at_trigger ON chart_entries;
CREATE TRIGGER chart_entries_updated_at_trigger
  BEFORE UPDATE ON chart_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_chart_entries_updated_at();

-- Step 6: Add index on uploadId for faster lookups
CREATE INDEX IF NOT EXISTS "chart_entries_uploadId_idx" ON chart_entries("uploadId");

-- Step 7: Add unique constraint
-- Note: PostgreSQL treats NULL as distinct, so multiple NULL values in region are allowed
-- This constraint ensures uniqueness for non-NULL combinations
CREATE UNIQUE INDEX IF NOT EXISTS "chart_entries_trackId_artistId_date_chartType_chartPeriod_region_platform_key"
ON chart_entries("trackId", "artistId", "date", "chartType", "chartPeriod", COALESCE("region", ''), "platform");

-- Optional: Add foreign key constraint if csv_uploads table exists
-- Uncomment if you want referential integrity
-- ALTER TABLE chart_entries
-- ADD CONSTRAINT "chart_entries_uploadId_fkey"
-- FOREIGN KEY ("uploadId") REFERENCES csv_uploads("id") ON DELETE SET NULL;
