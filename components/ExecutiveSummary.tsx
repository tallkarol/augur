"use client"

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { TrendingUp, Users, Sparkles, ArrowUp, Trophy } from "lucide-react"
import Link from "next/link"

type ViewType = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface DailySummaryProps {
  viewType: 'daily'
  trackedArtistsTotal: number
  trackedArtistsCharting: number
  biggestMover: {
    track: string
    artist: string
    position: number
    change: number
    previousPosition: number
  } | null
  newEntriesCount: number
}

interface AggregateSummaryProps {
  viewType: 'weekly' | 'monthly' | 'yearly'
  trackedArtistsTotal: number
  trackedArtistsCharting: number
  topLeadScore: {
    track: string
    artist: string
    score: number
    breakdown: {
      daysInTop10: number
      daysInTop20: number
      averagePosition: number
      bestPosition: number
      totalDays: number
    }
  } | null
  newOpportunitiesCount: number
}

type ExecutiveSummaryProps = DailySummaryProps | AggregateSummaryProps

export function ExecutiveSummary(props: ExecutiveSummaryProps) {
  const trackedArtistsPercentage = props.trackedArtistsTotal > 0
    ? Math.round((props.trackedArtistsCharting / props.trackedArtistsTotal) * 100)
    : 0

  if (props.viewType === 'daily') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tracked Artists Charting */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Tracked Artists</CardDescription>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{props.trackedArtistsCharting}</div>
              <div className="text-sm text-muted-foreground">/ {props.trackedArtistsTotal}</div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {trackedArtistsPercentage >= 50 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : null}
              <span className="text-xs text-muted-foreground">
                {trackedArtistsPercentage}% charting
              </span>
            </div>
            {props.trackedArtistsTotal > 0 && (
              <Link href="/tracked-artists" className="text-xs text-primary hover:underline mt-2 block">
                View tracked artists →
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Biggest Mover */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Biggest Mover</CardDescription>
              <ArrowUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {props.biggestMover ? (
              <>
                <div className="text-lg font-semibold truncate">{props.biggestMover.track}</div>
                <div className="text-sm text-muted-foreground truncate">{props.biggestMover.artist}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">#{props.biggestMover.previousPosition}</span>
                  <ArrowUp className="h-3 w-3 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">#{props.biggestMover.position}</span>
                  <span className="text-xs text-green-600">(+{props.biggestMover.change})</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* New Entries */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>New Entries</CardDescription>
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{props.newEntriesCount}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Fresh tracks on charts
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Aggregate view (weekly/monthly/yearly)
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Tracked Artists Charting */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>Tracked Artists</CardDescription>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold">{props.trackedArtistsCharting}</div>
            <div className="text-sm text-muted-foreground">/ {props.trackedArtistsTotal}</div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {trackedArtistsPercentage >= 50 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : null}
            <span className="text-xs text-muted-foreground">
              {trackedArtistsPercentage}% charting
            </span>
          </div>
          {props.trackedArtistsTotal > 0 && (
            <Link href="/tracked-artists" className="text-xs text-primary hover:underline mt-2 block">
              View tracked artists →
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Top Lead Score */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>Top Lead Score</CardDescription>
            <Trophy className="h-4 w-4 text-yellow-600" />
          </div>
        </CardHeader>
        <CardContent>
          {props.topLeadScore ? (
            <>
              <div className="text-lg font-semibold truncate">{props.topLeadScore.track}</div>
              <div className="text-sm text-muted-foreground truncate">{props.topLeadScore.artist}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold text-yellow-600">{props.topLeadScore.score}</span>
                <div className="text-xs text-muted-foreground">
                  <div>{props.topLeadScore.breakdown.daysInTop10} days top 10</div>
                  <div>Avg: #{props.topLeadScore.breakdown.averagePosition.toFixed(1)}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      {/* New Opportunities */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>New Opportunities</CardDescription>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{props.newOpportunitiesCount}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Tracks entered during period
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
