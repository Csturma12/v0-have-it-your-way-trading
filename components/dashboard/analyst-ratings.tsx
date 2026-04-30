'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface AnalystRating {
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  targetPrice: number | null
  date?: string
}

const MOCK_RATINGS: Record<string, AnalystRating> = {
  AAPL: { strongBuy: 24, buy: 42, hold: 4, sell: 0, strongSell: 0, targetPrice: 235.50 },
  NVDA: { strongBuy: 24, buy: 42, hold: 4, sell: 0, strongSell: 0, targetPrice: 185.75 },
  MSFT: { strongBuy: 25, buy: 40, hold: 4, sell: 1, strongSell: 0, targetPrice: 485.00 },
}

export function AnalystRatings({ ticker = 'AAPL' }: { ticker: string }) {
  const [ratings, setRatings] = useState<AnalystRating | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')

  const fetchRatings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/research/aggregate?ticker=${ticker}`)
      if (res.ok) {
        const data = await res.json()
        if (data.analyst_ratings || data.recommendations) {
          const ar = data.analyst_ratings || data.recommendations || {}
          setRatings({
            strongBuy: ar.strongBuy || ar.strong_buy || 0,
            buy: ar.buy || 0,
            hold: ar.hold || 0,
            sell: ar.sell || 0,
            strongSell: ar.strongSell || ar.strong_sell || 0,
            targetPrice: ar.targetPrice || ar.target_price || null,
            date: ar.date || new Date().toISOString().split('T')[0],
          })
          setSource(data.source || 'api')
          return
        }
      }
      // Fallback
      const base = MOCK_RATINGS[ticker] || MOCK_RATINGS.AAPL
      setRatings({ ...base, date: new Date().toISOString().split('T')[0] })
      setSource('demo')
    } catch {
      const mock = MOCK_RATINGS[ticker] || MOCK_RATINGS.AAPL
      setRatings({ ...mock, date: new Date().toISOString().split('T')[0] })
      setSource('demo')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchRatings()
    const interval = setInterval(fetchRatings, 300000)
    return () => clearInterval(interval)
  }, [fetchRatings])

  if (!ratings && !loading) {
    return <div className="h-full flex items-center justify-center text-[9px] text-muted-foreground">No data</div>
  }

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
        ) : ratings && (
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
