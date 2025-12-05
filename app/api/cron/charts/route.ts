import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { downloadChartCSV, validateChartRequest, type ChartRequest, fetchWeeklyChartData } from '@/lib/spotifyCharts'
import { parseChartCSV, parseChartData } from '@/lib/csvParser'
import { processChartData } from '@/lib/chartProcessor'
import { fetchViral50Chart, processPlaylistChart } from '@/lib/spotifyPlaylists'
import { getDefaultDeduplicationAction, handleDuplicates, checkDuplicates } from '@/lib/deduplication'
import { format, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  try {
    // Validate cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('[Cron] Starting scheduled chart fetch')

    // Check if cron is enabled in settings
    const { data: cronSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'enabled')
      .eq('category', 'cron')
      .limit(1)
      .single()

    const cronEnabled = cronSetting ? JSON.parse(cronSetting.value) : false

    if (!cronEnabled) {
      return NextResponse.json({
        success: true,
        message: 'Cron jobs are disabled in settings',
        skipped: true,
      })
    }

    const results = {
      playlists: { processed: 0, successful: [] as string[], failed: [] as { region: string; error: string }[] },
      weekly: { processed: false, success: false, error: null as string | null },
      configs: { processed: 0, successful: [] as string[], failed: [] as { configId: string; error: string }[] },
    }

    // Fetch playlist settings
    const { data: playlistSettings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'enabled')
      .eq('category', 'playlist')
      .limit(1)
      .single()

    const playlistEnabled = playlistSettings ? JSON.parse(playlistSettings.value) : false

    if (playlistEnabled) {
      // Get enabled regions
      const { data: regionsSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'regions')
        .eq('category', 'playlist')
        .limit(1)
        .single()

      const regions = regionsSetting ? JSON.parse(regionsSetting.value) : ['global']
      const fetchDate = format(new Date(), 'yyyy-MM-dd')

      // Fetch Viral 50 playlists
      for (const region of regions) {
        try {
          console.log(`[Cron] Fetching Viral 50 playlist for region: ${region}`)
          
          const chartData = await fetchViral50Chart(region, fetchDate)
          const dedupAction = await getDefaultDeduplicationAction('playlist')
          
          const duplicateCheck = await checkDuplicates(
            fetchDate,
            'viral',
            'daily',
            region === 'global' ? null : region
          )

          if (duplicateCheck.exists) {
            const handleResult = await handleDuplicates(
              fetchDate,
              'viral',
              'daily',
              region === 'global' ? null : region,
              dedupAction
            )

            if (handleResult.skipped) {
              console.log(`[Cron] Skipped duplicate playlist data for ${region}`)
              results.playlists.successful.push(region)
              results.playlists.processed++
              continue
            }
          }

          const processedRows = processPlaylistChart(chartData)
          const parsedData = {
            rows: processedRows,
            chartType: 'viral' as const,
            chartPeriod: 'daily' as const,
            date: fetchDate,
          }

          await processChartData(parsedData, region === 'global' ? undefined : region, undefined)
          
          results.playlists.successful.push(region)
          results.playlists.processed++
          
          // Rate limit protection
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`[Cron] Error fetching playlist for ${region}:`, errorMsg)
          results.playlists.failed.push({ region, error: errorMsg })
        }
      }
    }

    // Fetch weekly charts from JSON API
    const { data: jsonApiSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'enabled')
      .eq('category', 'json_api')
      .limit(1)
      .single()

    const jsonApiEnabled = jsonApiSetting ? JSON.parse(jsonApiSetting.value) : false

    if (jsonApiEnabled) {
      try {
        console.log('[Cron] Fetching weekly charts from JSON API')
        
        const apiResponse = await fetchWeeklyChartData()
        const chartResponse = apiResponse.chartEntryViewResponses[0]
        
        if (chartResponse) {
          const chartDate = chartResponse.displayChart.date
          const chartMetadata = chartResponse.displayChart.chartMetadata
          const alias = chartMetadata.alias || ''
          const chartType = alias.includes('VIRAL') ? 'viral' : 'regional'
          const chartPeriod = alias.includes('WEEKLY') ? 'weekly' : 'daily'

          const parsedData = parseChartData(apiResponse, chartType, chartPeriod, chartDate)
          const dedupAction = await getDefaultDeduplicationAction('json_api')
          
          const duplicateCheck = await checkDuplicates(chartDate, chartType, chartPeriod, null)

          if (duplicateCheck.exists) {
            const handleResult = await handleDuplicates(chartDate, chartType, chartPeriod, null, dedupAction)
            if (handleResult.skipped) {
              console.log('[Cron] Skipped duplicate weekly chart data')
              results.weekly.processed = true
              results.weekly.success = true
            } else {
              await processChartData(parsedData, undefined, undefined)
              results.weekly.processed = true
              results.weekly.success = true
            }
          } else {
            await processChartData(parsedData, undefined, undefined)
            results.weekly.processed = true
            results.weekly.success = true
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('[Cron] Error fetching weekly charts:', errorMsg)
        results.weekly.error = errorMsg
      }
    }

    // Process legacy chart configs (CSV-based)
    const { data: configs, error } = await supabase
      .from('chart_configs')
      .select('*')
      .eq('enabled', true)

    if (!error && configs && configs.length > 0) {
      for (const config of configs) {
        try {
          const fetchDate = config.chartPeriod === 'weekly'
            ? format(subDays(new Date(), 7), 'yyyy-MM-dd')
            : format(subDays(new Date(), 1), 'yyyy-MM-dd')

          const chartRequest: ChartRequest = {
            chartType: config.chartType as 'regional' | 'viral',
            chartPeriod: config.chartPeriod as 'daily' | 'weekly',
            region: config.region || undefined,
            regionType: config.regionType as 'city' | 'country' | null | undefined,
            date: fetchDate,
          }

          const validation = validateChartRequest(chartRequest)
          if (!validation.valid) {
            results.configs.failed.push({
              configId: config.id,
              error: validation.error || 'Invalid request',
            })
            continue
          }

          console.log(`[Cron] Processing config ${config.name} for date ${fetchDate}`)

          const csvText = await downloadChartCSV(chartRequest)
          const parsedData = parseChartCSV(
            csvText,
            chartRequest.chartType,
            chartRequest.chartPeriod,
            fetchDate
          )
          await processChartData(
            parsedData,
            config.region || undefined,
            config.regionType as 'city' | 'country' | null | undefined
          )

          const nextRun = new Date()
          nextRun.setDate(nextRun.getDate() + (config.chartPeriod === 'weekly' ? 7 : 1))

          await supabase
            .from('chart_configs')
            .update({
              lastRun: new Date().toISOString(),
              nextRun: nextRun.toISOString(),
            })
            .eq('id', config.id)

          results.configs.successful.push(config.id)
          results.configs.processed++

          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`[Cron] Error processing config ${config.id}:`, errorMsg)
          results.configs.failed.push({
            configId: config.id,
            error: errorMsg,
          })
        }
      }
    }

    console.log(`[Cron] Completed: Playlists: ${results.playlists.processed}, Weekly: ${results.weekly.processed}, Configs: ${results.configs.processed}`)

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      results,
    })
  } catch (error) {
    console.error('[Cron] Error:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
