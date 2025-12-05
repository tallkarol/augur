"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format as formatDate } from 'date-fns'

interface PositionChartProps {
  data: Array<{ date: string; position: number; streams?: number; [key: string]: any }>
  title?: string
  series?: Array<{ name: string; dataKey: string; color?: string }>
  height?: number
}

const defaultColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#ff00ff', '#00ffff']

export function PositionChart({ data, title, series, height = 400 }: PositionChartProps) {
  const chartData = data.map(d => ({
    ...d,
    position: d.position,
  }))

  // If series provided, use them; otherwise use default single series
  const chartSeries = series || [{ name: 'Chart Position', dataKey: 'position', color: defaultColors[0] }]

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => {
              try {
                const date = new Date(value)
                return formatDate(date, 'M/d')
              } catch {
                return value
              }
            }}
          />
          <YAxis 
            domain={['dataMin', 'dataMax']}
            reversed
            label={{ value: 'Position', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value: number) => `#${value}`}
            labelFormatter={(value) => {
              try {
                const date = new Date(value)
                return formatDate(date, 'MMM d, yyyy')
              } catch {
                return value
              }
            }}
          />
          <Legend />
          {chartSeries.map((s, index) => (
            <Line 
              key={s.dataKey}
              type="monotone" 
              dataKey={s.dataKey} 
              stroke={s.color || defaultColors[index % defaultColors.length]} 
              strokeWidth={2}
              dot={{ r: 4 }}
              name={s.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

