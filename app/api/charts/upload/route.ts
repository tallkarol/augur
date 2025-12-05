import { NextRequest, NextResponse } from 'next/server'
import { parseChartCSV } from '@/lib/csvParser'
import { processChartData } from '@/lib/chartProcessor'
import { checkDuplicates, getDefaultDeduplicationAction } from '@/lib/deduplication'
import { supabase } from '@/lib/supabase'
import { parseISO } from 'date-fns'
import { normalizeRegion, getRegionType } from '@/lib/utils'

// Increase timeout for large file uploads (max 300 seconds for Vercel Pro)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const deduplicationAction = formData.get('deduplicationAction') as string || 'show-warning'

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const results = []

    for (const file of files) {
      let uploadId: string | undefined = undefined
      
      try {
        // Validate file type
        if (!file.name.endsWith('.csv')) {
          results.push({
            fileName: file.name,
            success: false,
            error: 'File must be a CSV file',
          })
          continue
        }

        // Read file content
        const fileText = await file.text()

        // Parse CSV filename to extract chart info
        // Format: {chartType}-{region}-{period}-{date}.csv
        // Example: regional-global-daily-2025-12-03.csv
        const filenameMatch = file.name.match(/^([^-]+)-([^-]+)-([^-]+)-(\d{4}-\d{2}-\d{2})\.csv$/)
        
        if (!filenameMatch) {
          results.push({
            fileName: file.name,
            success: false,
            error: 'Invalid filename format. Expected: {chartType}-{region}-{period}-{date}.csv',
          })
          continue
        }

        const [, chartType, region, chartPeriod, date] = filenameMatch

        // Validate chart type and period
        if (!['regional', 'viral'].includes(chartType)) {
          results.push({
            fileName: file.name,
            success: false,
            error: `Invalid chart type: ${chartType}. Must be 'regional' or 'viral'`,
          })
          continue
        }

        if (!['daily', 'weekly'].includes(chartPeriod)) {
          results.push({
            fileName: file.name,
            success: false,
            error: `Invalid chart period: ${chartPeriod}. Must be 'daily' or 'weekly'`,
          })
          continue
        }

        // Normalize region
        const normalizedRegion = normalizeRegion(region)
        const regionType = getRegionType(region)

        // Check for duplicates
        const duplicateCheck = await checkDuplicates(date, chartType, chartPeriod, normalizedRegion)

        // Get sample of existing entries to show what will be overwritten
        let existingEntriesSample: any[] = []
        if (duplicateCheck.exists) {
          const chartDate = parseISO(date)
          let sampleQuery = supabase
            .from('chart_entries')
            .select('id, position, tracks(name), artists(name)')
            .eq('date', chartDate.toISOString())
            .eq('chartType', chartType)
            .eq('chartPeriod', chartPeriod)
            .eq('platform', 'spotify')
            .limit(10)
            .order('position', { ascending: true })

          if (normalizedRegion === null || normalizedRegion === undefined) {
            sampleQuery = sampleQuery.is('region', null)
          } else {
            sampleQuery = sampleQuery.eq('region', normalizedRegion)
          }

          const { data: sample } = await sampleQuery
          existingEntriesSample = sample || []
        }

        // Determine action
        let action = deduplicationAction
        if (action === 'show-warning' && duplicateCheck.exists) {
          // Return duplicate info for user to decide
          results.push({
            fileName: file.name,
            success: false,
            duplicate: true,
            duplicateInfo: {
              date,
              chartType,
              chartPeriod,
              region: normalizedRegion,
              existingEntryCount: duplicateCheck.existingEntryCount,
              sampleEntries: existingEntriesSample.map(e => ({
                position: e.position,
                trackName: e.tracks?.name || 'Unknown',
                artistName: e.artists?.name || 'Unknown',
              })),
            },
            error: `Duplicate entries found. ${duplicateCheck.existingEntryCount} existing entries for this date/chart combination will be overwritten if you proceed.`,
          })
          continue
        }

        // Handle duplicates if needed
        if (duplicateCheck.exists && action !== 'skip') {
          // This will be handled by the deduplication system
          // For now, proceed with processing
        }

        // Create CsvUpload record
        uploadId = crypto.randomUUID()
        const chartDate = parseISO(date)
        
        const { error: uploadCreateError } = await supabase
          .from('csv_uploads')
          .insert({
            id: uploadId,
            fileName: file.name,
            chartType,
            chartPeriod,
            date: chartDate.toISOString(),
            region: normalizedRegion,
            regionType,
            status: 'processing',
            recordsProcessed: 0,
          })

        if (uploadCreateError) {
          console.error(`[CSVUpload] Failed to create upload record:`, uploadCreateError)
        }

        // Parse CSV
        console.log(`[CSVUpload] Parsing CSV for ${file.name}`)
        const parsedData = parseChartCSV(fileText, chartType as 'regional' | 'viral', chartPeriod as 'daily' | 'weekly', date)
        console.log(`[CSVUpload] Parsed ${parsedData.rows.length} rows from ${file.name}`)

        // Process and store
        console.log(`[CSVUpload] Starting to process chart data for ${file.name}`)
        const processResult = await processChartData(
          parsedData,
          normalizedRegion || undefined,
          regionType || undefined,
          uploadId
        )
        console.log(`[CSVUpload] Completed processing for ${file.name}:`, {
          artists: processResult.artistsCreated + processResult.artistsUpdated,
          tracks: processResult.tracksCreated + processResult.tracksUpdated,
          entries: processResult.entriesCreated + processResult.entriesUpdated,
        })

        // Determine final status
        const hasErrors = processResult.errors.length > 0
        const hasSuccess = processResult.entriesCreated > 0 || processResult.entriesUpdated > 0
        const finalStatus = hasErrors && hasSuccess ? 'partial' : (hasErrors ? 'failed' : 'success')
        const errorMessage = hasErrors ? processResult.errors.join('; ') : null

        // Invalidate cache if we successfully created/updated entries
        if (hasSuccess) {
          const { invalidateAvailableDatesCache } = await import('@/lib/serverUtils')
          invalidateAvailableDatesCache()
        }

        // Update CsvUpload record with results
        const { error: uploadUpdateError } = await supabase
          .from('csv_uploads')
          .update({
            status: finalStatus,
            recordsProcessed: parsedData.rows.length,
            recordsCreated: processResult.entriesCreated + processResult.artistsCreated + processResult.tracksCreated,
            recordsUpdated: processResult.entriesUpdated + processResult.artistsUpdated + processResult.tracksUpdated,
            recordsSkipped: 0, // TODO: track skipped records
            error: errorMessage,
            completedAt: new Date().toISOString(),
          })
          .eq('id', uploadId)

        if (uploadUpdateError) {
          console.error(`[CSVUpload] Failed to update upload record:`, uploadUpdateError)
        }

        results.push({
          fileName: file.name,
          success: finalStatus === 'success' || finalStatus === 'partial',
          uploadId,
          recordsProcessed: parsedData.rows.length,
          result: processResult,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        // Try to update upload record if it was created
        if (uploadId) {
          try {
            await supabase
              .from('csv_uploads')
              .update({
                status: 'failed',
                error: errorMessage,
                completedAt: new Date().toISOString(),
              })
              .eq('id', uploadId)
          } catch (err) {
            console.error('[CSVUpload] Failed to update failed upload record:', err)
          }
        }
        
        results.push({
          fileName: file.name,
          success: false,
          error: errorMessage,
        })
      }
    }

    const allSuccess = results.every(r => r.success)
    const hasDuplicates = results.some(r => r.duplicate)

    return NextResponse.json({
      success: allSuccess && !hasDuplicates,
      hasDuplicates,
      results,
    }, { status: allSuccess && !hasDuplicates ? 200 : 207 })
  } catch (error) {
    console.error('[CSVUpload] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process CSV upload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
