/**
 * Node.js Cron Implementation
 * 
 * For self-hosted deployments, use this to set up cron jobs
 * Install: npm install node-cron
 */

import cron from 'node-cron'

/**
 * Start cron job for chart fetching
 * 
 * Schedule format: https://www.npmjs.com/package/node-cron#cron-syntax
 * 
 * Examples:
 * - '0 2 * * *' - Every day at 2 AM
 * - '0 2 * * 1' - Every Monday at 2 AM
 * - Every 6 hours: use pattern with asterisk-slash-6 in the hours field
 */
export function startChartCronJob(schedule: string = '0 2 * * *') {
  console.log(`[Cron] Starting chart fetch cron job with schedule: ${schedule}`)

  cron.schedule(schedule, async () => {
    try {
      console.log('[Cron] Running scheduled chart fetch')
      
      const cronSecret = process.env.CRON_SECRET
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      
      const response = await fetch(`${baseUrl}/api/cron/charts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cronSecret && { 'Authorization': `Bearer ${cronSecret}` }),
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Cron job failed')
      }

      const result = await response.json()
      console.log('[Cron] Chart fetch completed:', result)
    } catch (error) {
      console.error('[Cron] Error running chart fetch:', error)
    }
  })

  console.log('[Cron] Chart fetch cron job started')
}

/**
 * Example usage in server startup:
 * 
 * ```typescript
 * import { startChartCronJob } from '@/lib/cron'
 * 
 * // Start cron job (only in production or when explicitly enabled)
 * if (process.env.ENABLE_CRON === 'true') {
 *   startChartCronJob('0 2 * * *') // Daily at 2 AM
 * }
 * ```
 */
