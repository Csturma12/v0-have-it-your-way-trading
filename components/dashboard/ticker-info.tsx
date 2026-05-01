'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, TrendingUp, TrendingDown, RefreshCw, Moon, Sunrise } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useWatchlist } from '@/contexts/watchlist-context'
import { WidgetEmptyState } from './widget-empty-state'

interface TickerData {
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  prevClose: number
  volume: number
  avgVolume: number
  vwap: number | null
  marketCap: number
  sharesOut: number | null
  pe: number | null
  eps: number | null
  dividendYield: number | null
  beta: number | null
  high52w: number
  low52w: number
  extendedPrice: number | null
  extendedChange: number | null
  extendedChangePercent: number | null
  extendedSession: 'pre' | 'post' | 'closed' | null
  name: string | null
  exchange: string | null
}

function fmtVol(v: number): string {
  if (!v) return '—'
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toString()
}

function fmtCap(c: number): string {
  if (!c) return '—'
  if (c >= 1e12) return '$' + (c / 1e12).toFixed(2) + 'T'
  if (c >= 1e9) return '$' + (c / 1e9).toFixed(2) + 'B'
  if (c >= 1e6) return '$' + (c / 1e6).toFixed(1) + 'M'
  return '$' + c.toFixed(0)
}

function fmtNum(n: number | null, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

function fmtPct(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export function TickerInfo({ ticker }: { ticker: string }) {
  const [data, setData] = useState<TickerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('unknown')
  const { tickers, addTicker, removeTicker } = useWatchlist()

  const isInWatchlist = tickers.includes(ticker)

  const toggleWatchlist = () => {
    if (isInWatchlist) removeTicker(ticker)
    else addTicker(ticker)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [quoteRes, fundRes] = await Promise.all([
        fetch(`/api/polygon/quote?ticker=${ticker}`),
        fetch(`/api/polygon/fundamentals?ticker=${ticker}`),
      ])

      if (!quoteRes.ok) throw new Error(`Quote API ${quoteRes.status}`)
      const quoteData = await quoteRes.json()
      const fundData = fundRes.ok ? await fundRes.json() : null

      const q = quoteData?.quote
      if (!q) {
        throw new Error(quoteData?.message || 'No quote data')
      }

      // Fold fundamentals into the quote shape (PE, dividend, beta come from fundamentals)
      const f = fundData?.fundamentals
      setData({
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        open: q.open,
        high: q.high,
        low: q.low,
        prevClose: q.prevClose,
        volume: q.volume,
        avgVolume: q.avgVolume,
        vwap: q.vwap,
        marketCap: f?.marketCap ?? q.marketCap,
        sharesOut: q.sharesOut,
        pe: f?.pe ?? q.pe,
        eps: f?.eps ?? q.eps,
        dividendYield: f?.dividendYield ?? null,
        beta: f?.beta ?? null,
        high52w: q.high52w,
        low52w: q.low52w,
        extendedPrice: q.extendedPrice,
        extendedChange: q.extendedChange,
        extendedChangePercent: q.extendedChangePercent,
        extendedSession: q.extendedSession,
        name: q.name,
        exchange: q.exchange,
      })
      setSource(quoteData.source || 'polygon')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticker data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const up = data ? data.change >= 0 : true
  const extUp = data && data.extendedChange != null ? data.extendedChange >= 0 : true

  // Day's range progress (0..100)
  const dayRangePct = data && data.high > data.low
    ? ((data.price - data.low) / (data.high - data.low)) * 100
    : 50

  // 52w range progress (0..100)
  const yearRangePct = data && data.high52w > data.low52w
    ? ((data.price - data.low52w) / (data.high52w - data.low52w)) * 100
    : 50

  // Volume vs avg
  const volPct = data && data.avgVolume
    ? Math.min(200, (data.volume / data.avgVolume) * 100)
    : 0

  return (
    <div className="h-full overflow-hidden flex flex-col relative">
      {/* Floating actions */}
      <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
        <Badge
          variant="outline"
          className={`text-[8px] px-1 py-0 ${source === 'polygon' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'}`}
        >
          {source === 'polygon' ? 'LIVE' : 'DEFAULT'}
        </Badge>
        <button
          onClick={toggleWatchlist}
          className={`p-0.5 rounded transition-colors ${isInWatchlist ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`}
          title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Star className={`w-3 h-3 ${isInWatchlist ? 'fill-yellow-400' : ''}`} />
        </button>
        <button onClick={fetchData} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 px-2 pt-2 pb-2 overflow-y-auto">
        {loading && !data ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <WidgetEmptyState type="error" message={error} onRetry={fetchData} />
        ) : !data ? (
          <WidgetEmptyState type="no-ticker" />
        ) : (
          <div className="space-y-2">
            {/* Symbol + name */}
            <div className="flex items-baseline gap-2 pr-20">
              <span className="text-sm font-bold font-mono">{ticker}</span>
              {data.name && (
                <span className="text-[9px] text-muted-foreground truncate">
                  {data.name}
                </span>
              )}
              {data.exchange && (
                <span className="text-[8px] text-muted-foreground/60 font-mono ml-auto">
                  {data.exchange}
                </span>
              )}
            </div>

            {/* Price + change */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono">${data.price.toFixed(2)}</span>
              <div className={`flex items-center gap-0.5 text-[11px] font-mono font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>
                  {up ? '+' : ''}{data.change.toFixed(2)} ({fmtPct(data.changePercent)})
                </span>
              </div>
            </div>

            {/* Extended hours line — only when active */}
            {data.extendedPrice != null && data.extendedSession && data.extendedSession !== 'closed' && (
              <div className="flex items-center gap-1.5 text-[9px]">
                {data.extendedSession === 'pre'
                  ? <Sunrise className="w-3 h-3 text-blue-400" />
                  : <Moon className="w-3 h-3 text-purple-400" />}
                <span className="font-mono text-muted-foreground uppercase">
                  {data.extendedSession === 'pre' ? 'Pre-Market' : 'After-Hours'}
                </span>
                <span className="font-mono font-semibold">${data.extendedPrice.toFixed(2)}</span>
                <span className={`font-mono ${extUp ? 'text-green-400' : 'text-red-400'}`}>
                  {extUp ? '+' : ''}{data.extendedChange?.toFixed(2)} ({fmtPct(data.extendedChangePercent)})
                </span>
              </div>
            )}

            {/* OHLC + Prev Close */}
            <div className="grid grid-cols-4 gap-1 text-[8px]">
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Open</div>
                <div className="font-mono font-semibold">${fmtNum(data.open)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">High</div>
                <div className="font-mono font-semibold text-green-400">${fmtNum(data.high)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Low</div>
                <div className="font-mono font-semibold text-red-400">${fmtNum(data.low)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Prev Close</div>
                <div className="font-mono font-semibold">${fmtNum(data.prevClose)}</div>
              </div>
            </div>

            {/* Day's Range Bar */}
            {data.high > data.low && (
              <div className="text-[8px]">
                <div className="flex items-center justify-between text-muted-foreground mb-0.5">
                  <span>Day&apos;s Range</span>
                  <span className="font-mono">${fmtNum(data.low)} – ${fmtNum(data.high)}</span>
                </div>
                <div className="h-1 bg-muted/40 rounded-full relative overflow-hidden">
                  <div className="absolute h-full bg-gradient-to-r from-red-500/40 via-yellow-500/40 to-green-500/40 w-full" />
                  <div
                    className="absolute h-full w-0.5 bg-foreground"
                    style={{ left: `${Math.max(0, Math.min(100, dayRangePct))}%` }}
                  />
                </div>
              </div>
            )}

            {/* 52-Week Range Bar */}
            {data.high52w > data.low52w && (
              <div className="text-[8px]">
                <div className="flex items-center justify-between text-muted-foreground mb-0.5">
                  <span>52-Week Range</span>
                  <span className="font-mono">${fmtNum(data.low52w)} – ${fmtNum(data.high52w)}</span>
                </div>
                <div className="h-1 bg-muted/40 rounded-full relative overflow-hidden">
                  <div className="absolute h-full bg-gradient-to-r from-red-500/40 via-yellow-500/40 to-green-500/40 w-full" />
                  <div
                    className="absolute h-full w-0.5 bg-foreground"
                    style={{ left: `${Math.max(0, Math.min(100, yearRangePct))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Volume Section */}
            <div className="grid grid-cols-2 gap-1 text-[8px]">
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Volume</div>
                <div className="font-mono font-semibold">{fmtVol(data.volume)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Avg (30D)</div>
                <div className="font-mono font-semibold">{fmtVol(data.avgVolume)}</div>
              </div>
            </div>

            {/* Volume vs Average bar */}
            {data.avgVolume > 0 && (
              <div className="text-[8px]">
                <div className="flex items-center justify-between text-muted-foreground mb-0.5">
                  <span>Vol vs Avg</span>
                  <span className={`font-mono font-semibold ${volPct >= 100 ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {volPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${volPct >= 100 ? 'bg-green-500/70' : 'bg-yellow-500/60'}`}
                    style={{ width: `${Math.min(100, volPct / 2)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Valuation Grid */}
            <div className="grid grid-cols-3 gap-1 text-[8px]">
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Mkt Cap</div>
                <div className="font-mono font-semibold">{fmtCap(data.marketCap)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">P/E</div>
                <div className="font-mono font-semibold">{fmtNum(data.pe)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">EPS</div>
                <div className="font-mono font-semibold">{fmtNum(data.eps)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Beta</div>
                <div className="font-mono font-semibold">{fmtNum(data.beta)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Div Yield</div>
                <div className="font-mono font-semibold">
                  {data.dividendYield != null ? fmtPct(data.dividendYield * 100) : '—'}
                </div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Shares</div>
                <div className="font-mono font-semibold">{data.sharesOut ? fmtVol(data.sharesOut) : '—'}</div>
              </div>
            </div>

            {/* VWAP if intraday */}
            {data.vwap != null && (
              <div className="flex items-center justify-between text-[8px] pt-1 border-t border-border/40">
                <span className="text-muted-foreground">VWAP</span>
                <span className="font-mono font-semibold">${fmtNum(data.vwap)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
