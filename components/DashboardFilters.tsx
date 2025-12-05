"use client"

import { format, subDays, subWeeks, subMonths, startOfWeek, startOfMonth } from 'date-fns'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PeriodSelector, type Period } from "@/components/PeriodSelector"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AVAILABLE_REGIONS } from "@/lib/spotifyCharts"
import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, Globe } from "lucide-react"

interface DashboardFiltersProps {
  date: string
  period: Period
  region: string | null
  availableDates: string[]
  onDateChange: (date: string) => void
  onPeriodChange: (period: Period) => void
  onRegionChange: (region: string | null) => void
}

export function DashboardFilters({
  date,
  period,
  region,
  availableDates,
  onDateChange,
  onPeriodChange,
  onRegionChange,
}: DashboardFiltersProps) {
  const [quickSelect, setQuickSelect] = useState<string>("")

  useEffect(() => {
    if (quickSelect) {
      const today = new Date()
      let selectedDate: Date

      switch (quickSelect) {
        case "today":
          selectedDate = today
          break
        case "yesterday":
          selectedDate = subDays(today, 1)
          break
        case "last7":
          selectedDate = subDays(today, 7)
          break
        case "last30":
          selectedDate = subDays(today, 30)
          break
        case "thisWeek":
          selectedDate = startOfWeek(today)
          break
        case "lastWeek":
          selectedDate = startOfWeek(subWeeks(today, 1))
          break
        case "thisMonth":
          selectedDate = startOfMonth(today)
          break
        case "lastMonth":
          selectedDate = startOfMonth(subMonths(today, 1))
          break
        default:
          return
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      onDateChange(dateStr)
      setQuickSelect("")
    }
  }, [quickSelect, onDateChange])

  return (
    <div className="space-y-4">
      {/* Date and Period Row */}
      <div className="flex items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground mb-2 block">Date</Label>
          <Select value={date} onValueChange={onDateChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a date" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {availableDates && availableDates.length > 0 ? (
                availableDates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {format(new Date(d), 'MMMM d, yyyy')}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value={date || ''} disabled>
                  No dates available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Period</Label>
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </div>
      </div>

      {/* Quick Links and Region Row */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-2 block">Quick Links</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickSelect("today")}
              className="h-8 text-xs"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickSelect("yesterday")}
              className="h-8 text-xs"
            >
              Yesterday
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickSelect("last7")}
              className="h-8 text-xs"
            >
              Last 7 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickSelect("last30")}
              className="h-8 text-xs"
            >
              Last 30 Days
            </Button>
            {period === "weekly" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickSelect("thisWeek")}
                  className="h-8 text-xs"
                >
                  This Week
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickSelect("lastWeek")}
                  className="h-8 text-xs"
                >
                  Last Week
                </Button>
              </>
            )}
            {period === "monthly" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickSelect("thisMonth")}
                  className="h-8 text-xs"
                >
                  This Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickSelect("lastMonth")}
                  className="h-8 text-xs"
                >
                  Last Month
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="min-w-[200px]">
          <Label className="text-xs text-muted-foreground mb-2 block">Region</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={region === null ? "default" : "outline"}
              size="sm"
              onClick={() => onRegionChange(null)}
              className="flex items-center gap-2 h-8 text-xs"
            >
              <Globe className="h-3 w-3" />
              Global
            </Button>
            {Object.entries(AVAILABLE_REGIONS)
              .filter(([code]) => code !== 'global')
              .slice(0, 5)
              .map(([code, info]) => (
                <Button
                  key={code}
                  type="button"
                  variant={region === code ? "default" : "outline"}
                  size="sm"
                  onClick={() => onRegionChange(code)}
                  className="h-8 text-xs"
                >
                  {info.name}
                </Button>
              ))}
            {Object.entries(AVAILABLE_REGIONS).filter(([code]) => code !== 'global').length > 5 && (
              <Select
                value={region || ''}
                onValueChange={(value) => onRegionChange(value === 'global' || !value ? null : value)}
              >
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="More..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AVAILABLE_REGIONS)
                    .filter(([code]) => {
                      const top5Codes = Object.keys(AVAILABLE_REGIONS).filter((c) => c !== 'global').slice(0, 5)
                      return code !== 'global' && !top5Codes.includes(code)
                    })
                    .map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        {info.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
