'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, TrendingUp, TrendingDown, RefreshCw, Moon, Sunrise } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useWatchlist } from '@/contexts/watchlist-context'

/**
 * Ticker Info — slim header widget.
 *
 * Previously this widget was a 4-tabbed mini-app (Quote / Levels / Metrics /
 * Fund). Those tabs were redundant — the dashboard already has dedicated
 * standalone widgets for Metrics, Fundamentals, Technical Indicators, and
 * the new Levels combo (Key / S&R / GEX). So this widget now shows ONLY:
 *
 *   - Symbol, name, LIVE badge, star (watchlist), refresh
 *   - Big price + change
 *   - Pre/post-market line (when applicable)
 *   - Day's Range bar
 *   - 52-Week Range bar
 *   - Compact 3-cell row: Mkt Cap / Vol / Avg Vol
 *
 * That's it. Drops a lot of vertical space and removes 3 server fetches
 * (technicals, fundamentals, ticker-bundle metrics) that other widgets
 * already make on their own.
 */

interface QuoteData {
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  prevClose: number
  volume: number
  avgVolume: number
  marketCap: number
  high52w: number
  low52w: number
  extendedPrice: number | null
  extendedChange: number | null
  extendedChangePercent: number | null
  extendedSession: 'pre' | 'post' | 'closed' | null
  name: string | null
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

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export function TickerInfo({ ticker }: { ticker: string }) {
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(true)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('unknown')

  const { tickers, addTicker, removeTicker } = useWatchlist()
  const isInWatchlist = tickers.includes(ticker)
  const toggleWatchlist = () => isInWatchlist ? removeTicker(ticker) : addTicker(ticker)

  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true)
    setQuoteError(null)
    try {
      const [quoteRes, fundRes] = await Promise.all([
        fetch(`/api/polygon/quote?ticker=${ticker}`),
        fetch(`/api/polygon/fundamentals?ticker=${ticker}`),
      ])
      if (!quoteRes.ok) throw new Error(`Quote API ${quoteRes.status}`)
      const quoteData = await quoteRes.json()
      const fundData = fundRes.ok ? await fundRes.json() : null
      const q = quoteData?.quote
      if (!q) throw new Error(quoteData?.message || 'No quote data')
      const f = fundData?.fundamentals
      setQuote({
        price: q.price, change: q.change, changePercent: q.changePercent,
        open: q.open, high: q.high, low: q.low, prevClose: q.prevClose,
        volume: q.volume, avgVolume: q.avgVolume,
        marketCap: f?.marketCap ?? q.marketCap,
        high52w: q.high52w, low52w: q.low52w,
        extendedPrice: q.extendedPrice, extendedChange: q.extendedChange,
        extendedChangePercent: q.extendedChangePercent, extendedSession: q.extendedSession,
        name: q.name,
      })
      setSource(quoteData.source || 'polygon')
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Failed to load')
      setQuote(null)
    } finally {
      setQuoteLoading(false)
    }
  }, [ticker])

  // Initial fetch + 30s refresh
  useEffect(() => {
    fetchQuote()
    const id = setInterval(fetchQuote, 30000)
    return () => clearInterval(id)
  }, [fetchQuote])

  const up = quote ? quote.change >= 0 : true
  const extUp = quote && quote.extendedChange != null ? quote.extendedChange >= 0 : true
  const dayRangePct = quote && quote.high > quote.low
    ? ((quote.price - quote.low) / (quote.high - quote.low)) * 100 : 50
  const yearRangePct = quote && quote.high52w > quote.low52w
    ? ((quote.price - quote.low52w) / (quote.high52w - quote.low52w)) * 100 : 50

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
        <button onClick={fetchQuote} className="p-0.5 hover:bg-muted/50 rounded" title="Refresh">
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${quoteLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Header — symbol + price + change */}
      <div className="px-2 pt-2 pb-1 pr-20 flex-shrink-0 border-b border-border/40">
        {quoteLoading && !quote ? (
          <div className="h-7 flex items-center"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
        ) : quoteError ? (
          <div className="text-[9px] text-red-400">{quoteError}</div>
        ) : quote ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold font-mono">{ticker}</span>
              {quote.name && (
                <span className="text-[9px] text-muted-foreground truncate flex-1">{quote.name}</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono">${quote.price.toFixed(2)}</span>
              <div className={`flex items-center gap-0.5 text-[10px] font-mono font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{up ? '+' : ''}{quote.change.toFixed(2)} ({fmtPct(quote.changePercent)})</span>
              </div>
            </div>
            {quote.extendedPrice != null && quote.extendedSession && quote.extendedSession !== 'closed' && (
              <div className="flex items-center gap-1.5 text-[8px] mt-0.5">
                {quote.extendedSession === 'pre'
                  ? <Sunrise className="w-2.5 h-2.5 text-blue-400" />
                  : <Moon className="w-2.5 h-2.5 text-purple-400" />}
                <span className="font-mono text-muted-foreground uppercase">
                  {quote.extendedSession === 'pre' ? 'Pre' : 'After'}
                </span>
                <span className="font-mono font-semibold">${quote.extendedPrice.toFixed(2)}</span>
                <span className={`font-mono ${extUp ? 'text-green-400' : 'text-red-400'}`}>
                  {extUp ? '+' : ''}{quote.extendedChange?.toFixed(2)} ({fmtPct(quote.extendedChangePercent)})
                </span>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Compact body — only Day/52w range bars + Mkt Cap / Vol / Avg Vol */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1.5">
        {quote && (
          <>
            {quote.high > quote.low && (
              <div className="text-[8px]">
                <div className="flex items-center justify-between text-muted-foreground mb-0.5">
                  <span>Day&apos;s Range</span>
                  <span className="font-mono">${fmtNum(quote.low)} – ${fmtNum(quote.high)}</span>
                </div>
                <div className="h-1 bg-muted/40 rounded-full relative overflow-hidden">
                  <div className="absolute h-full bg-gradient-to-r from-red-500/40 via-yellow-500/40 to-green-500/40 w-full" />
                  <div className="absolute h-full w-0.5 bg-foreground" style={{ left: `${Math.max(0, Math.min(100, dayRangePct))}%` }} />
                </div>
              </div>
            )}
            {quote.high52w > quote.low52w && (
              <div className="text-[8px]">
                <div className="flex items-center justify-between text-muted-foreground mb-0.5">
                  <span>52-Week</span>
                  <span className="font-mono">${fmtNum(quote.low52w)} – ${fmtNum(quote.high52w)}</span>
                </div>
                <div className="h-1 bg-muted/40 rounded-full relative overflow-hidden">
                  <div className="absolute h-full bg-gradient-to-r from-red-500/40 via-yellow-500/40 to-green-500/40 w-full" />
                  <div className="absolute h-full w-0.5 bg-foreground" style={{ left: `${Math.max(0, Math.min(100, yearRangePct))}%` }} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-1 text-[8px]">
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Mkt Cap</div>
                <div className="font-mono font-semibold">{fmtCap(quote.marketCap)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Vol</div>
                <div className="font-mono font-semibold">{fmtVol(quote.volume)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Avg Vol</div>
                <div className="font-mono font-semibold">{fmtVol(quote.avgVolume)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
