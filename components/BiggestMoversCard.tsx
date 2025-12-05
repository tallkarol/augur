"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ArrowUp } from "lucide-react"

interface BiggestMover {
  id: string
  name: string
  artist: string
  position: number
  previousPosition: number | null
  change: number | null
}

interface BiggestMoversCardProps {
  movers: BiggestMover[]
  onTrackClick?: (trackId: string) => void
}

export function BiggestMoversCard({ movers, onTrackClick }: BiggestMoversCardProps) {
  if (movers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle>Biggest Movers</CardTitle>
          </div>
          <CardDescription>Fastest climbing tracks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No movers data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <CardTitle>Biggest Movers</CardTitle>
        </div>
        <CardDescription>Fastest climbing tracks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {movers.slice(0, 10).map((mover, index) => (
            <div
              key={mover.id}
              onClick={() => onTrackClick?.(mover.id)}
              className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                onTrackClick ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{mover.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{mover.artist}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {mover.previousPosition && (
                  <>
                    <span className="text-sm text-muted-foreground">#{mover.previousPosition}</span>
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  </>
                )}
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">#{mover.position}</div>
                  {mover.change !== null && (
                    <div className="text-xs text-green-600">+{mover.change}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
