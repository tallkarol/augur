"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface TrendDataPoint {
  name: string
  change: number
  position: number
  previousPosition?: number | null
}

interface TrendChartProps {
  data: TrendDataPoint[]
  title?: string
  height?: number
  limit?: number
}

export function TrendChart({ data, title, height = 400, limit = 20 }: TrendChartProps) {
  // Sort by absolute change and take top N
  const sortedData = [...data]
    .filter((d) => d.change !== null && d.change !== undefined)
    .sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0))
    .slice(0, limit)
    .sort((a, b) => (b.change || 0) - (a.change || 0)) // Sort by change value for display

  const getColor = (change: number | null | undefined) => {
    if (change === null || change === undefined) return '#94a3b8'
    if (change > 0) return '#22c55e' // green for upward movement
    if (change < 0) return '#ef4444' // red for downward movement
    return '#94a3b8' // gray for no change
  }

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            dataKey="name"
            type="category"
            width={150}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => {
              const change = value
              const sign = change > 0 ? '+' : ''
              return `${sign}${change} positions`
            }}
            labelFormatter={(label) => `Track: ${label}`}
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload as TrendDataPoint
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">
                      Position: #{data.position}
                      {data.previousPosition && ` (was #${data.previousPosition})`}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: getColor(data.change) }}>
                      Change: {data.change && data.change > 0 ? '+' : ''}
                      {data.change} positions
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          <Bar dataKey="change" name="Position Change">
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.change)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
