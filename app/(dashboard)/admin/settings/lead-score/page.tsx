"use client"

import { useEffect, useState } from "react"
import { Typography } from "@/components/typography"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, CheckCircle2, XCircle } from "lucide-react"

interface Settings {
  lead_score?: {
    daysTop10Multiplier: number
    daysTop20Multiplier: number
    avgPositionMultiplier: number
    bestPositionMultiplier: number
  }
}

export default function LeadScoreSettingsPage() {
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
          category: "lead_score",
          updates: settings.lead_score,
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
      lead_score: {
        ...prev.lead_score,
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
          <Typography variant="h1">Lead Score Configuration</Typography>
          <Typography variant="subtitle" className="mt-2">
            Configure how lead scores are calculated for tracks and artists
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
          <CardTitle>Lead Score Formula</CardTitle>
          <CardDescription>
            Adjust multipliers to change how lead scores are calculated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <Label className="text-sm font-semibold">Current Formula</Label>
            <p className="text-sm text-muted-foreground">
              Lead Score = (Days in Top 10 × {settings.lead_score?.daysTop10Multiplier ?? 15}) + 
              (Days in Top 20 Only × {settings.lead_score?.daysTop20Multiplier ?? 8}) + 
              ((51 - Average Position) × {settings.lead_score?.avgPositionMultiplier ?? 10}) + 
              ((51 - Best Position) × {settings.lead_score?.bestPositionMultiplier ?? 5})
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Days in Top 10 are counted separately from Days in Top 20. The &quot;Days in Top 20 Only&quot; 
              multiplier applies to days ranked 11-20 (excluding top 10 days).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="days-top10">Days in Top 10 Multiplier</Label>
              <Input
                id="days-top10"
                type="number"
                step="0.1"
                value={settings.lead_score?.daysTop10Multiplier ?? 15}
                onChange={(e) =>
                  updateSetting("daysTop10Multiplier", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Points per day a track appears in positions 1-10
              </p>
            </div>

            <div>
              <Label htmlFor="days-top20">Days in Top 20 Only Multiplier</Label>
              <Input
                id="days-top20"
                type="number"
                step="0.1"
                value={settings.lead_score?.daysTop20Multiplier ?? 8}
                onChange={(e) =>
                  updateSetting("daysTop20Multiplier", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Points per day a track appears in positions 11-20 (excluding top 10)
              </p>
            </div>

            <div>
              <Label htmlFor="avg-position">Average Position Multiplier</Label>
              <Input
                id="avg-position"
                type="number"
                step="0.1"
                value={settings.lead_score?.avgPositionMultiplier ?? 10}
                onChange={(e) =>
                  updateSetting("avgPositionMultiplier", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Multiplier for (51 - average position) calculation
              </p>
            </div>

            <div>
              <Label htmlFor="best-position">Best Position Multiplier</Label>
              <Input
                id="best-position"
                type="number"
                step="0.1"
                value={settings.lead_score?.bestPositionMultiplier ?? 5}
                onChange={(e) =>
                  updateSetting("bestPositionMultiplier", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Multiplier for (51 - best position) calculation
              </p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Priority:</strong> Top 10 appearances are weighted most heavily, followed by top 20 appearances, 
              then average position, and finally best position. Lower multipliers will result in lower overall scores.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
