"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface TrendingTableProps {
  data: Array<{
    id: string
    name: string
    artist?: string
    position: number
    change: number | null
    previousPosition?: number | null
  }>
  showArtist?: boolean
}

export function TrendingTable({ data, showArtist = false }: TrendingTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No data available
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Position</TableHead>
          <TableHead>Track</TableHead>
          {showArtist && <TableHead>Artist</TableHead>}
          <TableHead>Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => {
          const change = item.change
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">#{item.position}</TableCell>
              <TableCell className="font-semibold">{item.name}</TableCell>
              {showArtist && <TableCell>{item.artist}</TableCell>}
              <TableCell>
                {change !== null && change !== 0 ? (
                  <div className="flex items-center gap-2">
                    {change > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-semibold">+{change}</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-red-600 font-semibold">{change}</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">New</span>
                  </div>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

