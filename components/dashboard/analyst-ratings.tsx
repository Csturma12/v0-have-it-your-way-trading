'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { WidgetEmptyState } from './widget-empty-state'

interface AnalystRating {
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  targetPrice: number | null
  date?: string
}

export function AnalystRatings({ ticker = 'AAPL' }: { ticker: string }) {
  const [ratings, setRatings] = useState<AnalystRating | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('unknown')

  const fetchRatings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // /api/analyst returns Finnhub's recommendation_trends + price targets
      // in the shape { data: { ratings: { strongBuy, buy, hold, sell, strongSell, period, targetMean, targetHigh, targetLow }, priceTarget, consensus } }
      const res = await fetch(`/api/analyst?ticker=${ticker}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const r = json?.data?.ratings
      const totalVotes = r ? (r.strongBuy || 0) + (r.buy || 0) + (r.hold || 0) + (r.sell || 0) + (r.strongSell || 0) : 0

      if (r && totalVotes > 0) {
        // Prefer mean from priceTarget object; fall back to ratings.targetMean
        const target =
          json?.data?.priceTarget?.mean ||
          json?.data?.priceTarget?.high ||
          r.targetMean ||
          r.targetHigh ||
          null
        setRatings({
          strongBuy: r.strongBuy || 0,
          buy: r.buy || 0,
          hold: r.hold || 0,
          sell: r.sell || 0,
          strongSell: r.strongSell || 0,
          targetPrice: target && target > 0 ? target : null,
          date: r.period || new Date().toISOString().split('T')[0],
        })
        setSource(json?.sources?.finnhub ? 'finnhub' : 'api')
      } else {
        setRatings(null)
        setError('No ratings available for ' + ticker)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ratings')
      setRatings(null)
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchRatings()
    const interval = setInterval(fetchRatings, 300000)
    return () => clearInterval(interval)
  }, [fetchRatings])



  const total = ratings ? ratings.strongBuy + ratings.buy + ratings.hold + ratings.sell + ratings.strongSell : 0
  const getWidth = (val: number) => total > 0 ? `${(val / total) * 100}%` : '0%'

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border flex-shrink-0">
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide">Analyst Ratings</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-muted-foreground">{ratings?.date}</span>
          <button onClick={fetchRatings} className="p-0.5 hover:bg-muted/50 rounded">
            <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {loading && !ratings ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <WidgetEmptyState type="error" message={error} onRetry={fetchRatings} />
        ) : !ratings ? (
          <WidgetEmptyState type="no-ticker" />
        ) : (
          <>
            {/* Strong Buy */}
            <div className="flex items-center gap-1.5">
              <span className="w-14 text-[9px] text-muted-foreground">Strong Buy</span>
              <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: getWidth(ratings.strongBuy) }} />
              </div>
              <span className="w-6 text-[10px] font-mono font-bold text-right">{ratings.strongBuy}</span>
            </div>

            {/* Buy */}
            <div className="flex items-center gap-1.5">
              <span className="w-14 text-[9px] text-muted-foreground">Buy</span>
              <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                <div className="h-full bg-green-400/70" style={{ width: getWidth(ratings.buy) }} />
              </div>
              <span className="w-6 text-[10px] font-mono font-bold text-right">{ratings.buy}</span>
            </div>

            {/* Hold */}
            <div className="flex items-center gap-1.5">
              <span className="w-14 text-[9px] text-muted-foreground">Hold</span>
              <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                <div className="h-full bg-yellow-500/70" style={{ width: getWidth(ratings.hold) }} />
              </div>
              <span className="w-6 text-[10px] font-mono font-bold text-right">{ratings.hold}</span>
            </div>

            {/* Sell */}
            {(ratings.sell > 0 || ratings.strongSell > 0) && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-14 text-[9px] text-muted-foreground">Sell</span>
                  <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                    <div className="h-full bg-orange-400/70" style={{ width: getWidth(ratings.sell) }} />
                  </div>
                  <span className="w-6 text-[10px] font-mono font-bold text-right">{ratings.sell}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-14 text-[9px] text-muted-foreground">Strong Sell</span>
                  <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                    <div className="h-full bg-red-500/70" style={{ width: getWidth(ratings.strongSell) }} />
                  </div>
                  <span className="w-6 text-[10px] font-mono font-bold text-right">{ratings.strongSell}</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
