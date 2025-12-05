"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"

interface ExportButtonProps {
  endpoint: string
  filename?: string
  params?: Record<string, string | number>
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
}

export function ExportButton({
  endpoint,
  filename,
  params,
  variant = "outline",
  size = "default",
  children,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      // Build query string from params
      const queryParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            queryParams.append(key, String(value))
          }
        })
      }

      const url = `/api/export/${endpoint}?${queryParams.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get filename from Content-Disposition header or use provided/default
      const contentDisposition = response.headers.get('Content-Disposition')
      let exportFilename = filename || 'export.csv'
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          exportFilename = filenameMatch[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = exportFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant={variant}
      size={size}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {children || 'Export CSV'}
        </>
      )}
    </Button>
  )
}
