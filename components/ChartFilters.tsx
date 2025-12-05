"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AVAILABLE_REGIONS } from "@/lib/spotifyCharts"

interface ChartFiltersProps {
  chartType: 'regional' | 'viral'
  chartPeriod: 'daily' | 'weekly' | 'monthly'
  region: string | null
  onChartTypeChange: (value: 'regional' | 'viral') => void
  onChartPeriodChange: (value: 'daily' | 'weekly' | 'monthly') => void
  onRegionChange: (value: string | null) => void
  className?: string
  hideChartType?: boolean
}

export function ChartFilters({
  chartType,
  chartPeriod,
  region,
  onChartTypeChange,
  onChartPeriodChange,
  onRegionChange,
  className = "",
  hideChartType = false,
}: ChartFiltersProps) {
  return (
    <div className={`flex flex-wrap gap-4 ${className}`}>
      {!hideChartType && (
        <div className="flex-1 min-w-[150px]">
          <Label htmlFor="chart-type">Chart Type</Label>
          <Select value={chartType} onValueChange={onChartTypeChange}>
            <SelectTrigger id="chart-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regional">Top 50 (Regional)</SelectItem>
              <SelectItem value="viral">Viral 50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 min-w-[150px]">
        <Label htmlFor="chart-period">Period</Label>
        <Select value={chartPeriod} onValueChange={onChartPeriodChange}>
          <SelectTrigger id="chart-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <Label htmlFor="region">Region</Label>
        <Select 
          value={region || 'global'} 
          onValueChange={(value) => onRegionChange(value === 'global' ? null : value)}
        >
          <SelectTrigger id="region">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global</SelectItem>
            {Object.entries(AVAILABLE_REGIONS)
              .filter(([code]) => code !== 'global')
              .map(([code, info]) => (
                <SelectItem key={code} value={code}>
                  {info.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
