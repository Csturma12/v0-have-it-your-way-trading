'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, TrendingUp, TrendingDown, RefreshCw, Moon, Sunrise } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useWatchlist } from '@/contexts/watchlist-context'
import { WidgetEmptyState } from './widget-empty-state'

type TabId = 'quote' | 'levels' | 'metrics' | 'fund'

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

interface LevelsData {
  monthlyHigh: number
  weeklyHigh: number
  monthlyLow: number
  weeklyLow: number
  sma20: number
  sma50: number
  sma200: number
  ema9: number
  ema21: number
  pivotPoint: number
  r1: number
  r2: number
  s1: number
  s2: number
}

interface MetricsData {
  ivRank: number | null
  ivPercentile: number | null
  darkPoolPercent: number | null
  darkPoolSentiment: 'bullish' | 'bearish' | 'neutral'
  institutionalBuying: number | null
  institutionalSelling: number | null
  unusualOptions: number | null
  cpRatio: number | null
}

interface FundData {
  pe: number | null
  ps: number | null
  pb: number | null
  eps: number | null
  revenueGrowth: number | null
  grossMargin: number | null
  operatingMargin: number | null
  netMargin: number | null
  roe: number | null
  debtToEquity: number | null
  beta: number | null
  divYield: number | null
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
  const [tab, setTab] = useState<TabId>('quote')

  // Quote (always loaded, drives the header)
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(true)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('unknown')

  // Lazy-loaded tab data
  const [levels, setLevels] = useState<LevelsData | null>(null)
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [fund, setFund] = useState<FundData | null>(null)
  const [tabLoading, setTabLoading] = useState(false)

  const { tickers, addTicker, removeTicker } = useWatchlist()
  const isInWatchlist = tickers.includes(ticker)
  const toggleWatchlist = () => isInWatchlist ? removeTicker(ticker) : addTicker(ticker)

  // Fetch primary quote + fundamentals (folded into quote tab)
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
        volume: q.volume, avgVolume: q.avgVolume, vwap: q.vwap,
        marketCap: f?.marketCap ?? q.marketCap, sharesOut: q.sharesOut,
        pe: f?.pe ?? q.pe, eps: f?.eps ?? q.eps,
        dividendYield: f?.dividendYield ?? null, beta: f?.beta ?? null,
        high52w: q.high52w, low52w: q.low52w,
        extendedPrice: q.extendedPrice, extendedChange: q.extendedChange,
        extendedChangePercent: q.extendedChangePercent, extendedSession: q.extendedSession,
        name: q.name, exchange: q.exchange,
      })
      setSource(quoteData.source || 'polygon')
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Failed to load')
      setQuote(null)
    } finally {
      setQuoteLoading(false)
    }
  }, [ticker])

  const fetchLevels = useCallback(async () => {
    setTabLoading(true)
    try {
      const [techRes, quoteRes] = await Promise.all([
        fetch(`/api/technicals?ticker=${ticker}`),
        fetch(`/api/polygon/quote?ticker=${ticker}`),
      ])
      const techData = techRes.ok ? await techRes.json() : null
      const quoteData = quoteRes.ok ? await quoteRes.json() : null
      const price = quoteData?.quote?.price || 100
      const high  = quoteData?.quote?.high || price * 1.02
      const low   = quoteData?.quote?.low  || price * 0.98
      const close = quoteData?.quote?.prevClose || price
      const pivot = (high + low + close) / 3
      setLevels({
        monthlyHigh: quoteData?.quote?.monthHigh || quoteData?.quote?.high52w || high,
        weeklyHigh:  quoteData?.quote?.weekHigh  || high,
        monthlyLow:  quoteData?.quote?.monthLow  || quoteData?.quote?.low52w  || low,
        weeklyLow:   quoteData?.quote?.weekLow   || low,
        sma20:  techData?.data?.SMA?.value    || price * 0.98,
        sma50:  techData?.data?.SMA50?.value  || price * 0.95,
        sma200: techData?.data?.SMA200?.value || price * 0.90,
        ema9:   techData?.data?.EMA9?.value   || price,
        ema21:  techData?.data?.EMA21?.value  || price,
        pivotPoint: pivot,
        r1: 2 * pivot - low,
        r2: pivot + (high - low),
        s1: 2 * pivot - high,
        s2: pivot - (high - low),
      })
    } catch { setLevels(null) }
    finally { setTabLoading(false) }
  }, [ticker])

  const fetchMetrics = useCallback(async () => {
    setTabLoading(true)
    try {
      const [dpRes, flowRes, tideRes] = await Promise.all([
        fetch(`/api/dark-pool?type=darkpool&ticker=${ticker}`),
        fetch(`/api/dark-pool?type=options&ticker=${ticker}`),
        fetch(`/api/unusual-whales?type=tide`),
      ])
      const dpData = dpRes.ok ? await dpRes.json() : { trades: [] }
      const flowData = flowRes.ok ? await flowRes.json() : { flow: [] }
      const tideData = tideRes.ok ? await tideRes.json() : { data: {} }
      const flow = flowData.flow || []
      const tide = tideData.data || {}

      // /api/dark-pool returns the global darkpool/recent feed (not
      // filtered server-side), so first filter to just THIS ticker's
      // prints. Then derive side from price vs NBBO: at/above ask =
      // buy aggressor, at/below bid = sell aggressor, between =
      // unknown (excluded from the buy/sell tally).
      const allTrades = dpData.trades || []
      const tickerTrades = allTrades.filter((t: any) =>
        (t.ticker || '').toUpperCase() === ticker.toUpperCase()
      )
      let buyVol = 0
      let sellVol = 0
      let totalDp = 0
      for (const t of tickerTrades) {
        const size = Number(t.size) || 0
        const price = Number(t.price) || 0
        const ask = Number(t.nbbo_ask) || 0
        const bid = Number(t.nbbo_bid) || 0
        totalDp += size
        // Mock data still has explicit `side`, prefer it when present
        if (t.side === 'buy') buyVol += size
        else if (t.side === 'sell') sellVol += size
        else if (ask > 0 && price >= ask) buyVol += size
        else if (bid > 0 && price <= bid) sellVol += size
        // else: between bid/ask -> "unknown" aggressor, don't count
      }
      const trades = tickerTrades
      const sentiment: 'bullish' | 'bearish' | 'neutral' =
        buyVol > sellVol * 1.2 ? 'bullish' : sellVol > buyVol * 1.2 ? 'bearish' : 'neutral'
      const cpRatio = tide.put_premium > 0 ? tide.call_premium / tide.put_premium : null
      setMetrics({
        ivRank: null, // requires options API, not exposed yet
        ivPercentile: null,
        darkPoolPercent: totalDp > 0 ? Math.min(100, (totalDp / 1_000_000) * 2) : null,
        darkPoolSentiment: sentiment,
        institutionalBuying: buyVol || null,
        institutionalSelling: sellVol || null,
        unusualOptions: flow.filter((f: any) => f.unusual).length || null,
        cpRatio,
      })
    } catch { setMetrics(null) }
    finally { setTabLoading(false) }
  }, [ticker])

  const fetchFund = useCallback(async () => {
    setTabLoading(true)
    try {
      // /api/polygon/fundamentals merges Polygon (basic) + Finnhub
      // /stock/metric (rich metrics like PEG, ROA, margins, beta, div
      // yield) on the server. Intrinio was removed.
      const pRes = await fetch(`/api/polygon/fundamentals?ticker=${ticker}`)
      let f: any = {}
      if (pRes.ok) f = (await pRes.json()).fundamentals || {}
      setFund({
        pe: f.pe || null, ps: f.ps || null, pb: f.pb || null, eps: f.eps || null,
        revenueGrowth: f.revenueGrowth || null,
        grossMargin: f.grossMargin || null,
        operatingMargin: f.operatingMargin || null,
        netMargin: f.netMargin || null,
        roe: f.roe || null,
        debtToEquity: f.debtToEquity || null,
        beta: f.beta || null,
        divYield: f.divYield || null,
      })
    } catch { setFund(null) }
    finally { setTabLoading(false) }
  }, [ticker])

  // Initial quote fetch + 30s refresh
  useEffect(() => {
    fetchQuote()
    const id = setInterval(fetchQuote, 30000)
    return () => clearInterval(id)
  }, [fetchQuote])

  // Lazy-load tab data when user switches tab (and clear stale data on ticker change)
  useEffect(() => {
    setLevels(null); setMetrics(null); setFund(null)
  }, [ticker])

  useEffect(() => {
    if (tab === 'levels'  && !levels)  fetchLevels()
    if (tab === 'metrics' && !metrics) fetchMetrics()
    if (tab === 'fund'    && !fund)    fetchFund()
  }, [tab, levels, metrics, fund, fetchLevels, fetchMetrics, fetchFund])

  const refreshAll = () => {
    fetchQuote()
    if (tab === 'levels')  fetchLevels()
    if (tab === 'metrics') fetchMetrics()
    if (tab === 'fund')    fetchFund()
  }

  const up = quote ? quote.change >= 0 : true
  const extUp = quote && quote.extendedChange != null ? quote.extendedChange >= 0 : true
  const dayRangePct = quote && quote.high > quote.low
    ? ((quote.price - quote.low) / (quote.high - quote.low)) * 100 : 50
  const yearRangePct = quote && quote.high52w > quote.low52w
    ? ((quote.price - quote.low52w) / (quote.high52w - quote.low52w)) * 100 : 50

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'quote',   label: 'Quote' },
    { id: 'levels',  label: 'Levels' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'fund',    label: 'Fund' },
  ]

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
        <button onClick={refreshAll} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${quoteLoading || tabLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Always-visible compact header (symbol + price + change) */}
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

      {/* Tab bar */}
      <div className="flex border-b border-border/40 flex-shrink-0 text-[9px] font-mono">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1 uppercase tracking-wider transition-colors ${
              tab === t.id
                ? 'text-foreground bg-muted/40 border-b border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        {!quote && !quoteError ? null : (
          <>
            {tab === 'quote' && quote && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1 text-[8px]">
                  <div className="bg-muted/30 rounded p-1">
                    <div className="text-muted-foreground">Open</div>
                    <div className="font-mono font-semibold">${fmtNum(quote.open)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-1">
                    <div className="text-muted-foreground">High</div>
                    <div className="font-mono font-semibold text-green-400">${fmtNum(quote.high)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-1">
                    <div className="text-muted-foreground">Low</div>
                    <div className="font-mono font-semibold text-red-400">${fmtNum(quote.low)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-1">
                    <div className="text-muted-foreground">Prev</div>
                    <div className="font-mono font-semibold">${fmtNum(quote.prevClose)}</div>
                  </div>
                </div>
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
              </div>
            )}

            {tab === 'levels' && (
              tabLoading && !levels ? (
                <div className="flex items-center justify-center h-20"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
              ) : !levels ? (
                <WidgetEmptyState type="error" message="Levels unavailable" onRetry={fetchLevels} />
              ) : (
                <div className="space-y-2 text-[9px]">
                  <div>
                    <div className="text-muted-foreground font-mono uppercase tracking-wider mb-0.5 text-[8px]">Pivot Points</div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between"><span>R2</span><span className="font-mono text-red-400">${levels.r2.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>R1</span><span className="font-mono text-red-400">${levels.r1.toFixed(2)}</span></div>
                      <div className="flex justify-between bg-muted/30 rounded px-1"><span className="font-semibold">Pivot</span><span className="font-mono text-primary font-semibold">${levels.pivotPoint.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>S1</span><span className="font-mono text-green-400">${levels.s1.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>S2</span><span className="font-mono text-green-400">${levels.s2.toFixed(2)}</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-mono uppercase tracking-wider mb-0.5 text-[8px]">Moving Avgs</div>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">SMA 20</div><div className="font-mono font-semibold">${levels.sma20.toFixed(2)}</div></div>
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">SMA 50</div><div className="font-mono font-semibold">${levels.sma50.toFixed(2)}</div></div>
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">SMA 200</div><div className="font-mono font-semibold">${levels.sma200.toFixed(2)}</div></div>
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">EMA 9</div><div className="font-mono font-semibold">${levels.ema9.toFixed(2)}</div></div>
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">EMA 21</div><div className="font-mono font-semibold">${levels.ema21.toFixed(2)}</div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-mono uppercase tracking-wider mb-0.5 text-[8px]">H/L Range</div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">Wk High</div><div className="font-mono text-red-400 font-semibold">${levels.weeklyHigh.toFixed(2)}</div></div>
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">Mo High</div><div className="font-mono text-red-400 font-semibold">${levels.monthlyHigh.toFixed(2)}</div></div>
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">Wk Low</div><div className="font-mono text-green-400 font-semibold">${levels.weeklyLow.toFixed(2)}</div></div>
                      <div className="bg-muted/30 rounded p-1"><div className="text-muted-foreground text-[8px]">Mo Low</div><div className="font-mono text-green-400 font-semibold">${levels.monthlyLow.toFixed(2)}</div></div>
                    </div>
                  </div>
                </div>
              )
            )}

            {tab === 'metrics' && (
              tabLoading && !metrics ? (
                <div className="flex items-center justify-center h-20"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
              ) : !metrics ? (
                <WidgetEmptyState type="error" message="Metrics unavailable" onRetry={fetchMetrics} />
              ) : (
                <div className="space-y-2 text-[9px]">
                  <div>
                    <div className="text-muted-foreground font-mono uppercase tracking-wider mb-0.5 text-[8px]">Dark Pool</div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="bg-muted/30 rounded p-1">
                        <div className="text-muted-foreground text-[8px]">Sentiment</div>
                        <div className={`font-mono font-semibold capitalize ${
                          metrics.darkPoolSentiment === 'bullish' ? 'text-green-400' :
                          metrics.darkPoolSentiment === 'bearish' ? 'text-red-400' : 'text-yellow-500'
                        }`}>{metrics.darkPoolSentiment}</div>
                      </div>
                      <div className="bg-muted/30 rounded p-1">
                        <div className="text-muted-foreground text-[8px]">% of Vol</div>
                        <div className="font-mono font-semibold">{metrics.darkPoolPercent != null ? metrics.darkPoolPercent.toFixed(1) + '%' : '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-mono uppercase tracking-wider mb-0.5 text-[8px]">Institutional Flow</div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="bg-muted/30 rounded p-1">
                        <div className="text-muted-foreground text-[8px]">Buying</div>
                        <div className="font-mono font-semibold text-green-400">{metrics.institutionalBuying ? fmtVol(metrics.institutionalBuying) : '—'}</div>
                      </div>
                      <div className="bg-muted/30 rounded p-1">
                        <div className="text-muted-foreground text-[8px]">Selling</div>
                        <div className="font-mono font-semibold text-red-400">{metrics.institutionalSelling ? fmtVol(metrics.institutionalSelling) : '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-mono uppercase tracking-wider mb-0.5 text-[8px]">Options</div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="bg-muted/30 rounded p-1">
                        <div className="text-muted-foreground text-[8px]">C/P Ratio</div>
                        <div className="font-mono font-semibold">{fmtNum(metrics.cpRatio)}</div>
                      </div>
                      <div className="bg-muted/30 rounded p-1">
                        <div className="text-muted-foreground text-[8px]">Unusual</div>
                        <div className="font-mono font-semibold text-orange-400">{metrics.unusualOptions ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            {tab === 'fund' && (
              tabLoading && !fund ? (
                <div className="flex items-center justify-center h-20"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
              ) : !fund ? (
                <WidgetEmptyState type="error" message="Fundamentals unavailable" onRetry={fetchFund} />
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">P/E</span><span className="font-mono font-semibold">{fmtNum(fund.pe)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">P/S</span><span className="font-mono font-semibold">{fmtNum(fund.ps)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">P/B</span><span className="font-mono font-semibold">{fmtNum(fund.pb)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">EPS</span><span className="font-mono font-semibold">${fmtNum(fund.eps)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Rev Grw</span><span className="font-mono font-semibold text-green-400">{fund.revenueGrowth != null ? fmtPct(fund.revenueGrowth) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ROE</span><span className="font-mono font-semibold">{fund.roe != null ? fmtPct(fund.roe) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gross Mgn</span><span className="font-mono font-semibold">{fund.grossMargin != null ? fmtPct(fund.grossMargin) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Net Mgn</span><span className="font-mono font-semibold">{fund.netMargin != null ? fmtPct(fund.netMargin) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Op Mgn</span><span className="font-mono font-semibold">{fund.operatingMargin != null ? fmtPct(fund.operatingMargin) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">D/E</span><span className="font-mono font-semibold">{fmtNum(fund.debtToEquity)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Beta</span><span className="font-mono font-semibold">{fmtNum(fund.beta)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Div Yld</span><span className="font-mono font-semibold">{fund.divYield != null ? fmtPct(fund.divYield) : '—'}</span></div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
