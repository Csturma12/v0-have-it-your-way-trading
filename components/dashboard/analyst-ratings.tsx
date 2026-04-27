'use client'

import { useEffect, useState } from 'react'
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
  AAPL: {
    strongBuy: 18,
    buy: 12,
    hold: 8,
    sell: 2,
    strongSell: 1,
    targetPrice: 235.50,
  },
  NVDA: {
    strongBuy: 22,
    buy: 14,
    hold: 5,
    sell: 1,
    strongSell: 0,
    targetPrice: 185.75,
  },
}

export function AnalystRatings({ ticker = 'AAPL' }: { ticker: string }) {
  const [ratings, setRatings] = useState<AnalystRating | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      // For now, use mock data as Polygon doesn't provide analyst ratings in free tier
      const mock = MOCK_RATINGS[ticker] || MOCK_RATINGS.AAPL
      setRatings(mock)
    } catch (err) {
      console.error('[AnalystRatings] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [ticker])

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
            DEMO
          </Badge>
        </div>
        <button onClick={fetch} className="hover:bg-white/5 p-1 rounded transition-colors">
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
