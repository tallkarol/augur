/**
 * CSV Export Utilities
 */

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If the value contains comma, newline, or quote, wrap it in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data: Record<string, any>[], headers?: string[]): string {
  if (data.length === 0) {
    return ''
  }

  // Determine headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0])

  // Build CSV rows
  const rows = [csvHeaders.map(escapeCSV).join(',')]

  for (const row of data) {
    const values = csvHeaders.map((header) => escapeCSV(row[header]))
    rows.push(values.join(','))
  }

  return rows.join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Format date for CSV
 */
export function formatDateForCSV(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Format number for CSV (remove formatting, keep raw number)
 */
export function formatNumberForCSV(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    // Remove any formatting (commas, etc.)
    return value.replace(/,/g, '')
  }
  return String(value)
}
