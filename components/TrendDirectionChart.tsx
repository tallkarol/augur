"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"

interface TrendItem {
  id: string
  name: string
  artist: string
  position: number
  change: number | null
}

interface TrendDirectionChartProps {
  trendUp: TrendItem[]
  trendDown: TrendItem[]
  trendStable: TrendItem[]
  onTrackClick?: (trackId: string) => void
}

export function TrendDirectionChart({
  trendUp,
  trendDown,
  trendStable,
  onTrackClick,
}: TrendDirectionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Direction</CardTitle>
        <CardDescription>What&apos;s moving up, down, or staying stable</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="up" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="up" className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4" />
              Up ({trendUp.length})
            </TabsTrigger>
            <TabsTrigger value="down" className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              Down ({trendDown.length})
            </TabsTrigger>
            <TabsTrigger value="stable" className="flex items-center gap-2">
              <Minus className="h-4 w-4" />
              Stable ({trendStable.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="up" className="mt-4">
            {trendUp.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {trendUp.slice(0, 20).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onTrackClick?.(item.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors ${
                      onTrackClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.artist}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className="text-sm text-muted-foreground">#{item.position}</span>
                      {item.change !== null && (
                        <span className="text-xs font-semibold text-green-600">+{item.change}</span>
                      )}
                    </div>
                  </div>
                ))}
                {trendUp.length > 20 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    +{trendUp.length - 20} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tracks moving up
              </div>
            )}
          </TabsContent>

          <TabsContent value="down" className="mt-4">
            {trendDown.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {trendDown.slice(0, 20).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onTrackClick?.(item.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors ${
                      onTrackClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.artist}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className="text-sm text-muted-foreground">#{item.position}</span>
                      {item.change !== null && (
                        <span className="text-xs font-semibold text-red-600">{item.change}</span>
                      )}
                    </div>
                  </div>
                ))}
                {trendDown.length > 20 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    +{trendDown.length - 20} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tracks moving down
              </div>
            )}
          </TabsContent>

          <TabsContent value="stable" className="mt-4">
            {trendStable.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {trendStable.slice(0, 20).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onTrackClick?.(item.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors ${
                      onTrackClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.artist}</div>
                    </div>
                    <div className="ml-2 shrink-0">
                      <span className="text-sm text-muted-foreground">#{item.position}</span>
                    </div>
                  </div>
                ))}
                {trendStable.length > 20 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    +{trendStable.length - 20} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No stable tracks
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
