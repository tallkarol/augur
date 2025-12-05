"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X, FileText, CheckCircle2, XCircle, AlertCircle, Loader2, Clock } from "lucide-react"
import { format } from "date-fns"

interface FileWithStatus {
  file: File
  status: 'pending' | 'validating' | 'ready' | 'error' | 'success'
  error?: string
  duplicate?: boolean
  duplicateInfo?: {
    date: string
    chartType: string
    chartPeriod: string
    region: string | null
    existingEntryCount: number
  }
  metadata?: {
    chartType: string
    chartPeriod: string
    date: string
    region: string | null
    regionType: string | null
  }
  result?: {
    recordsProcessed: number
    uploadId?: string
    result: {
      artistsCreated: number
      tracksCreated: number
      entriesCreated: number
      entriesUpdated: number
    }
  }
}

interface CsvUpload {
  id: string
  fileName: string
  chartType: string
  chartPeriod: string
  date: string
  region: string | null
  regionType: string | null
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsSkipped: number
  status: string
  error: string | null
  uploadedAt: string
  completedAt: string | null
}

export default function ImporterPage() {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deduplicationAction, setDeduplicationAction] = useState<string>('show-warning')
  const [uploadHistory, setUploadHistory] = useState<CsvUpload[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadUploadHistory()
  }, [])

  async function loadUploadHistory() {
    try {
      const res = await fetch('/api/csv-uploads?limit=20')
      const data = await res.json()
      setUploadHistory(data.uploads || [])
    } catch (error) {
      console.error('Failed to load upload history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.name.endsWith('.csv')
    )

    const newFiles: FileWithStatus[] = droppedFiles.map((file) => ({
      file,
      status: 'pending',
    }))

    setFiles((prev) => [...prev, ...newFiles])
    validateFiles(newFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      (file) => file.name.endsWith('.csv')
    )

    const newFiles: FileWithStatus[] = selectedFiles.map((file) => ({
      file,
      status: 'pending',
    }))

    setFiles((prev) => [...prev, ...newFiles])
    validateFiles(newFiles)
  }, [])

  async function validateFiles(filesToValidate: FileWithStatus[]) {
    for (const fileStatus of filesToValidate) {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === fileStatus.file ? { ...f, status: 'validating' } : f
        )
      )

      // Validate filename format
      const filenameMatch = fileStatus.file.name.match(
        /^([^-]+)-([^-]+)-([^-]+)-(\d{4}-\d{2}-\d{2})\.csv$/
      )

      if (!filenameMatch) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileStatus.file
              ? {
                  ...f,
                  status: 'error',
                  error: 'Invalid filename format. Expected: {chartType}-{region}-{period}-{date}.csv',
                }
              : f
          )
        )
        continue
      }

      const [, chartType, region, chartPeriod, date] = filenameMatch

      if (!['regional', 'viral'].includes(chartType)) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileStatus.file
              ? { ...f, status: 'error', error: `Invalid chart type: ${chartType}` }
              : f
          )
        )
        continue
      }

      if (!['daily', 'weekly'].includes(chartPeriod)) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileStatus.file
              ? { ...f, status: 'error', error: `Invalid chart period: ${chartPeriod}` }
              : f
          )
        )
        continue
      }

      // Determine region type
      const regionType = region === 'global' ? null : (region.length === 2 ? 'country' : 'city')
      const normalizedRegion = region === 'global' ? null : region

      setFiles((prev) =>
        prev.map((f) =>
          f.file === fileStatus.file
            ? {
                ...f,
                status: 'ready',
                metadata: {
                  chartType,
                  chartPeriod,
                  date,
                  region: normalizedRegion,
                  regionType,
                },
              }
            : f
        )
      )
    }
  }

  async function handleUpload() {
    const readyFiles = files.filter((f) => f.status === 'ready')
    
    if (readyFiles.length === 0) {
      alert('No valid files to upload')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      readyFiles.forEach((fileStatus) => {
        formData.append('files', fileStatus.file)
      })
      formData.append('deduplicationAction', deduplicationAction)

      const res = await fetch('/api/charts/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      // Update file statuses based on results
      data.results.forEach((result: any, index: number) => {
        const fileStatus = readyFiles[index]
        if (fileStatus) {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileStatus.file
                ? {
                    ...f,
                    status: result.success ? 'success' : result.duplicate ? 'error' : 'error',
                    error: result.error,
                    duplicate: result.duplicate,
                    duplicateInfo: result.duplicateInfo,
                    result: result.result || result,
                  }
                : f
            )
          )
        }
      })

      // Reload upload history
      await loadUploadHistory()
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function removeFile(file: File) {
    setFiles((prev) => prev.filter((f) => f.file !== file))
  }

  const readyFiles = files.filter((f) => f.status === 'ready')
  const errorFiles = files.filter((f) => f.status === 'error')
  const successFiles = files.filter((f) => f.status === 'success')

  function getStatusBadge(status: string) {
    switch (status) {
      case 'success':
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Success</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Failed</span>
      case 'partial':
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Partial</span>
      case 'processing':
        return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Processing</span>
      default:
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">{status}</span>
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Typography variant="h1">CSV Importer</Typography>
        <Typography variant="subtitle" className="mt-2">
          Upload Spotify CSV files to import chart data. Files should follow the naming format:
          {"{chartType}-{region}-{period}-{date}.csv"}
        </Typography>
      </div>

      <div className="space-y-6">
        {/* Upload Zone */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>
              Drag and drop CSV files or click to select
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Typography variant="h3" className="mb-2">
                Drag and drop CSV files here
              </Typography>
              <Typography variant="subtitle" className="text-muted-foreground mb-4">
                or
              </Typography>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    fileInputRef.current?.click()
                  }}
                >
                  Select Files
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deduplication Action */}
        {readyFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Deduplication Action</CardTitle>
              <CardDescription>
                How should duplicate entries be handled?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={deduplicationAction} onValueChange={setDeduplicationAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip Duplicates</SelectItem>
                  <SelectItem value="update">Update Existing</SelectItem>
                  <SelectItem value="replace">Replace Existing</SelectItem>
                  <SelectItem value="show-warning">Show Warning (User Choice)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* File List */}
        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>
                {readyFiles.length} ready, {errorFiles.length} errors, {successFiles.length} uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {files.map((fileStatus, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium">{fileStatus.file.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(fileStatus.file.size / 1024).toFixed(2)} KB
                        </div>
                        
                        {/* Metadata Display */}
                        {fileStatus.metadata && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">
                              {fileStatus.metadata.chartType === 'regional' ? 'Regional' : 'Viral'}
                            </span>
                            <span className="px-2 py-1 rounded bg-purple-50 text-purple-700">
                              {fileStatus.metadata.chartPeriod === 'daily' ? 'Daily' : 'Weekly'}
                            </span>
                            <span className="px-2 py-1 rounded bg-green-50 text-green-700">
                              {format(new Date(fileStatus.metadata.date), 'MMM d, yyyy')}
                            </span>
                            {fileStatus.metadata.region && (
                              <span className="px-2 py-1 rounded bg-orange-50 text-orange-700">
                                {fileStatus.metadata.region}
                                {fileStatus.metadata.regionType && ` (${fileStatus.metadata.regionType})`}
                              </span>
                            )}
                            {!fileStatus.metadata.region && (
                              <span className="px-2 py-1 rounded bg-gray-50 text-gray-700">
                                Global
                              </span>
                            )}
                          </div>
                        )}

                        {fileStatus.error && (
                          <div className="text-sm text-red-600 mt-1">{fileStatus.error}</div>
                        )}
                        {fileStatus.duplicate && (
                          <div className="text-sm text-yellow-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {fileStatus.duplicateInfo?.existingEntryCount} existing entries found
                          </div>
                        )}
                        {fileStatus.result && fileStatus.result.result && (
                          <div className="text-sm text-green-600 mt-1">
                            Processed: {fileStatus.result.recordsProcessed || 0} rows
                            {fileStatus.result.result.entriesCreated !== undefined && (
                              <> • Created: {fileStatus.result.result.entriesCreated} entries</>
                            )}
                            {fileStatus.result.result.artistsCreated !== undefined && fileStatus.result.result.artistsCreated > 0 && (
                              <> • {fileStatus.result.result.artistsCreated} artists</>
                            )}
                            {fileStatus.result.result.tracksCreated !== undefined && fileStatus.result.result.tracksCreated > 0 && (
                              <> • {fileStatus.result.result.tracksCreated} tracks</>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fileStatus.status === 'success' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {fileStatus.status === 'error' && !fileStatus.duplicate && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {fileStatus.status === 'validating' && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileStatus.file)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {readyFiles.length > 0 && (
                <div className="mt-4">
                  <Button onClick={handleUpload} disabled={uploading} className="w-full">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {readyFiles.length} File{readyFiles.length > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload History */}
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>
              Recent CSV uploads and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : uploadHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No uploads yet. Upload your first CSV file above.
              </div>
            ) : (
              <div className="space-y-2">
                {uploadHistory.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{upload.fileName}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">
                          {upload.chartType === 'regional' ? 'Regional' : 'Viral'}
                        </span>
                        <span className="px-2 py-1 rounded bg-purple-50 text-purple-700">
                          {upload.chartPeriod === 'daily' ? 'Daily' : 'Weekly'}
                        </span>
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700">
                          {format(new Date(upload.date), 'MMM d, yyyy')}
                        </span>
                        {upload.region && (
                          <span className="px-2 py-1 rounded bg-orange-50 text-orange-700">
                            {upload.region}
                            {upload.regionType && ` (${upload.regionType})`}
                          </span>
                        )}
                        {!upload.region && (
                          <span className="px-2 py-1 rounded bg-gray-50 text-gray-700">
                            Global
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Processed: {upload.recordsProcessed}</span>
                        <span>Created: {upload.recordsCreated}</span>
                        {upload.recordsUpdated > 0 && <span>Updated: {upload.recordsUpdated}</span>}
                        {upload.error && (
                          <span className="text-red-600">Error: {upload.error}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(upload.status)}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(upload.uploadedAt), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
