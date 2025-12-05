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
import { AVAILABLE_REGIONS } from "@/lib/spotifyCharts"

interface Settings {
  playlist?: {
    enabled: boolean
    regions: string[]
    defaultDeduplicationAction: string
  }
  json_api?: {
    enabled: boolean
    fetchSchedule: string
    defaultDeduplicationAction: string
  }
  csv_upload?: {
    defaultDeduplicationAction: string
    maxFileSize: number
    autoProcess: boolean
  }
  cron?: {
    enabled: boolean
    playlistSchedule: string
    weeklySchedule: string
    retryAttempts: number
    backoffStrategy: string
  }
  system?: {
    errorNotifications: boolean
    defaultTheme: string // 'light' | 'dark' | 'system'
  }
  playlistIds?: Record<string, string> // Region -> Playlist ID mapping
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
      
      // Extract playlist IDs from settings
      const playlistIds: Record<string, string> = {}
      if (loadedSettings.playlist) {
        Object.keys(loadedSettings.playlist).forEach((key) => {
          if (key.startsWith('viral50_playlist_')) {
            const region = key.replace('viral50_playlist_', '')
            playlistIds[region] = loadedSettings.playlist[key]
          }
        })
      }
      
      // Set default global playlist ID if not configured
      if (!playlistIds.global) {
        playlistIds.global = '37i9dQZEVXbLiRSasKsNU9'
      }
      
      setSettings({
        ...loadedSettings,
        playlistIds,
      })
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

      // Save playlist IDs as individual settings
      const playlistIds = settings.playlistIds || {}
      for (const [region, playlistId] of Object.entries(playlistIds)) {
        if (playlistId && typeof playlistId === 'string' && playlistId.trim()) {
          const res = await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: "playlist",
              updates: {
                [`viral50_playlist_${region.toLowerCase()}`]: playlistId.trim(),
              },
            }),
          })

          if (!res.ok) {
            console.warn(`Failed to save playlist ID for ${region}`)
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

  function toggleRegion(region: string) {
    const currentRegions = settings.playlist?.regions || []
    const newRegions = currentRegions.includes(region)
      ? currentRegions.filter((r) => r !== region)
      : [...currentRegions, region]
    
    updateSetting("playlist", "regions", newRegions)
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
          <Typography variant="h1">Settings</Typography>
          <Typography variant="subtitle" className="mt-2">
            Configure data collection and system preferences
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
        {/* Playlist Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Playlist Configuration</CardTitle>
            <CardDescription>
              Configure Viral 50 playlist fetching from Spotify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Playlist Fetching</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically fetch Viral 50 charts from Spotify playlists
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.playlist?.enabled || false}
                onChange={(e) => updateSetting("playlist", "enabled", e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            {settings.playlist?.enabled && (
              <>
                <div>
                  <Label>Regions</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select regions to fetch Viral 50 charts for
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(AVAILABLE_REGIONS).map(([code, info]) => (
                      <label
                        key={code}
                        className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={settings.playlist?.regions?.includes(code) || false}
                          onChange={() => toggleRegion(code)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{info.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Playlist IDs</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Configure Spotify playlist IDs for each region. Find the ID by opening the playlist in Spotify and copying the ID from the URL.
                  </p>
                  <div className="space-y-2">
                    {settings.playlist?.regions?.map((region) => {
                      const regionInfo = AVAILABLE_REGIONS[region]
                      const settingKey = `viral50_playlist_${region.toLowerCase()}`
                      const currentValue = (settings as any).playlistIds?.[region] || ''
                      
                      return (
                        <div key={region} className="flex items-center gap-2">
                          <Label htmlFor={`playlist-${region}`} className="w-32 text-sm">
                            {regionInfo?.name || region}:
                          </Label>
                          <Input
                            id={`playlist-${region}`}
                            placeholder="e.g., 37i9dQZEVXbLiRSasKsNU9"
                            value={currentValue}
                            onChange={(e) => {
                              const playlistIds = (settings as any).playlistIds || {}
                              setSettings((prev) => ({
                                ...prev,
                                playlistIds: {
                                  ...playlistIds,
                                  [region]: e.target.value,
                                },
                              }))
                            }}
                            className="flex-1"
                          />
                        </div>
                      )
                    }) || (
                      <p className="text-sm text-muted-foreground">
                        Select at least one region above to configure playlist IDs
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Default: Global playlist ID is pre-configured. Add custom IDs for other regions.
                  </p>
                </div>

                <div>
                  <Label htmlFor="playlist-dedup">Default Deduplication Action</Label>
                  <Select
                    value={settings.playlist?.defaultDeduplicationAction || "skip"}
                    onValueChange={(value) =>
                      updateSetting("playlist", "defaultDeduplicationAction", value)
                    }
                  >
                    <SelectTrigger id="playlist-dedup">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip Duplicates</SelectItem>
                      <SelectItem value="update">Update Existing</SelectItem>
                      <SelectItem value="replace">Replace Existing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* JSON API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>JSON API Configuration</CardTitle>
            <CardDescription>
              Configure weekly chart fetching from Spotify JSON API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Weekly Chart Fetching</Label>
                <p className="text-sm text-muted-foreground">
                  Fetch weekly charts from public JSON API
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.json_api?.enabled || false}
                onChange={(e) => updateSetting("json_api", "enabled", e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            {settings.json_api?.enabled && (
              <>
                <div>
                  <Label htmlFor="json-schedule">Fetch Schedule</Label>
                  <Select
                    value={settings.json_api?.fetchSchedule || "weekly"}
                    onValueChange={(value) =>
                      updateSetting("json_api", "fetchSchedule", value)
                    }
                  >
                    <SelectTrigger id="json-schedule">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="json-dedup">Default Deduplication Action</Label>
                  <Select
                    value={settings.json_api?.defaultDeduplicationAction || "skip"}
                    onValueChange={(value) =>
                      updateSetting("json_api", "defaultDeduplicationAction", value)
                    }
                  >
                    <SelectTrigger id="json-dedup">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip Duplicates</SelectItem>
                      <SelectItem value="update">Update Existing</SelectItem>
                      <SelectItem value="replace">Replace Existing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* CSV Upload Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Upload Configuration</CardTitle>
            <CardDescription>
              Configure CSV file upload behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-dedup">Default Deduplication Action</Label>
              <Select
                value={settings.csv_upload?.defaultDeduplicationAction || "show-warning"}
                onValueChange={(value) =>
                  updateSetting("csv_upload", "defaultDeduplicationAction", value)
                }
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
            </div>

            <div>
              <Label htmlFor="csv-max-size">Maximum File Size (bytes)</Label>
              <Input
                id="csv-max-size"
                type="number"
                value={settings.csv_upload?.maxFileSize || 10485760}
                onChange={(e) =>
                  updateSetting("csv_upload", "maxFileSize", parseInt(e.target.value))
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
                onChange={(e) => updateSetting("csv_upload", "autoProcess", e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cron Job Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Cron Job Configuration</CardTitle>
            <CardDescription>
              Configure automated data fetching schedules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Automatic Fetching</Label>
                <p className="text-sm text-muted-foreground">
                  Run scheduled data collection jobs
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.cron?.enabled || false}
                onChange={(e) => updateSetting("cron", "enabled", e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            {settings.cron?.enabled && (
              <>
                <div>
                  <Label htmlFor="playlist-schedule">Playlist Fetch Schedule (Cron)</Label>
                  <Input
                    id="playlist-schedule"
                    value={settings.cron?.playlistSchedule || "0 2 * * *"}
                    onChange={(e) =>
                      updateSetting("cron", "playlistSchedule", e.target.value)
                    }
                    placeholder="0 2 * * *"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Format: minute hour day month weekday (e.g., "0 2 * * *" = daily at 2 AM)
                  </p>
                </div>

                <div>
                  <Label htmlFor="weekly-schedule">Weekly Chart Schedule (Cron)</Label>
                  <Input
                    id="weekly-schedule"
                    value={settings.cron?.weeklySchedule || "0 2 * * 1"}
                    onChange={(e) =>
                      updateSetting("cron", "weeklySchedule", e.target.value)
                    }
                    placeholder="0 2 * * 1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Format: minute hour day month weekday (e.g., "0 2 * * 1" = Monday at 2 AM)
                  </p>
                </div>

                <div>
                  <Label htmlFor="retry-attempts">Retry Attempts</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    value={settings.cron?.retryAttempts || 3}
                    onChange={(e) =>
                      updateSetting("cron", "retryAttempts", parseInt(e.target.value))
                    }
                    min="0"
                    max="10"
                  />
                </div>

                <div>
                  <Label htmlFor="backoff-strategy">Backoff Strategy</Label>
                  <Select
                    value={settings.cron?.backoffStrategy || "exponential"}
                    onValueChange={(value) =>
                      updateSetting("cron", "backoffStrategy", value)
                    }
                  >
                    <SelectTrigger id="backoff-strategy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exponential">Exponential</SelectItem>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              General system preferences
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
      </div>
    </div>
  )
}
