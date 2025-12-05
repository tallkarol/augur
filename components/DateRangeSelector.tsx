"use client"

import { Button } from "@/components/ui/button"
import { format, subDays, startOfYear } from "date-fns"
import { cn } from "@/lib/utils"

export type DateRange = {
  startDate: string
  endDate: string
}

export type DateRangePreset = 'yesterday' | 'lastWeek' | 'last30' | 'last90' | 'thisYear'

interface DateRangeSelectorProps {
  value: DateRangePreset | null
  onChange: (range: DateRange) => void
  onPresetChange?: (preset: DateRangePreset) => void
  className?: string
}

export function DateRangeSelector({ value, onChange, onPresetChange, className }: DateRangeSelectorProps) {
  const today = new Date()
  
  const presets: { key: DateRangePreset; label: string; getRange: () => DateRange }[] = [
    {
      key: 'yesterday',
      label: 'YESTERDAY',
      getRange: () => {
        const date = format(subDays(today, 1), 'yyyy-MM-dd')
        return { startDate: date, endDate: date }
      },
    },
    {
      key: 'lastWeek',
      label: 'LAST WEEK',
      getRange: () => {
        const yesterday = subDays(today, 1)
        const weekAgo = subDays(yesterday, 7)
        return {
          startDate: format(weekAgo, 'yyyy-MM-dd'),
          endDate: format(yesterday, 'yyyy-MM-dd'),
        }
      },
    },
    {
      key: 'last30',
      label: 'LAST 30 DAYS',
      getRange: () => {
        return {
          startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        }
      },
    },
    {
      key: 'last90',
      label: 'LAST 90 DAYS',
      getRange: () => {
        return {
          startDate: format(subDays(today, 90), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        }
      },
    },
    {
      key: 'thisYear',
      label: 'THIS YEAR',
      getRange: () => {
        return {
          startDate: format(startOfYear(today), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        }
      },
    },
  ]

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {presets.map((preset) => (
        <Button
          key={preset.key}
          variant={value === preset.key ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const range = preset.getRange()
            onChange(range)
            onPresetChange?.(preset.key)
          }}
          className="text-xs"
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
