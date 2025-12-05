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
  system?: {
    errorNotifications: boolean
    defaultTheme: string // 'light' | 'dark' | 'system'
  }
  display?: {
    dateFormat: string // 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd'
    numberFormat: string // 'standard' | 'compact' (K/M notation)
    timezone: string
  }
}

export default function SettingsPage() {
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
      // Save each category
      const categories = Object.keys(settings) as Array<keyof Settings>
      
      for (const category of categories) {
        if (settings[category]) {
          const res = await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category,
              updates: settings[category],
            }),
          })

          if (!res.ok) {
            throw new Error(`Failed to save ${category} settings`)
          }
        }
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

  function updateSetting(category: keyof Settings, key: string, value: any) {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
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
          <Typography variant="h1">System Settings</Typography>
          <Typography variant="subtitle" className="mt-2">
            Configure system preferences and display options
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
        {/* System Settings - Moved to Top */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              General system preferences and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Error Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications for sync errors
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.system?.errorNotifications !== false}
                onChange={(e) =>
                  updateSetting("system", "errorNotifications", e.target.checked)
                }
                className="h-4 w-4"
              />
            </div>

            <div>
              <Label htmlFor="default-theme">Default Theme</Label>
              <Select
                value={settings.system?.defaultTheme || "light"}
                onValueChange={(value) =>
                  updateSetting("system", "defaultTheme", value)
                }
              >
                <SelectTrigger id="default-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Default theme for new users. Current users can override this in their preferences.
              </p>
            </div>

            <div className="pt-4 border-t">
              <Label>System Status</Label>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Spotify API:</span>
                  <span className="text-green-600">Configured</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Database:</span>
                  <span className="text-green-600">Connected</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Configure how data is formatted and displayed throughout the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
      <div>
              <Label htmlFor="date-format">Date Format</Label>
              <Select
                value={settings.display?.dateFormat || "MM/dd/yyyy"}
                onValueChange={(value) =>
                  updateSetting("display", "dateFormat", value)
                }
              >
                <SelectTrigger id="date-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (US)</SelectItem>
                  <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (EU)</SelectItem>
                  <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (ISO)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Format used for displaying dates in charts and tables
              </p>
            </div>

            <div>
              <Label htmlFor="number-format">Number Format</Label>
              <Select
                value={settings.display?.numberFormat || "standard"}
                onValueChange={(value) =>
                  updateSetting("display", "numberFormat", value)
                }
              >
                <SelectTrigger id="number-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (1,234,567)</SelectItem>
                  <SelectItem value="compact">Compact (1.2M, 1.2K)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How large numbers (like streams) are displayed
          </p>
      </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.display?.timezone || "UTC"}
                onValueChange={(value) =>
                  updateSetting("display", "timezone", value)
                }
            >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Timezone for displaying dates and times
              </p>
                      </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

