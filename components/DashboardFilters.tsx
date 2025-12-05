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
import { AVAILABLE_REGIONS, US_CITIES, OTHER_COUNTRIES } from "@/lib/spotifyCharts"
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
      let targetDate: Date

      switch (quickSelect) {
        case "today":
          targetDate = today
          break
        case "yesterday":
          targetDate = subDays(today, 1)
          break
        case "last7":
          targetDate = subDays(today, 7)
          break
        case "last30":
          targetDate = subDays(today, 30)
          break
        case "thisWeek":
          targetDate = startOfWeek(today)
          break
        case "lastWeek":
          targetDate = startOfWeek(subWeeks(today, 1))
          break
        case "thisMonth":
          targetDate = startOfMonth(today)
          break
        case "lastMonth":
          targetDate = startOfMonth(subMonths(today, 1))
          break
        default:
          return
      }

      // Find the closest available date (prefer dates <= target, otherwise closest after)
      const targetDateStr = format(targetDate, 'yyyy-MM-dd')
      let selectedDateStr: string | null = null

      if (availableDates && availableDates.length > 0) {
        // Sort dates to find the closest one
        const sortedDates = [...availableDates].sort()
        
        // Find the most recent date that's <= target date
        const datesBeforeOrEqual = sortedDates.filter(d => d <= targetDateStr)
        if (datesBeforeOrEqual.length > 0) {
          selectedDateStr = datesBeforeOrEqual[datesBeforeOrEqual.length - 1]
        } else {
          // If no dates before target, use the earliest available date
          selectedDateStr = sortedDates[0]
        }
      } else {
        // Fallback to the calculated date if no available dates
        selectedDateStr = targetDateStr
      }

      if (selectedDateStr) {
        onDateChange(selectedDateStr)
      }
      setQuickSelect("")
    }
  }, [quickSelect, onDateChange, availableDates])

  return (
    <div className="space-y-4">
      {/* Date and Period Row */}
      <div className="flex items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground mb-2 block">Date</Label>
          <Select value={date || undefined} onValueChange={onDateChange}>
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
                <SelectItem value="no-dates" disabled>
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
        <div className="flex gap-4">
          <div className="min-w-[180px]">
            <Label className="text-xs text-muted-foreground mb-2 block">US Cities</Label>
            <Select
              value={
                region === 'us' || (region && US_CITIES.some(c => c.code === region))
                  ? region || 'us'
                  : 'us'
              }
              onValueChange={(value) => {
                onRegionChange(value)
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="United States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                {US_CITIES.map(({ code, name }) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <Label className="text-xs text-muted-foreground mb-2 block">Other Countries</Label>
            <Select
              value={
                region === null || (region && OTHER_COUNTRIES.some(c => c.code === region))
                  ? region === null ? 'global' : region
                  : undefined
              }
              onValueChange={(value) => {
                onRegionChange(value === 'global' ? null : value)
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select country..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="global">Global</SelectItem>
                {OTHER_COUNTRIES.map(({ code, name }) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
