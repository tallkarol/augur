"use client"

import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DatePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  availableDates?: string[]
  className?: string
}

export function DatePicker({ label, value, onChange, availableDates, className }: DatePickerProps) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
          max={availableDates?.[availableDates.length - 1]}
          min={availableDates?.[0]}
        />
        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  )
}

