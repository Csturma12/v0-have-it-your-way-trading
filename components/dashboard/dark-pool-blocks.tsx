'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Layers,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Filter as FilterIcon,
} from 'lucide-react'

interface BlockTrade {
  id: string
  ticker: string
  price: number
  size: number
  value: number
  exchange: string
  timestamp: number
  side: 'buy' | 'sell' | 'unknown'
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

interface DarkPoolBlocksProps {
  ticker: string | null
}

const MIN_VALUE_OPTIONS = [
  { label: '$1M+', value: 1_000_000 },
  { label: '$5M+', value: 5_000_000 },
  { label: '$10M+', value: 10_000_000 },
  { label: '$25M+', value: 25_000_000 },
  { label: '$50M+', value: 50_000_000 },
]

function formatValue(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

function formatSize(size: number): string {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(2)}M`
  if (size >= 1_000) return `${(size / 1_000).toFixed(0)}K`
  return size.toString()
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function DarkPoolBlocks({ ticker }: DarkPoolBlocksProps) {
  const [trades, setTrades] = useState<BlockTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')
  const [minValue, setMinValue] = useState<number>(1_000_000)
  // 'all' = global cross-market feed; 'ticker' = filter to selected ticker only
  const [scope, setScope] = useState<'all' | 'ticker'>(ticker ? 'ticker' : 'all')

  const fetchTrades = async () => {
    setLoading(true)
    try {
      // /api/dark-pool returns recent dark pool prints from Unusual Whales
      // (with mock fallback). When scoped to a ticker we still hit the
      // same endpoint and filter client-side so the UW recent-feed cache
      // can be reused across widgets.
      const url = scope === 'ticker' && ticker
        ? `/api/dark-pool?type=darkpool&ticker=${encodeURIComponent(ticker)}`
        : `/api/dark-pool?type=darkpool`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setTrades(data.trades || [])
        setSource(data.source || 'unknown')
      }
    } catch (err) {
      console.error('[DarkPoolBlocks] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades()
    const interval = setInterval(fetchTrades, 30_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, scope])

  // Auto-flip back to 'all' if user clears ticker
  useEffect(() => {
    if (!ticker && scope === 'ticker') setScope('all')
  }, [ticker, scope])

  const filtered = useMemo(() => {
    return trades
      .filter(t => t.value >= minValue)
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [trades, minValue])

  const totalValue = useMemo(
    () => filtered.reduce((sum, t) => sum + t.value, 0),
    [filtered],
  )

  const isLive = source === 'unusual_whales'

  return (
    <div className="h-full flex flex-col p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide truncate">
            Dark Pool / Blocks
          </span>
          <span
            className={`text-[8px] font-mono px-1 py-0 rounded shrink-0 ${
              isLive
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-500'
            }`}
          >
            {isLive ? 'LIVE' : 'DEMO'}
          </span>
        </div>
        <button
          onClick={fetchTrades}
          className="p-0.5 hover:bg-muted/50 rounded transition-colors"
          title="Refresh"
          aria-label="Refresh dark pool blocks"
        >
          <RefreshCw
            className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {/* Scope toggle (only show when a ticker is selected) */}
        {ticker && (
          <div className="flex items-center bg-muted/30 rounded border border-border/50 p-0.5">
            <button
              onClick={() => setScope('all')}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
                scope === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setScope('ticker')}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
                scope === 'ticker'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {ticker}
            </button>
          </div>
        )}

        {/* Min value filter */}
        <select
          value={minValue}
          onChange={(e) => setMinValue(Number(e.target.value))}
          className="bg-muted/30 border border-border/50 rounded px-1 py-0.5 text-[9px] font-mono text-foreground focus:outline-none focus:border-primary"
          aria-label="Minimum trade value"
        >
          {MIN_VALUE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Total volume pill */}
        <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
          <span className="text-[8px] font-mono text-muted-foreground">VOL</span>
          <span className="text-[10px] font-mono font-bold text-cyan-400">
            {formatValue(totalValue)}
          </span>
        </div>
      </div>

      {/* Trades list */}
      {loading && trades.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground text-[10px]">
          <FilterIcon className="w-4 h-4" />
          <span>No blocks {scope === 'ticker' ? `for ${ticker}` : ''} above filter</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto -mx-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="text-left py-1 px-1 font-normal">Time</th>
                <th className="text-left py-1 px-1 font-normal">Sym</th>
                <th className="text-right py-1 px-1 font-normal">Price</th>
                <th className="text-right py-1 px-1 font-normal">Size</th>
                <th className="text-right py-1 px-1 font-normal">Value</th>
                <th className="text-center py-1 px-1 font-normal">Side</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((trade) => (
                <tr key={trade.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-1 px-1 text-[9px] font-mono text-muted-foreground">
                    {timeAgo(trade.timestamp)}
                  </td>
                  <td className="py-1 px-1 text-[10px] font-mono font-bold text-foreground">
                    {trade.ticker}
                  </td>
                  <td className="py-1 px-1 text-right text-[10px] font-mono text-foreground">
                    {trade.price.toFixed(2)}
                  </td>
                  <td className="py-1 px-1 text-right text-[10px] font-mono text-muted-foreground">
                    {formatSize(trade.size)}
                  </td>
                  <td className="py-1 px-1 text-right">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        trade.value >= 50_000_000
                          ? 'text-purple-400'
                          : trade.value >= 10_000_000
                          ? 'text-cyan-400'
                          : 'text-foreground'
                      }`}
                    >
                      {formatValue(trade.value)}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-center">
                    {trade.side === 'buy' ? (
                      <span
                        className="inline-flex items-center text-[9px] font-mono text-green-400"
                        title="Buy-side print"
                      >
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </span>
                    ) : trade.side === 'sell' ? (
                      <span
                        className="inline-flex items-center text-[9px] font-mono text-red-400"
                        title="Sell-side print"
                      >
                        <ArrowDownRight className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center text-[9px] font-mono text-muted-foreground"
                        title="Side unknown"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {trade.sentiment === 'bullish' && (
                      <TrendingUp
                        className="w-2.5 h-2.5 text-green-400 inline-block ml-0.5"
                        aria-label="Bullish sentiment"
                      />
                    )}
                    {trade.sentiment === 'bearish' && (
                      <TrendingDown
                        className="w-2.5 h-2.5 text-red-400 inline-block ml-0.5"
                        aria-label="Bearish sentiment"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer source line */}
      <div className="mt-1 pt-1 border-t border-border text-[8px] font-mono text-muted-foreground flex items-center justify-between">
        <span>{filtered.length} prints</span>
        <span>
          {isLive ? 'Unusual Whales' : 'Demo data'}
        </span>
      </div>
    </div>
  )
}
