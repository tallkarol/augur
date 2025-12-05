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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Play, Pause, Edit, Music, Calendar, Settings, Loader2 } from "lucide-react"
import { AVAILABLE_REGIONS } from "@/lib/spotifyCharts"
import { format } from "date-fns"
import Link from "next/link"

interface ChartConfig {
  id: string
  name: string
  chartType: string
  chartPeriod: string
  region: string | null
  regionType: string | null
  enabled: boolean
  lastRun: string | null
  nextRun: string | null
  createdAt: string
  updatedAt: string
}

export default function ChartsConfigPage() {
  const [configs, setConfigs] = useState<ChartConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ChartConfig | null>(null)
  const [playlistLoading, setPlaylistLoading] = useState<string | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    chartType: "regional",
    chartPeriod: "daily",
    region: "",
    regionType: null as "city" | "country" | null,
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  async function loadConfigs() {
    try {
      const res = await fetch("/api/charts/config")
      const data = await res.json()
      setConfigs(data.configs || [])
    } catch (error) {
      console.error("Failed to load configs:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/charts/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          region: formData.region || null,
          regionType: formData.regionType,
        }),
      })

      if (res.ok) {
        setDialogOpen(false)
        resetForm()
        loadConfigs()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to create configuration")
      }
    } catch (error) {
      alert("Failed to create configuration")
    }
  }

  async function handleUpdate(id: string, updates: Partial<ChartConfig>) {
    try {
      const res = await fetch("/api/charts/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })

      if (res.ok) {
        loadConfigs()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to update configuration")
      }
    } catch (error) {
      alert("Failed to update configuration")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this configuration?")) {
      return
    }

    try {
      const res = await fetch(`/api/charts/config?id=${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        loadConfigs()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to delete configuration")
      }
    } catch (error) {
      alert("Failed to delete configuration")
    }
  }

  async function handleRunNow(config: ChartConfig) {
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const date = format(yesterday, "yyyy-MM-dd")

      const res = await fetch("/api/charts/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartType: config.chartType,
          chartPeriod: config.chartPeriod,
          region: config.region || undefined,
          regionType: config.regionType,
          date,
        }),
      })

      if (res.ok) {
        alert("Chart data fetched successfully!")
        loadConfigs()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to fetch chart data")
      }
    } catch (error) {
      alert("Failed to fetch chart data")
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      chartType: "regional",
      chartPeriod: "daily",
      region: "",
      regionType: null,
    })
    setEditingConfig(null)
  }

  function openEditDialog(config: ChartConfig) {
    setEditingConfig(config)
    setFormData({
      name: config.name,
      chartType: config.chartType,
      chartPeriod: config.chartPeriod,
      region: config.region || "",
      regionType: config.regionType as "city" | "country" | null,
    })
    setDialogOpen(true)
  }

  async function handleFetchPlaylist(region: string) {
    setPlaylistLoading(region)
    try {
      const res = await fetch("/api/charts/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Playlist data fetched successfully! Processed ${data.data?.recordsProcessed || 0} tracks.`)
      } else {
        const error = await res.json()
        alert(error.error || "Failed to fetch playlist data")
      }
    } catch (error) {
      alert("Failed to fetch playlist data")
    } finally {
      setPlaylistLoading(null)
    }
  }

  async function handleFetchWeekly() {
    setWeeklyLoading(true)
    try {
      const res = await fetch("/api/charts/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Weekly chart data fetched successfully! Processed ${data.data?.recordsProcessed || 0} entries.`)
      } else {
        const error = await res.json()
        alert(error.error || "Failed to fetch weekly chart data")
      }
    } catch (error) {
      alert("Failed to fetch weekly chart data")
    } finally {
      setWeeklyLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Typography variant="h1">Chart Configurations</Typography>
          <Typography variant="subtitle" className="mt-2">
            Manage automated chart data fetching
          </Typography>
        </div>
        <Link href="/admin/settings">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Viral 50 Playlists
            </CardTitle>
            <CardDescription>
              Fetch Viral 50 charts from Spotify playlists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {['global', 'us', 'gb'].map((region) => (
                  <Button
                    key={region}
                    variant="outline"
                    size="sm"
                    onClick={() => handleFetchPlaylist(region)}
                    disabled={playlistLoading === region}
                  >
                    {playlistLoading === region ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {AVAILABLE_REGIONS[region as keyof typeof AVAILABLE_REGIONS]?.name || region}
                      </>
                    )}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Configure regions in <Link href="/admin/settings" className="underline">Settings</Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Charts
            </CardTitle>
            <CardDescription>
              Fetch weekly charts from JSON API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleFetchWeekly}
              disabled={weeklyLoading}
              className="w-full"
            >
              {weeklyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Fetch Weekly Charts
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit Configuration" : "New Configuration"}
              </DialogTitle>
              <DialogDescription>
                Configure automated chart data fetching
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Global Daily Regional"
                />
              </div>
              <div>
                <Label htmlFor="chartType">Chart Type</Label>
                <Select
                  value={formData.chartType}
                  onValueChange={(value) => setFormData({ ...formData, chartType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="viral">Viral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="chartPeriod">Period</Label>
                <Select
                  value={formData.chartPeriod}
                  onValueChange={(value) => setFormData({ ...formData, chartPeriod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => {
                    const regionData = AVAILABLE_REGIONS[value as keyof typeof AVAILABLE_REGIONS]
                    setFormData({
                      ...formData,
                      region: value === "global" ? "" : value,
                      regionType: regionData?.type || null,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AVAILABLE_REGIONS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={editingConfig ? () => handleUpdate(editingConfig.id, formData) : handleCreate}
                className="w-full"
              >
                {editingConfig ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {configs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No configurations found. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{config.name}</CardTitle>
                    <CardDescription>
                      {config.chartType} • {config.chartPeriod} • {config.region || "global"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunNow(config)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdate(config.id, { enabled: !config.enabled })}
                    >
                      {config.enabled ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Enable
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className={config.enabled ? "text-green-600" : "text-muted-foreground"}>
                      {config.enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Last Run</div>
                    <div>
                      {config.lastRun
                        ? format(new Date(config.lastRun), "MMM d, yyyy HH:mm")
                        : "Never"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Next Run</div>
                    <div>
                      {config.nextRun
                        ? format(new Date(config.nextRun), "MMM d, yyyy HH:mm")
                        : "Not scheduled"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Created</div>
                    <div>{format(new Date(config.createdAt), "MMM d, yyyy")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
