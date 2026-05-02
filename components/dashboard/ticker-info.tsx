'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, RefreshCw, Moon, Sunrise } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useWatchlist } from '@/contexts/watchlist-context'

/**
 * Ticker Info — ultra-compact corner badge.
 *
 * Designed to live in a tiny top-corner cell (~3 rows tall) and still
 * surface every important field. Layout is a single header line plus
 * a 2-row data strip:
 *
 *   Row 1 (header):
 *     [LIVE] AAPL  $198.12  +1.45 (+0.73%)   [pre/after $...] [* refresh]
 *   Row 2 (range bars, side-by-side):
 *     Day  [—————o———] $low–$high     52W  [——o———————] $low–$high
 *   Row 3 (3 mini cells):
 *     Mkt Cap | Vol | Avg Vol
 *
 * No headings, no padding wasted. All font sizes 8–10px except the
 * price (text-xs / 12px) so it stays readable.
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
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toString()
}

function fmtCap(c: number): string {
  if (!c) return '—'
  if (c >= 1e12) return '$' + (c / 1e12).toFixed(2) + 'T'
  if (c >= 1e9) return '$' + (c / 1e9).toFixed(1) + 'B'
  if (c >= 1e6) return '$' + (c / 1e6).toFixed(0) + 'M'
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

  if (quoteLoading && !quote) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (quoteError) {
    return <div className="px-2 py-1 text-[9px] text-red-400">{quoteError}</div>
  }
  if (!quote) return null

  return (
    <div className="h-full w-full flex flex-col px-1.5 py-1 gap-1 overflow-hidden text-[8px] leading-tight">
      {/* Row 1 — single-line header. Symbol + price + change + actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
        <Badge
          variant="outline"
          className={`text-[7px] px-1 py-0 h-3.5 leading-none flex-shrink-0 ${source === 'polygon' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'}`}
        >
          {source === 'polygon' ? 'LIVE' : 'DEFAULT'}
        </Badge>
        <span className="text-[10px] font-bold font-mono flex-shrink-0">{ticker}</span>
        <span className="text-xs font-bold font-mono flex-shrink-0">${quote.price.toFixed(2)}</span>
        <span className={`text-[9px] font-mono font-semibold flex-shrink-0 ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? '+' : ''}{quote.change.toFixed(2)} ({fmtPct(quote.changePercent)})
        </span>
        {/* Pre/post-market — same row, dimmer */}
        {quote.extendedPrice != null && quote.extendedSession && quote.extendedSession !== 'closed' && (
          <span className="flex items-center gap-0.5 text-[8px] font-mono flex-shrink-0 text-muted-foreground">
            {quote.extendedSession === 'pre'
              ? <Sunrise className="w-2 h-2 text-blue-400" />
              : <Moon className="w-2 h-2 text-purple-400" />}
            <span className="uppercase">{quote.extendedSession === 'pre' ? 'pre' : 'aft'}</span>
            <span className="font-semibold text-foreground">${quote.extendedPrice.toFixed(2)}</span>
            <span className={extUp ? 'text-green-400' : 'text-red-400'}>{fmtPct(quote.extendedChangePercent)}</span>
          </span>
        )}
        {/* spacer pushes actions to the right */}
        <span className="flex-1" />
        {quote.name && (
          <span className="text-[8px] text-muted-foreground truncate min-w-0 max-w-[120px]" title={quote.name}>
            {quote.name}
          </span>
        )}
        <button
          onClick={toggleWatchlist}
          className={`p-0.5 rounded transition-colors flex-shrink-0 ${isInWatchlist ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`}
          title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Star className={`w-2.5 h-2.5 ${isInWatchlist ? 'fill-yellow-400' : ''}`} />
        </button>
        <button onClick={fetchQuote} className="p-0.5 hover:bg-muted/50 rounded flex-shrink-0" title="Refresh">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${quoteLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Row 2 — Day range + 52W range, SIDE BY SIDE */}
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        {quote.high > quote.low && (
          <div>
            <div className="flex items-center justify-between text-muted-foreground mb-0.5">
              <span>Day</span>
              <span className="font-mono">${fmtNum(quote.low)}–{fmtNum(quote.high)}</span>
            </div>
            <div className="h-0.5 bg-muted/40 rounded-full relative overflow-hidden">
              <div className="absolute h-full bg-gradient-to-r from-red-500/40 via-yellow-500/40 to-green-500/40 w-full" />
              <div className="absolute h-full w-0.5 bg-foreground" style={{ left: `${Math.max(0, Math.min(100, dayRangePct))}%` }} />
            </div>
          </div>
        )}
        {quote.high52w > quote.low52w && (
          <div>
            <div className="flex items-center justify-between text-muted-foreground mb-0.5">
              <span>52W</span>
              <span className="font-mono">${fmtNum(quote.low52w)}–{fmtNum(quote.high52w)}</span>
            </div>
            <div className="h-0.5 bg-muted/40 rounded-full relative overflow-hidden">
              <div className="absolute h-full bg-gradient-to-r from-red-500/40 via-yellow-500/40 to-green-500/40 w-full" />
              <div className="absolute h-full w-0.5 bg-foreground" style={{ left: `${Math.max(0, Math.min(100, yearRangePct))}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Row 3 — Mkt Cap / Vol / Avg Vol on a single line */}
      <div className="flex items-center gap-2 flex-shrink-0 font-mono">
        <span className="text-muted-foreground">MC</span>
        <span className="font-semibold">{fmtCap(quote.marketCap)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Vol</span>
        <span className="font-semibold">{fmtVol(quote.volume)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Avg</span>
        <span className="font-semibold">{fmtVol(quote.avgVolume)}</span>
      </div>
    </div>
  )
}
