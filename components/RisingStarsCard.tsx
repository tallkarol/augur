"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface RisingStar {
  id: string
  name: string
  artist: string
  avgPosition: number
  bestPosition: number
  leadScore?: number
}

interface RisingStarsCardProps {
  stars: RisingStar[]
  onTrackClick?: (trackId: string) => void
}

export function RisingStarsCard({ stars, onTrackClick }: RisingStarsCardProps) {
  if (stars.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle>Rising Stars</CardTitle>
          </div>
          <CardDescription>Tracks with consistent upward trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No rising stars found
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
          <CardTitle>Rising Stars</CardTitle>
        </div>
        <CardDescription>Tracks with consistent upward trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stars.slice(0, 5).map((star, index) => (
            <div
              key={star.id}
              onClick={() => onTrackClick?.(star.id)}
              className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                onTrackClick ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{star.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{star.artist}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {star.leadScore !== undefined && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{star.leadScore.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Lead Score</div>
                  </div>
                )}
                <div className="text-right min-w-[80px]">
                  <div className="text-sm font-medium">#{star.avgPosition.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Avg Position</div>
                </div>
                <div className="text-right min-w-[60px]">
                  <div className="text-sm font-medium text-green-600">#{star.bestPosition}</div>
                  <div className="text-xs text-muted-foreground">Best</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
