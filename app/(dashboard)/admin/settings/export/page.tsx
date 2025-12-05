"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, CheckCircle2, XCircle } from "lucide-react"

interface Settings {
  export?: {
    defaultFormat: string // 'csv' | 'json' | 'xlsx'
    includeStreams: boolean
    includePositions: boolean
    includeLeadScores: boolean
  }
}

export default function ExportSettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      const loadedSettings = data.settings || {}
      setSettings(loadedSettings)
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
          category: "export",
          updates: settings.export,
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
      export: {
        ...prev.export,
        [key]: value,
      },
    }))
  }

  if (loading) {
    return (
      <div className="p-8">
        <Typography variant="h1">Loading settings...</Typography>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Typography variant="h1">Export Settings</Typography>
          <Typography variant="subtitle" className="mt-2">
            Configure default export options and formats
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

      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>
            Set default export format and data inclusion options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="export-format">Default Export Format</Label>
            <Select
              value={settings.export?.defaultFormat || "csv"}
              onValueChange={(value) =>
                updateSetting("defaultFormat", value)
              }
            >
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Default file format for data exports
            </p>
          </div>

          <div className="space-y-3">
            <Label>Include in Exports</Label>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-normal">Streams</Label>
                <p className="text-xs text-muted-foreground">
                  Include stream counts in exports
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.export?.includeStreams !== false}
                onChange={(e) =>
                  updateSetting("includeStreams", e.target.checked)
                }
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-normal">Positions</Label>
                <p className="text-xs text-muted-foreground">
                  Include chart positions in exports
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.export?.includePositions !== false}
                onChange={(e) =>
                  updateSetting("includePositions", e.target.checked)
                }
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-normal">Lead Scores</Label>
                <p className="text-xs text-muted-foreground">
                  Include calculated lead scores in exports
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.export?.includeLeadScores !== false}
                onChange={(e) =>
                  updateSetting("includeLeadScores", e.target.checked)
                }
                className="h-4 w-4"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
