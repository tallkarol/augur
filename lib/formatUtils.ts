import { format, parseISO } from 'date-fns'
import React from 'react'

// Client-side settings cache
let clientSettingsCache: any = null
let clientCacheTimestamp = 0
const CACHE_TTL = 60000 // 1 minute

export async function getClientSettings(): Promise<any> {
  const now = Date.now()
  if (clientSettingsCache && (now - clientCacheTimestamp) < CACHE_TTL) {
    return clientSettingsCache
  }

  try {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' })
    const data = await res.json()
    clientSettingsCache = data.settings || {}
    clientCacheTimestamp = now
    return clientSettingsCache
  } catch (error) {
    console.error('Failed to load settings:', error)
    return {}
  }
}

// Format date according to display settings (client-side)
export async function formatDateClient(date: Date | string, formatString?: string): Promise<string> {
  try {
    const settings = await getClientSettings()
    const displaySettings = settings.display || {}
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!dateObj || isNaN(dateObj.getTime())) {
      return String(date) // Return original if invalid
    }
    const dateFormat = formatString || displaySettings.dateFormat || 'MM/dd/yyyy'
    
    // Note: Timezone conversion would require date-fns-tz package
    // For now, we'll just format the date according to the format setting
    return format(dateObj, dateFormat)
  } catch (error) {
    return String(date) // Return original if parsing fails
  }
}

// Format number according to display settings (client-side)
export async function formatNumberClient(value: number | bigint | string | null | undefined): Promise<string> {
  if (value === null || value === undefined) return 'N/A'
  
  const settings = await getClientSettings()
  const displaySettings = settings.display || {}
  const numberFormat = displaySettings.numberFormat || 'standard'
  
  const numValue = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'bigint' ? Number(value) : value
  
  if (isNaN(numValue)) return 'N/A'
  
  if (numberFormat === 'compact') {
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`
    }
    if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`
    }
    return numValue.toString()
  }
  
  return numValue.toLocaleString('en-US')
}

// React hook for date formatting
export function useFormatDate() {
  const defaultFormatter = React.useCallback((date: Date | string, formatString?: string) => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      if (!dateObj || isNaN(dateObj.getTime())) {
        return String(date) // Return original if invalid
      }
      return format(dateObj, formatString || 'MM/dd/yyyy')
    } catch (error) {
      return String(date) // Return original if parsing fails
    }
  }, [])

  const [formatDateFn, setFormatDateFn] = React.useState<(date: Date | string, formatString?: string) => string>(defaultFormatter)
  
  React.useEffect(() => {
    getClientSettings().then(settings => {
      const displaySettings = settings.display || {}
      const dateFormat = displaySettings.dateFormat || 'MM/dd/yyyy'
      
      setFormatDateFn((date: Date | string, formatString?: string) => {
        try {
          const dateObj = typeof date === 'string' ? parseISO(date) : date
          if (!dateObj || isNaN(dateObj.getTime())) {
            return String(date) // Return original if invalid
          }
          const finalFormat = formatString || dateFormat
          
          // Note: Timezone conversion would require date-fns-tz package
          // For now, we'll just format the date according to the format setting
          return format(dateObj, finalFormat)
        } catch (error) {
          return String(date) // Return original if parsing fails
        }
      })
    }).catch(() => {
      // If settings fail to load, keep the default formatter
      setFormatDateFn(defaultFormatter)
    })
  }, [defaultFormatter])
  
  // Ensure we always return a function
  return formatDateFn || defaultFormatter
}

// React hook for number formatting
export function useFormatNumber() {
  const [formatNumberFn, setFormatNumberFn] = React.useState<(value: number | bigint | string | null | undefined) => string>(
    (value: number | bigint | string | null | undefined) => {
      if (value === null || value === undefined) return 'N/A'
      const numValue = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'bigint' ? Number(value) : value
      if (isNaN(numValue)) return 'N/A'
      return numValue.toLocaleString('en-US')
    }
  )
  
  React.useEffect(() => {
    getClientSettings().then(settings => {
      const displaySettings = settings.display || {}
      const numberFormat = displaySettings.numberFormat || 'standard'
      
      setFormatNumberFn((value: number | bigint | string | null | undefined) => {
        if (value === null || value === undefined) return 'N/A'
        
        const numValue = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'bigint' ? Number(value) : value
        
        if (isNaN(numValue)) return 'N/A'
        
        if (numberFormat === 'compact') {
          if (numValue >= 1000000) {
            return `${(numValue / 1000000).toFixed(1)}M`
          }
          if (numValue >= 1000) {
            return `${(numValue / 1000).toFixed(1)}K`
          }
          return numValue.toString()
        }
        
        return numValue.toLocaleString('en-US')
      })
    })
  }, [])
  
  return formatNumberFn
}

// Server-side functions moved to formatUtilsServer.ts to avoid client-side bundling issues
