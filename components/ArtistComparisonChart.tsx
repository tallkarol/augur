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

interface ArtistComparisonData {
  date: string
  [artistName: string]: string | number
}

interface ArtistComparisonChartProps {
  data: ArtistComparisonData[]
  artists: string[]
  title?: string
  height?: number
  metric?: 'position' | 'streams'
}

export function ArtistComparisonChart({
  data,
  artists,
  title,
  height = 400,
  metric = 'position',
}: ArtistComparisonChartProps) {
  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#00ff00',
    '#0088fe',
    '#ff00ff',
    '#00ffff',
  ]

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            reversed={metric === 'position'}
            label={{
              value: metric === 'position' ? 'Position' : 'Streams',
              angle: -90,
              position: 'insideLeft',
            }}
            tickFormatter={
              metric === 'streams'
                ? (value: number) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
                    return value.toString()
                  }
                : undefined
            }
          />
          <Tooltip
            formatter={(value: number) => {
              if (metric === 'position') {
                return `#${value}`
              }
              return value.toLocaleString()
            }}
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
          {artists.map((artist, index) => (
            <Line
              key={artist}
              type="monotone"
              dataKey={artist}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              name={artist}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
