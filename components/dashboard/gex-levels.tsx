'use client'

import { useLevels } from '@/hooks/useFlashAlpha'
import { RefreshCw, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react'

interface GexLevelsProps {
  ticker: string | null
}

export function GexLevels({ ticker }: GexLevelsProps) {
  const { data, loading, error, refetch } = useLevels(ticker)

  if (!ticker) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
        Select a ticker
      </div>
    )
  }

  const fmt = (n: number | undefined) => {
    if (n === undefined || n === null) return '—'
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const fmtGex = (n: number | undefined) => {
    if (n === undefined || n === null) return '—'
    const abs = Math.abs(n)
    if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`
    return n.toFixed(0)
  }

  return (
    <div className="h-full flex flex-col p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide">
            GEX LEVELS
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-0.5 hover:bg-muted/50 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-red-400 text-[10px]">
          {error}
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          {/* Call Wall */}
          <div className="flex items-center justify-between p-1.5 rounded bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-[9px] font-mono text-muted-foreground">Call Wall</span>
            </div>
            <span className="text-xs font-mono font-bold text-green-400">
              ${fmt(data.callWall)}
            </span>
          </div>

          {/* Put Wall */}
          <div className="flex items-center justify-between p-1.5 rounded bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-[9px] font-mono text-muted-foreground">Put Wall</span>
            </div>
            <span className="text-xs font-mono font-bold text-red-400">
              ${fmt(data.putWall)}
            </span>
          </div>

          {/* Flip Point */}
          <div className="flex items-center justify-between p-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-yellow-400" />
              <span className="text-[9px] font-mono text-muted-foreground">GEX Flip</span>
            </div>
            <span className="text-xs font-mono font-bold text-yellow-400">
              ${fmt(data.flipPoint)}
            </span>
          </div>

          {/* Max Pain */}
          <div className="flex items-center justify-between p-1.5 rounded bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="text-[9px] font-mono text-muted-foreground">Max Pain</span>
            </div>
            <span className="text-xs font-mono font-bold text-purple-400">
              ${fmt(data.maxPain)}
            </span>
          </div>

          {/* Net GEX */}
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground">Net GEX</span>
              <span className={`text-xs font-mono font-bold ${data.netGex >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.netGex >= 0 ? '+' : ''}{fmtGex(data.netGex)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] font-mono text-muted-foreground">Total GEX</span>
              <span className="text-xs font-mono font-bold text-foreground">
                {fmtGex(data.totalGex)}
              </span>
            </div>
          </div>

          {/* Interpretation */}
          <div className="mt-2 p-1.5 rounded bg-muted/30 text-[8px] font-mono text-muted-foreground">
            {data.netGex > 0 ? (
              <span className="text-green-400">Positive GEX: Dealers hedge by selling into rallies, buying dips. Expect lower volatility.</span>
            ) : (
              <span className="text-red-400">Negative GEX: Dealers hedge same direction as price. Expect higher volatility.</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
