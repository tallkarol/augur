"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, CheckCircle2, XCircle, Upload, X, FileText, AlertCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  result?: {
    recordsProcessed: number
    result: {
      artistsCreated: number
      tracksCreated: number
      entriesCreated: number
    }
  }
}

interface Settings {
  csv_upload?: {
    defaultDeduplicationAction: string
    maxFileSize: number
    autoProcess: boolean
  }
}

export default function CsvUploadSettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null)
  
  // Upload state
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deduplicationAction, setDeduplicationAction] = useState<string>('show-warning')
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<string[][]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      const loadedSettings = data.settings || {}
      setSettings(loadedSettings)
      setDeduplicationAction(loadedSettings.csv_upload?.defaultDeduplicationAction || 'show-warning')
    } catch (error) {
      console.error("Failed to load settings:", error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    setSaveStatus(null)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "csv_upload",
          updates: settings.csv_upload,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to save settings")
      }

      setSaveStatus("success")
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  function updateSetting(key: string, value: any) {
    setSettings((prev) => ({
      ...prev,
      csv_upload: {
        ...prev.csv_upload,
        [key]: value,
      },
    }))
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

      const [, chartType, , chartPeriod] = filenameMatch

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

      setFiles((prev) =>
        prev.map((f) =>
          f.file === fileStatus.file ? { ...f, status: 'ready' } : f
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

  async function previewFileContent(file: File) {
    const text = await file.text()
    const lines = text.split('\n').slice(0, 11)
    const data = lines.map((line) => line.split(','))
    setPreviewData(data)
    setPreviewFile(file)
  }

  if (loading) {
    return (
      <div className="p-8">
        <Typography variant="h1">Loading...</Typography>
      </div>
    )
  }

  const readyFiles = files.filter((f) => f.status === 'ready')
  const errorFiles = files.filter((f) => f.status === 'error')
  const successFiles = files.filter((f) => f.status === 'success')
  const duplicateFiles = files.filter((f) => f.duplicate)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Typography variant="h1">CSV Upload Settings</Typography>
          <Typography variant="subtitle" className="mt-2">
            Configure CSV upload behavior and upload chart data files
          </Typography>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {saveStatus && (
        <Card className={`mb-6 ${saveStatus === "success" ? "border-green-500" : "border-red-500"}`}>
          <CardContent className="p-4 flex items-center gap-2">
            {saveStatus === "success" ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-green-700">Settings saved successfully</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">Failed to save settings</span>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Settings</CardTitle>
            <CardDescription>
              Configure CSV file upload behavior and processing options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-dedup">Default Deduplication Action</Label>
              <Select
                value={settings.csv_upload?.defaultDeduplicationAction || "show-warning"}
                onValueChange={(value) => {
                  updateSetting("defaultDeduplicationAction", value)
                  setDeduplicationAction(value)
                }}
              >
                <SelectTrigger id="csv-dedup">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip Duplicates</SelectItem>
                  <SelectItem value="update">Update Existing</SelectItem>
                  <SelectItem value="replace">Replace Existing</SelectItem>
                  <SelectItem value="show-warning">Show Warning (User Choice)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How to handle duplicate entries when uploading CSV files
              </p>
            </div>

            <div>
              <Label htmlFor="csv-max-size">Maximum File Size (bytes)</Label>
              <Input
                id="csv-max-size"
                type="number"
                value={settings.csv_upload?.maxFileSize || 10485760}
                onChange={(e) =>
                  updateSetting("maxFileSize", parseInt(e.target.value))
                }
              />
              <p className="text-sm text-muted-foreground mt-1">
                Default: 10MB (10485760 bytes)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Process on Upload</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically process files without preview
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.csv_upload?.autoProcess || false}
                onChange={(e) => updateSetting("autoProcess", e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </CardContent>
        </Card>

        {/* Upload Zone */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV Files</CardTitle>
            <CardDescription>
              Upload chart data from CSV files. Files should follow the naming format:
              {"{chartType}-{region}-{period}-{date}.csv"}
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
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{fileStatus.file.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(fileStatus.file.size / 1024).toFixed(2)} KB
                        </div>
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
                      {fileStatus.status === 'ready' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previewFileContent(fileStatus.file)}
                        >
                          Preview
                        </Button>
                      )}
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
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewFile?.name}</DialogTitle>
            <DialogDescription>
              First 10 rows of the CSV file
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                {previewData[0] && (
                  <tr className="border-b">
                    {previewData[0].map((cell, i) => (
                      <th key={i} className="p-2 text-left font-semibold">
                        {cell}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {previewData.slice(1).map((row, i) => (
                  <tr key={i} className="border-b">
                    {row.map((cell, j) => (
                      <td key={j} className="p-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
