'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AnalystRating {
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  targetPrice: number | null
}

const MOCK_RATINGS: Record<string, AnalystRating> = {
  AAPL: { strongBuy: 18, buy: 12, hold: 8, sell: 2, strongSell: 1, targetPrice: 235.50 },
  NVDA: { strongBuy: 22, buy: 14, hold: 5, sell: 1, strongSell: 0, targetPrice: 185.75 },
  MSFT: { strongBuy: 25, buy: 10, hold: 4, sell: 1, strongSell: 0, targetPrice: 485.00 },
  GOOGL: { strongBuy: 20, buy: 15, hold: 6, sell: 2, strongSell: 0, targetPrice: 195.00 },
  AMZN: { strongBuy: 24, buy: 12, hold: 3, sell: 1, strongSell: 0, targetPrice: 225.00 },
  META: { strongBuy: 28, buy: 8, hold: 4, sell: 0, strongSell: 0, targetPrice: 625.00 },
  TSLA: { strongBuy: 8, buy: 10, hold: 15, sell: 8, strongSell: 5, targetPrice: 280.00 },
  AMD: { strongBuy: 18, buy: 14, hold: 6, sell: 2, strongSell: 0, targetPrice: 180.00 },
}

export function AnalystRatings({ ticker = 'AAPL' }: { ticker: string }) {
  const [ratings, setRatings] = useState<AnalystRating | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')

  const fetchRatings = useCallback(async () => {
    setLoading(true)
    try {
      // Try to fetch from research aggregate API
      const res = await fetch(`/api/research/aggregate?ticker=${ticker}`)
      
      if (res.ok) {
        const data = await res.json()
        
        // Check if we got analyst data
        if (data.analyst_ratings || data.recommendations) {
          const ar = data.analyst_ratings || data.recommendations || {}
          setRatings({
            strongBuy: ar.strongBuy || ar.strong_buy || 0,
            buy: ar.buy || 0,
            hold: ar.hold || 0,
            sell: ar.sell || 0,
            strongSell: ar.strongSell || ar.strong_sell || 0,
            targetPrice: ar.targetPrice || ar.target_price || null,
          })
          setSource(data.source || 'api')
          return
        }
      }

      // Fallback to mock data with some randomization for other tickers
      const base = MOCK_RATINGS[ticker] || MOCK_RATINGS.AAPL
      setRatings({
        ...base,
        strongBuy: base.strongBuy + Math.floor(Math.random() * 4) - 2,
        buy: base.buy + Math.floor(Math.random() * 4) - 2,
      })
      setSource('mock')
    } catch (err) {
      console.error('[AnalystRatings] Error:', err)
      const mock = MOCK_RATINGS[ticker] || MOCK_RATINGS.AAPL
      setRatings(mock)
      setSource('mock')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchRatings()
    const interval = setInterval(fetchRatings, 300000) // Refresh every 5 min
    return () => clearInterval(interval)
  }, [fetchRatings])

  if (loading) {
    return (
      <div className="h-full bg-card border border-border rounded-lg p-3 flex items-center justify-center">
        <div className="animate-spin"><RefreshCw className="w-4 h-4 text-muted-foreground" /></div>
      </div>
    )
  }

  if (!ratings) {
    return (
      <div className="h-full bg-card border border-border rounded-lg p-3 flex items-center justify-center text-xs text-muted-foreground">
        No data available
      </div>
    )
  }

  const total = ratings.strongBuy + ratings.buy + ratings.hold + ratings.sell + ratings.strongSell
  const consensus = total > 0
    ? ratings.strongBuy + ratings.buy > total * 0.6
      ? 'Strong Buy'
      : ratings.strongBuy + ratings.buy > total * 0.4
      ? 'Buy'
      : ratings.hold > total * 0.6
      ? 'Hold'
      : 'Sell'
    : 'N/A'

  return (
    <div className="h-full bg-card border border-border rounded-lg p-3 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-muted-foreground/70" />
          <span className="text-xs font-mono text-muted-foreground/70 uppercase">Analyst Ratings</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0.5">
            {source !== 'mock' ? 'LIVE' : 'DEMO'}
          </Badge>
        </div>
        <button onClick={fetchRatings} className="hover:bg-white/5 p-1 rounded transition-colors">
          <RefreshCw className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
        </button>
      </div>

      {/* Consensus */}
      <div className="mb-4 p-2 bg-white/5 rounded">
        <div className="text-[9px] text-muted-foreground/60 mb-1">Consensus</div>
        <div className="text-lg font-bold text-theme-green">{consensus}</div>
        {ratings.targetPrice && (
          <div className="text-[9px] text-muted-foreground/60 mt-1">Target: ${ratings.targetPrice.toFixed(2)}</div>
        )}
      </div>

      {/* Rating Bars */}
      <div className="space-y-2 flex-1">
        {/* Strong Buy */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-[9px] font-mono text-theme-green font-bold">Strong Buy</div>
          <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
            <div
              className="h-full bg-theme-green/80 transition-all"
              style={{ width: `${(ratings.strongBuy / total) * 100}%` }}
            />
          </div>
          <div className="w-8 text-[9px] text-right font-semibold">{ratings.strongBuy}</div>
        </div>

        {/* Buy */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-[9px] font-mono text-green-400 font-bold">Buy</div>
          <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
            <div
              className="h-full bg-green-400/60 transition-all"
              style={{ width: `${(ratings.buy / total) * 100}%` }}
            />
          </div>
          <div className="w-8 text-[9px] text-right font-semibold">{ratings.buy}</div>
        </div>

        {/* Hold */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-[9px] font-mono text-yellow-500 font-bold">Hold</div>
          <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
            <div
              className="h-full bg-yellow-500/60 transition-all"
              style={{ width: `${(ratings.hold / total) * 100}%` }}
            />
          </div>
          <div className="w-8 text-[9px] text-right font-semibold">{ratings.hold}</div>
        </div>

        {/* Sell */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-[9px] font-mono text-orange-400 font-bold">Sell</div>
          <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
            <div
              className="h-full bg-orange-400/60 transition-all"
              style={{ width: `${(ratings.sell / total) * 100}%` }}
            />
          </div>
          <div className="w-8 text-[9px] text-right font-semibold">{ratings.sell}</div>
        </div>

        {/* Strong Sell */}
        <div className="flex items-center gap-2">
          <div className="w-16 text-[9px] font-mono text-red-400 font-bold">Strong Sell</div>
          <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
            <div
              className="h-full bg-red-400/60 transition-all"
              style={{ width: `${(ratings.strongSell / total) * 100}%` }}
            />
          </div>
          <div className="w-8 text-[9px] text-right font-semibold">{ratings.strongSell}</div>
        </div>
      </div>

      <div className="text-[8px] text-muted-foreground/40 mt-2 pt-2 border-t border-border/10">
        Total: {total} analysts
      </div>
    </div>
  )
}
