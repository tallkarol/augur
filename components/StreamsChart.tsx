"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format as formatDate } from 'date-fns'

interface StreamsChartProps {
  data: Array<{ date: string; streams: number | string }>
  title?: string
  height?: number
}

export function StreamsChart({ data, title, height = 400 }: StreamsChartProps) {
  const chartData = data.map(d => ({
    ...d,
    streams: typeof d.streams === 'string' ? parseInt(d.streams) : d.streams,
    date: d.date,
  }))

  const formatStreams = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={formatStreams}
            label={{ value: 'Streams', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), 'Streams']}
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
          <Area
            type="monotone"
            dataKey="streams"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorStreams)"
            name="Streams"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
