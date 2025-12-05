"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"

interface LeadScoreLeader {
  id: string
  name: string
  artist: string
  leadScore: number
  breakdown: {
    daysInTop10: number
    daysInTop20: number
    averagePosition: number
    bestPosition: number
    totalDays: number
  }
  avgPosition: number
  bestPosition: number
}

interface LeadScoreLeadersCardProps {
  leaders: LeadScoreLeader[]
  onTrackClick?: (trackId: string) => void
}

export function LeadScoreLeadersCard({ leaders, onTrackClick }: LeadScoreLeadersCardProps) {
  if (leaders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <CardTitle>Lead Score Leaders</CardTitle>
          </div>
          <CardDescription>Top performers by composite score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <CardTitle>Lead Score Leaders</CardTitle>
        </div>
        <CardDescription>Top performers by composite score</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaders.slice(0, 10).map((leader, index) => (
            <div
              key={leader.id}
              onClick={() => onTrackClick?.(leader.id)}
              className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                onTrackClick ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{leader.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{leader.artist}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-600">{leader.leadScore}</div>
                  <div className="text-xs text-muted-foreground">Lead Score</div>
                </div>
                <div className="text-right min-w-[80px]">
                  <div className="text-sm font-medium">#{leader.avgPosition.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Avg Position</div>
                </div>
                <div className="text-right min-w-[60px]">
                  <div className="text-xs text-muted-foreground">
                    {leader.breakdown.daysInTop10} top 10
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {leader.breakdown.daysInTop20} top 20
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
