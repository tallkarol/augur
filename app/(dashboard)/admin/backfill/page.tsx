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
import { DateRangePicker } from "@/components/DateRangePicker"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

interface ChartConfig {
  id: string
  name: string
  chartType: string
  chartPeriod: string
  region: string | null
}

interface BackfillResult {
  totalDates: number
  processedDates: number
  successfulDates: string[]
  failedDates: { date: string; error: string }[]
  summary: {
    artistsCreated: number
    artistsUpdated: number
    tracksCreated: number
    tracksUpdated: number
    entriesCreated: number
    entriesUpdated: number
  }
}

export default function BackfillPage() {
  const [configs, setConfigs] = useState<ChartConfig[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [result, setResult] = useState<BackfillResult | null>(null)

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
    }
  }

  async function handleBackfill() {
    if (!selectedConfigId || !startDate || !endDate) {
      alert("Please select a configuration and date range")
      return
    }

    setBackfilling(true)
    setResult(null)

    try {
      const res = await fetch("/api/charts/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId: selectedConfigId,
          startDate,
          endDate,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data.results)
        alert(`Backfill completed! Processed ${data.results.processedDates}/${data.results.totalDates} dates`)
      } else {
        alert(data.error || "Backfill failed")
      }
    } catch (error) {
      alert("Backfill failed")
      console.error(error)
    } finally {
      setBackfilling(false)
    }
  }

  const selectedConfig = configs.find((c) => c.id === selectedConfigId)

  return (
    <div>
      <div className="mb-8">
        <Typography variant="h1">Backfill Chart Data</Typography>
        <Typography variant="subtitle" className="mt-2">
          Fetch historical chart data for a date range
        </Typography>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Backfill Configuration</CardTitle>
          <CardDescription>
            Select a chart configuration and date range to backfill
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="config">Chart Configuration</Label>
            <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
              <SelectTrigger>
                <SelectValue placeholder="Select configuration" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.name} ({config.chartType} • {config.chartPeriod} • {config.region || "global"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedConfig && (
            <>
              <div>
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="startDate" className="text-sm text-muted-foreground">
                      Start Date
                    </Label>
                    <input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-sm text-muted-foreground">
                      End Date
                    </Label>
                    <input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleBackfill}
                disabled={backfilling || !startDate || !endDate}
                className="w-full"
              >
                {backfilling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Backfilling...
                  </>
                ) : (
                  "Start Backfill"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Backfill Results</CardTitle>
            <CardDescription>
              Processed {result.processedDates} of {result.totalDates} dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Artists Created</div>
                  <div className="text-2xl font-bold">{result.summary.artistsCreated}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tracks Created</div>
                  <div className="text-2xl font-bold">{result.summary.tracksCreated}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Entries Created</div>
                  <div className="text-2xl font-bold">{result.summary.entriesCreated}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Artists Updated</div>
                  <div className="text-2xl font-bold">{result.summary.artistsUpdated}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tracks Updated</div>
                  <div className="text-2xl font-bold">{result.summary.tracksUpdated}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Entries Updated</div>
                  <div className="text-2xl font-bold">{result.summary.entriesUpdated}</div>
                </div>
              </div>

              {result.failedDates.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2 text-red-600">
                    Failed Dates ({result.failedDates.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {result.failedDates.map((failed, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {failed.date}: {failed.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.successfulDates.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2 text-green-600">
                    Successful Dates ({result.successfulDates.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto text-sm text-muted-foreground">
                    {result.successfulDates.join(", ")}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
