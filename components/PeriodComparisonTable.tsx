"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"

interface PeriodComparisonTableProps {
  period1: {
    startDate: string
    endDate: string
    entryCount: number
  }
  period2: {
    startDate: string
    endDate: string
    entryCount: number
  }
  positionChanges: Array<{
    track: { name: string; id: string }
    artist: { name: string; id: string }
    period1Position: number
    period2Position: number
    change: number
    chartType: string
    chartPeriod: string
    region: string | null
  }>
  biggestMovers: Array<{
    track: { name: string; id: string }
    artist: { name: string; id: string }
    period1Position: number
    period2Position: number
    change: number
    chartType: string
    chartPeriod: string
    region: string | null
  }>
  biggestDroppers: Array<{
    track: { name: string; id: string }
    artist: { name: string; id: string }
    period1Position: number
    period2Position: number
    change: number
    chartType: string
    chartPeriod: string
    region: string | null
  }>
  newEntries: Array<{
    track: { name: string; id: string }
    artist: { name: string; id: string }
    position: number
    chartType: string
    chartPeriod: string
    region: string | null
  }>
  exits: Array<{
    track: { name: string; id: string }
    artist: { name: string; id: string }
    position: number
    chartType: string
    chartPeriod: string
    region: string | null
  }>
}

export function PeriodComparisonTable({
  period1,
  period2,
  positionChanges,
  biggestMovers,
  biggestDroppers,
  newEntries,
  exits,
}: PeriodComparisonTableProps) {
  const formatChartLabel = (chartType: string, chartPeriod: string, region: string | null) => {
    const typeLabel = chartType === 'viral' ? 'Viral' : 'Top 50'
    const periodLabel = chartPeriod === 'daily' ? 'Daily' : 'Weekly'
    const regionLabel = region ? region.toUpperCase() : 'Global'
    return `${typeLabel} ${periodLabel} - ${regionLabel}`
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Period 1 Entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{period1.entryCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {period1.startDate} to {period1.endDate}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Period 2 Entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{period2.entryCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {period2.startDate} to {period2.endDate}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New Entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{newEntries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{exits.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Biggest Movers */}
      {biggestMovers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Biggest Movers
            </CardTitle>
            <CardDescription>
              Tracks that moved up the most between periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Chart</TableHead>
                  <TableHead>Period 2 → Period 1</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biggestMovers.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.track.name}</TableCell>
                    <TableCell>{item.artist.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatChartLabel(item.chartType, item.chartPeriod, item.region)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">#{item.period2Position}</span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-semibold text-green-600">#{item.period1Position}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-green-600 font-semibold">
                        <TrendingUp className="h-4 w-4" />
                        +{item.change}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Biggest Droppers */}
      {biggestDroppers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Biggest Droppers
            </CardTitle>
            <CardDescription>
              Tracks that dropped the most between periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Chart</TableHead>
                  <TableHead>Period 2 → Period 1</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biggestDroppers.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.track.name}</TableCell>
                    <TableCell>{item.artist.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatChartLabel(item.chartType, item.chartPeriod, item.region)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">#{item.period2Position}</span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-semibold text-red-600">#{item.period1Position}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-red-600 font-semibold">
                        <TrendingDown className="h-4 w-4" />
                        {item.change}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New Entries */}
      {newEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>New Entries</CardTitle>
            <CardDescription>
              Tracks that appeared in Period 1 but not in Period 2
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Chart</TableHead>
                  <TableHead>Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newEntries.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.track.name}</TableCell>
                    <TableCell>{item.artist.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatChartLabel(item.chartType, item.chartPeriod, item.region)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">#{item.position}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Exits */}
      {exits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exits</CardTitle>
            <CardDescription>
              Tracks that appeared in Period 2 but not in Period 1
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Chart</TableHead>
                  <TableHead>Last Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exits.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.track.name}</TableCell>
                    <TableCell>{item.artist.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatChartLabel(item.chartType, item.chartPeriod, item.region)}
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">#{item.position}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
