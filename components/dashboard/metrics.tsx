'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Metrics {
  ivRank: number | null
  ivPercentile: number | null
  darkPoolPremium: number | null
  institutionalBuying: number | null
  institutionalSelling: number | null
  darkPoolVolume: number | null
  darkPoolPercent: number | null
  unusualOptions: number | null
  darkPoolSentiment: 'bullish' | 'bearish' | 'neutral'
}

const MOCK_METRICS: Record<string, Metrics> = {
  AAPL: {
    ivRank: 72,
    ivPercentile: 68,
    darkPoolPremium: 1.24,
    institutionalBuying: 3200000,
    institutionalSelling: 2100000,
    darkPoolVolume: 12500000,
    darkPoolPercent: 28.5,
    unusualOptions: 14,
    darkPoolSentiment: 'bullish',
  },
  NVDA: {
    ivRank: 85,
    ivPercentile: 81,
    darkPoolPremium: 2.15,
    institutionalBuying: 5400000,
    institutionalSelling: 1800000,
    darkPoolVolume: 18200000,
    darkPoolPercent: 34.2,
    unusualOptions: 22,
    darkPoolSentiment: 'bullish',
  },
}

export function Metrics({ ticker = 'AAPL' }: { ticker: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      // For now, use mock data
      const mock = MOCK_METRICS[ticker] || MOCK_METRICS.AAPL
      setMetrics(mock)
    } catch (err) {
      console.error('[Metrics] Error:', err)
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

  if (!metrics) {
    return (
      <div className="h-full bg-card border border-border rounded-lg p-3 flex items-center justify-center text-xs text-muted-foreground">
        No data available
      </div>
    )
  }

  const sentimentColor = metrics.darkPoolSentiment === 'bullish' ? 'text-theme-green' : metrics.darkPoolSentiment === 'bearish' ? 'text-red-400' : 'text-yellow-500'
  const institutionalNetFlow = (metrics.institutionalBuying || 0) - (metrics.institutionalSelling || 0)
  const institutionalNetPercent = metrics.institutionalBuying && metrics.institutionalSelling 
    ? ((institutionalNetFlow / (metrics.institutionalBuying + metrics.institutionalSelling)) * 100).toFixed(1)
    : '0'

  return (
    <div className="h-full bg-card border border-border rounded-lg p-3 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-muted-foreground/70" />
          <span className="text-xs font-mono text-muted-foreground/70 uppercase">Metrics</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0.5">
            DEMO
          </Badge>
        </div>
        <button onClick={fetch} className="hover:bg-white/5 p-1 rounded transition-colors">
          <RefreshCw className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
        </button>
      </div>

      {/* IV Metrics */}
      <div className="space-y-2 mb-3">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Implied Volatility</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">IV Rank</div>
            <div className="text-sm font-semibold">{metrics.ivRank ?? '—'}%</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">IV Percentile</div>
            <div className="text-sm font-semibold">{metrics.ivPercentile ?? '—'}%</div>
          </div>
        </div>
      </div>

      {/* Dark Pool Metrics */}
      <div className="space-y-2 mb-3">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Dark Pool</div>
        <div className="bg-white/5 rounded p-2 mb-1">
          <div className="text-[9px] text-muted-foreground/60">Sentiment</div>
          <div className={`text-sm font-semibold ${sentimentColor}`}>
            {metrics.darkPoolSentiment.charAt(0).toUpperCase() + metrics.darkPoolSentiment.slice(1)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">Premium</div>
            <div className="text-sm font-semibold">{(metrics.darkPoolPremium ?? 0).toFixed(2)}%</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">% of Volume</div>
            <div className="text-sm font-semibold">{(metrics.darkPoolPercent ?? 0).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Institutional Flow */}
      <div className="space-y-2 mb-3">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Institutional</div>
        <div className="bg-white/5 rounded p-2 mb-1">
          <div className="flex justify-between items-center">
            <div className="text-[9px] text-muted-foreground/60">Net Flow</div>
            <div className={`text-sm font-semibold ${institutionalNetFlow > 0 ? 'text-theme-green' : 'text-red-400'}`}>
              {institutionalNetFlow > 0 ? '+' : ''}{(institutionalNetFlow / 1000000).toFixed(1)}M ({institutionalNetPercent}%)
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">Buying</div>
            <div className="text-sm font-semibold text-theme-green">{(metrics.institutionalBuying ? metrics.institutionalBuying / 1000000 : 0).toFixed(1)}M</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">Selling</div>
            <div className="text-sm font-semibold text-red-400">{(metrics.institutionalSelling ? metrics.institutionalSelling / 1000000 : 0).toFixed(1)}M</div>
          </div>
        </div>
      </div>

      {/* Unusual Options */}
      <div className="space-y-2 mt-auto pt-2 border-t border-border/20">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Options Activity</div>
        <div className="bg-white/5 rounded p-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted-foreground/60">Unusual Sweeps</span>
            <span className="font-semibold text-orange-400">{metrics.unusualOptions ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
