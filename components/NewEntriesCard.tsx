"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react"

interface NewEntry {
  id: string
  name: string
  artist: string
  position: number
  chartType?: string
  chartPeriod?: string
  region?: string | null
}

interface NewEntriesCardProps {
  entries: NewEntry[]
  onTrackClick?: (trackId: string) => void
}

export function NewEntriesCard({ entries, onTrackClick }: NewEntriesCardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle>New Entries</CardTitle>
          </div>
          <CardDescription>Fresh tracks on charts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No new entries
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group by chart type
  const groupedByChartType = entries.reduce((acc, entry) => {
    const key = entry.chartType || 'unknown'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(entry)
    return acc
  }, {} as Record<string, NewEntry[]>)

  const chartTypeLabels: Record<string, string> = {
    viral: 'Viral 50',
    regional: 'Top 50',
    unknown: 'Other',
  }

  const toggleGroup = (chartType: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [chartType]: !prev[chartType]
    }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>New Entries</CardTitle>
        </div>
        <CardDescription>Fresh tracks on charts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedByChartType).map(([chartType, typeEntries]) => {
            const isExpanded = expandedGroups[chartType]
            const visibleEntries = isExpanded ? typeEntries : typeEntries.slice(0, 5)
            const hasMore = typeEntries.length > 5

            return (
            <div key={chartType}>
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                {chartTypeLabels[chartType] || chartType}
              </div>
              <div className="space-y-2">
                  {visibleEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => onTrackClick?.(entry.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors ${
                      onTrackClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{entry.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{entry.artist}</div>
                    </div>
                    <div className="ml-2 shrink-0">
                      <div className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold">
                        #{entry.position}
                      </div>
                    </div>
                  </div>
                ))}
                  {hasMore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGroup(chartType)}
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show {typeEntries.length - 5} more
                        </>
                      )}
                    </Button>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
