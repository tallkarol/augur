"use client"

import { PositionChart } from "./PositionChart"
import { format } from "date-fns"

interface RegionComparisonChartProps {
  data: Record<string, Array<{ date: string; position: number; streams?: number }>>
  title?: string
  height?: number
  selectedRegions?: string[]
}

export function RegionComparisonChart({ 
  data, 
  title = "Position Comparison Across Regions",
  height = 400,
  selectedRegions
}: RegionComparisonChartProps) {
  // Get all unique dates across all regions
  const allDates = new Set<string>()
  Object.values(data).forEach(regionData => {
    regionData.forEach(entry => {
      allDates.add(entry.date)
    })
  })

  const sortedDates = Array.from(allDates).sort()

  // Merge data by date, filling in missing positions
  const mergedData: Array<{ date: string; position: number; [key: string]: any }> = sortedDates.map(date => {
    const entry: { date: string; position: number; [key: string]: any } = { date, position: 0 }
    
    const regionsToShow = selectedRegions || Object.keys(data)
    regionsToShow.forEach(region => {
      const regionEntry = data[region]?.find(e => e.date === date)
      entry[region] = regionEntry?.position || null
    })
    
    return entry
  })

  // Create series configuration for each region
  const defaultColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#ff00ff', '#00ffff']
  const regionsToShow = selectedRegions || Object.keys(data)
  const series = regionsToShow.map((region, index) => ({
    name: region === 'global' ? 'Global' : region.toUpperCase(),
    dataKey: region,
    color: defaultColors[index % defaultColors.length],
  }))

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <PositionChart
        data={mergedData}
        series={series}
        height={height}
        showTooltip={true}
      />
      {regionsToShow.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No region data available for comparison
        </div>
      )}
    </div>
  )
}
