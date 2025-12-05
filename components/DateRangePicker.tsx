"use client"

import { format, subDays, subWeeks, subMonths, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PeriodSelector, type Period } from '@/components/PeriodSelector'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState, useEffect } from 'react'

interface DateRangePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  availableDates?: string[]
  period: Period
  onPeriodChange: (period: Period) => void
  className?: string
}

export function DateRangePicker({ 
  label, 
  value, 
  onChange, 
  availableDates, 
  period,
  onPeriodChange,
  className 
}: DateRangePickerProps) {
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
      onChange(dateStr)
      setQuickSelect("")
    }
  }, [quickSelect, onChange])

  const maxDate = availableDates?.[availableDates.length - 1]
  const minDate = availableDates?.[0]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {label || "Date Selection"}
        </CardTitle>
        <CardDescription>
          Select a date and period to view chart data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label>Date</Label>
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Select a date" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {availableDates && availableDates.length > 0 ? (
                  availableDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {format(new Date(date), 'MMMM d, yyyy')}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={value || ''} disabled>
                    No dates available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Period</Label>
            <div className="mt-2">
              <PeriodSelector value={period} onChange={onPeriodChange} />
            </div>
          </div>
        </div>
        
        <div>
          <Label>Quick Select</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => setQuickSelect("today")}
              className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickSelect("yesterday")}
              className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setQuickSelect("last7")}
              className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setQuickSelect("last30")}
              className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
            >
              Last 30 Days
            </button>
            {period === "weekly" && (
              <>
                <button
                  type="button"
                  onClick={() => setQuickSelect("thisWeek")}
                  className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSelect("lastWeek")}
                  className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
                >
                  Last Week
                </button>
              </>
            )}
            {period === "monthly" && (
              <>
                <button
                  type="button"
                  onClick={() => setQuickSelect("thisMonth")}
                  className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSelect("lastMonth")}
                  className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
                >
                  Last Month
                </button>
              </>
            )}
          </div>
        </div>

        {availableDates && availableDates.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Available range: {format(new Date(minDate || ''), 'MMM d')} - {format(new Date(maxDate || ''), 'MMM d, yyyy')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

