"use client"

import { Button } from "@/components/ui/button"
import { Calendar, CalendarDays, CalendarRange } from "lucide-react"
import { cn } from "@/lib/utils"

export type Period = "daily" | "weekly" | "monthly"

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
  className?: string
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        variant={value === "daily" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("daily")}
        className="flex items-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        Daily
      </Button>
      <Button
        variant={value === "weekly" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("weekly")}
        className="flex items-center gap-2"
      >
        <CalendarDays className="h-4 w-4" />
        Weekly
      </Button>
      <Button
        variant={value === "monthly" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("monthly")}
        className="flex items-center gap-2"
      >
        <CalendarRange className="h-4 w-4" />
        Monthly
      </Button>
    </div>
  )
}

