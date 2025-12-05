import { NextRequest, NextResponse } from 'next/server'
import { parseChartCSV } from '@/lib/csvParser'
import { processChartData } from '@/lib/chartProcessor'
import { checkDuplicates, getDefaultDeduplicationAction } from '@/lib/deduplication'
import { supabase } from '@/lib/supabase'
import { parseISO } from 'date-fns'

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

        // Check for duplicates
        const duplicateCheck = await checkDuplicates(date, chartType, chartPeriod, region === 'global' ? null : region)

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
              region: region === 'global' ? null : region,
              existingEntryCount: duplicateCheck.existingEntryCount,
            },
            error: `Duplicate entries found. ${duplicateCheck.existingEntryCount} existing entries for this date/chart combination.`,
          })
          continue
        }

        // Handle duplicates if needed
        if (duplicateCheck.exists && action !== 'skip') {
          // This will be handled by the deduplication system
          // For now, proceed with processing
        }

        // Determine region type (heuristic: if region is a known country code or 'global', it's country/global)
        const regionType = region === 'global' ? null : (region.length === 2 ? 'country' : 'city')
        const normalizedRegion = region === 'global' ? null : region

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
          regionType || undefined
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
          await supabase
            .from('csv_uploads')
            .update({
              status: 'failed',
              error: errorMessage,
              completedAt: new Date().toISOString(),
            })
            .eq('id', uploadId)
            .catch((err) => console.error('[CSVUpload] Failed to update failed upload record:', err))
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
