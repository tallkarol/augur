"use client"

import { useEffect, useState } from "react"
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
import { Save, CheckCircle2, XCircle } from "lucide-react"

interface Settings {
  dashboard?: {
    defaultChartType: string // 'blended' | 'regional' | 'viral'
    defaultRegion: string // 'us' | 'global'
    defaultDateRange: string // 'yesterday' | 'lastWeek' | 'last30' | 'last90' | 'thisYear'
    itemsPerPage: number
  }
}

export default function DashboardSettingsPage() {
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
          category: "dashboard",
          updates: settings.dashboard,
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
      dashboard: {
        ...prev.dashboard,
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
          <Typography variant="h1">Dashboard Settings</Typography>
          <Typography variant="subtitle" className="mt-2">
            Configure default dashboard view and behavior
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
          <CardTitle>Dashboard Configuration</CardTitle>
          <CardDescription>
            Set default values for dashboard views and data display
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default-chart-type">Default Chart Type</Label>
            <Select
              value={settings.dashboard?.defaultChartType || "blended"}
              onValueChange={(value) =>
                updateSetting("defaultChartType", value)
              }
            >
              <SelectTrigger id="default-chart-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blended">Blended</SelectItem>
                <SelectItem value="regional">Top (Regional)</SelectItem>
                <SelectItem value="viral">Viral</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Default chart type when opening the dashboard
            </p>
          </div>

          <div>
            <Label htmlFor="default-region">Default Region</Label>
            <Select
              value={settings.dashboard?.defaultRegion || "us"}
              onValueChange={(value) =>
                updateSetting("defaultRegion", value)
              }
            >
              <SelectTrigger id="default-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">US</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Default region filter for dashboard views
            </p>
          </div>

          <div>
            <Label htmlFor="default-date-range">Default Date Range</Label>
            <Select
              value={settings.dashboard?.defaultDateRange || "yesterday"}
              onValueChange={(value) =>
                updateSetting("defaultDateRange", value)
              }
            >
              <SelectTrigger id="default-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="lastWeek">Last 7 Days</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="last90">Last 90 Days</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Default date range preset when opening the dashboard
            </p>
          </div>

          <div>
            <Label htmlFor="items-per-page">Items Per Page</Label>
            <Input
              id="items-per-page"
              type="number"
              min="10"
              max="100"
              step="10"
              value={settings.dashboard?.itemsPerPage || 20}
              onChange={(e) =>
                updateSetting("itemsPerPage", parseInt(e.target.value) || 20)
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Number of items to show per page in lists and tables
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
