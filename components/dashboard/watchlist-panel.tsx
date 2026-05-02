'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, TrendingUp, TrendingDown, Star, Trash2, RefreshCw, Link2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PatternWatchlist } from './pattern-watchlist'
import { CompanyProfile } from './company-profile'
import { useWatchlist } from '@/contexts/watchlist-context'

interface WatchlistItem {
  ticker: string
  price: number
  change: number
  changePercent: number
  volume: string
  starred: boolean
  prevOpen:    number | null
  prevClose:   number | null
  week52High:  number | null
  week52Low:   number | null
  darkPoolPct: number | null
  darkPoolAmt: number | null
  extHoursPrice:   number | null
  extHoursChange:  number | null
  extHoursSession: 'pre' | 'post' | null
  // UW enrichment from /api/watchlist-data
  ivRank:        number | null     // 0-100, 1y IV rank
  callPutRatio:  number | null     // call_volume / put_volume
  netPrem:       number | null     // net_call_premium + net_put_premium ($)
  marketTime:    string | null     // 'regular' | 'pre' | 'post' from UW tape
  loading: boolean
}

interface WatchlistPanelProps {
  onSelectTicker?: (ticker: string) => void
  selectedTicker?: string
}

const DEFAULT_TICKERS = ['NVDA', 'TSLA', 'AMD', 'JPM', 'LLY']

function blankItem(ticker: string): WatchlistItem {
  return {
    ticker,
    price: 0, change: 0, changePercent: 0, volume: '—',
    starred: false,
    prevOpen: null, prevClose: null,
    week52High: null, week52Low: null,
    darkPoolPct: null, darkPoolAmt: null,
    extHoursPrice: null, extHoursChange: null, extHoursSession: null,
    ivRank: null, callPutRatio: null, netPrem: null, marketTime: null,
    loading: true,
  }
}

function fmtDollar(n: number | null): string {
  if (n === null || n === 0) return '—'
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtVol(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

function fmtAmt(n: number | null): string {
  if (n === null) return '—'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

// Detect extended hours session based on current ET time
function getExtHoursSession(): 'pre' | 'post' | null {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const h = et.getHours()
  const m = et.getMinutes()
  const totalMinutes = h * 60 + m
  // Pre-market: 4:00 AM – 9:30 AM ET
  if (totalMinutes >= 240 && totalMinutes < 570) return 'pre'
  // After-hours: 4:00 PM – 8:00 PM ET
  if (totalMinutes >= 960 && totalMinutes < 1200) return 'post'
  return null
}

export function WatchlistPanel({ onSelectTicker, selectedTicker }: WatchlistPanelProps) {
  // Use shared watchlist context for tickers (syncs to database automatically)
  const { 
    tickers: contextTickers, 
    addTicker: contextAddTicker, 
    removeTicker: contextRemoveTicker, 
    activeWatchlist,
    watchlists,
    setActiveWatchlist,
    createWatchlist,
    isLoading: contextLoading 
  } = useWatchlist()
  
  const source = activeWatchlist?.source || 'manual'
  const lastSynced = activeWatchlist?.lastSynced || null
  
  const [activeTab, setActiveTab] = useState<'watchlist' | 'patterns' | 'profile'>('watchlist')
  const [hydrated, setHydrated] = useState(false)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [newTicker, setNewTicker] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const refreshInterval = useRef<NodeJS.Timeout | null>(null)

  // AI trade ideas: keyed by ticker, stored as { idea, action, loading }
  const [tradeIdeas, setTradeIdeas] = useState<Record<string, { idea: string; action: 'buy' | 'sell' | 'hold'; loading: boolean }>>({})

  const fetchTradeIdea = useCallback(async (ticker: string) => {
    if (tradeIdeas[ticker] && !tradeIdeas[ticker].loading) return // already loaded
    setTradeIdeas(prev => ({ ...prev, [ticker]: { idea: '', action: 'hold', loading: true } }))
    try {
      const res = await fetch(`/api/trade-ideas/brief?ticker=${ticker}`)
      if (res.ok) {
        const data = await res.json()
        setTradeIdeas(prev => ({ ...prev, [ticker]: { idea: data.idea, action: data.action, loading: false } }))
      } else {
        throw new Error('fetch failed')
      }
    } catch {
      setTradeIdeas(prev => ({ ...prev, [ticker]: { idea: 'No idea available', action: 'hold', loading: false } }))
    }
  }, [tradeIdeas])

  useEffect(() => { setHydrated(true) }, [])

  // Sync local watchlist state with context tickers
  useEffect(() => {
    if (contextLoading) return
    
    setWatchlist(prev => {
      // Keep existing items that are still in context, add new ones
      const newItems: WatchlistItem[] = contextTickers.map(ticker => {
        const existing = prev.find(p => p.ticker === ticker)
        return existing || blankItem(ticker)
      })
      return newItems
    })
  }, [contextTickers, contextLoading])

  // Fetch live quote + details for a single ticker
  const fetchTicker = useCallback(async (ticker: string) => {
    try {
      const [quoteRes, detailsRes] = await Promise.all([
        fetch(`/api/polygon/quote?ticker=${ticker}`),
        fetch(`/api/polygon/details?ticker=${ticker}`),
      ])

      const quote   = quoteRes.ok   ? await quoteRes.json()   : {}
      const details = detailsRes.ok ? await detailsRes.json() : {}

      // Detect extended hours session
      const session = getExtHoursSession()

      // Extended hours: use min/max of day vs prev close as proxy
      // Polygon free tier doesn't stream pre/post — we show last trade vs prevClose
      const extPrice  = session && quote.last ? quote.last : null
      const extChange = extPrice && quote.prevClose ? extPrice - quote.prevClose : null

      setWatchlist(prev =>
        prev.map(item =>
          item.ticker === ticker
            ? {
                ...item,
                price:        quote.last        ?? 0,
                change:       quote.change      ?? 0,
                changePercent: quote.changePct  ?? 0,
                volume:       quote.volume ? fmtVol(quote.volume) : '—',
                prevOpen:     quote.open        ?? details.prevOpen  ?? null,
                prevClose:    quote.prevClose   ?? details.prevClose ?? null,
                week52High:   details.week52High ?? null,
                week52Low:    details.week52Low  ?? null,
                extHoursPrice:   extPrice,
                extHoursChange:  extChange,
                extHoursSession: session,
                loading: false,
              }
            : item
        )
      )
    } catch {
      setWatchlist(prev =>
        prev.map(item => item.ticker === ticker ? { ...item, loading: false } : item)
      )
    }
  }, [])

  // Listen for add-to-watchlist events fired by the chart toolbar
  useEffect(() => {
    const handler = (e: Event) => {
      const ticker = (e as CustomEvent<{ ticker: string }>).detail?.ticker
      if (!ticker) return
      const t = ticker.trim().toUpperCase()
      setWatchlist(prev => {
        if (prev.some(w => w.ticker === t)) return prev
        return [...prev, blankItem(t)]
      })
      fetchTicker(ticker.trim().toUpperCase())
    }
    window.addEventListener('watchlist:add', handler)
    return () => window.removeEventListener('watchlist:add', handler)
  }, [fetchTicker])

  // Batched UW enrichment — single call for ALL tickers at once.
  // /api/watchlist-data returns OHLC + IV rank + call/put ratio + net
  // premium + market session per ticker, throttled server-side to
  // dodge UW's rate limit. We merge the result into watchlist state
  // without disturbing the Polygon-derived fields the UI was already
  // using (price/change/volume/52w/etc).
  const fetchUwEnrichment = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return
    try {
      const res = await fetch(`/api/watchlist-data?tickers=${tickers.join(',')}`)
      if (!res.ok) return
      const json = await res.json()
      const rows: any[] = json.tickers || []
      setWatchlist(prev =>
        prev.map(item => {
          const r = rows.find(x => x.ticker === item.ticker)
          if (!r) return item
          return {
            ...item,
            // Prefer UW numbers when populated — they include
            // pre/post-market activity that Polygon free-tier misses.
            price:        r.price ?? item.price,
            prevOpen:     r.open ?? item.prevOpen,
            prevClose:    r.prevClose ?? item.prevClose,
            volume:       r.totalVolume
                            ? fmtVol(r.totalVolume)
                            : (r.volume ? fmtVol(r.volume) : item.volume),
            ivRank:        r.ivRank,
            callPutRatio:  r.callPutRatio,
            netPrem:       r.netPrem,
            marketTime:    r.marketTime,
            // Recompute change% if we have both UW close + prevClose
            change:        (r.price !== null && r.prevClose)
                             ? r.price - r.prevClose
                             : item.change,
            changePercent: (r.price !== null && r.prevClose)
                             ? ((r.price - r.prevClose) / r.prevClose) * 100
                             : item.changePercent,
          }
        })
      )
    } catch {
      /* silent — Polygon path still populates the row */
    }
  }, [])

  // Fetch all tickers and refresh every 15 seconds
  const refreshAll = useCallback((tickers: string[]) => {
    tickers.forEach(t => fetchTicker(t))
    fetchUwEnrichment(tickers) // single batched call, runs in parallel
    setLastUpdated(new Date())
  }, [fetchTicker, fetchUwEnrichment])

  useEffect(() => {
    if (!hydrated) return
    const tickers = watchlist.map(w => w.ticker)
    refreshAll(tickers)

    refreshInterval.current = setInterval(() => {
      setWatchlist(prev => {
        refreshAll(prev.map(w => w.ticker))
        return prev
      })
    }, 15_000)

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current)
    }
  }, [hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  const addTicker = useCallback(async () => {
    const t = newTicker.trim().toUpperCase()
    if (!t || contextTickers.includes(t)) return
    contextAddTicker(t) // Add to context (auto-saves to DB)
    setNewTicker('')
    await fetchTicker(t)
  }, [newTicker, contextTickers, contextAddTicker, fetchTicker])

  const removeTicker = (ticker: string) => {
    contextRemoveTicker(ticker) // Remove from context (auto-saves to DB)
  }

  const toggleStar = (ticker: string) =>
    setWatchlist(prev => prev.map(w => w.ticker === ticker ? { ...w, starred: !w.starred } : w))

  const filtered = watchlist.filter(item =>
    item.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!hydrated) return null

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 py-1.5 text-[10px] font-mono font-bold tracking-wide transition-colors ${
            activeTab === 'watchlist'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          WATCHLIST
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`flex-1 py-1.5 text-[10px] font-mono font-bold tracking-wide transition-colors ${
            activeTab === 'patterns'
              ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          PATTERNS
        </button>
      </div>

      {/* Pattern Watchlist tab */}
      {activeTab === 'patterns' && (
        <div className="flex-1 overflow-y-auto p-2">
          <PatternWatchlist onSelectTicker={onSelectTicker} />
        </div>
      )}

      {/* Watchlist tab header + inputs */}
      {activeTab === 'watchlist' && (
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-6 text-[10px] bg-muted/30 border-border/50"
            />
          </div>
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Add ticker..."
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && addTicker()}
              className="h-6 text-[10px] bg-muted/30 border-border/50 font-mono pr-7"
            />
            <Button
              onClick={addTicker}
              size="sm"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5 p-0 bg-primary/20 hover:bg-primary/30 border-primary/30"
            >
              <Plus className="w-3 h-3 text-primary" />
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Watchlist Items - only shown on watchlist tab */}
      {activeTab === 'watchlist' && (
      <div className="flex-1 overflow-y-auto">
        <div className="p-1 space-y-0.5">
          {filtered.map((item) => {
            const isPositive = item.change >= 0
            const isSelected = item.ticker === selectedTicker

            return (
              <div
                key={item.ticker}
                role="button"
                tabIndex={0}
                onClick={() => { onSelectTicker?.(item.ticker); fetchTradeIdea(item.ticker) }}
                onKeyDown={(e) => e.key === 'Enter' && (onSelectTicker?.(item.ticker), fetchTradeIdea(item.ticker))}
                className={`w-full text-left p-1.5 rounded transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/30 border border-transparent'
                }`}
              >
                {/* Row 1: star | ticker | price | change% | trash */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(item.ticker) }}
                    className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <Star className={`w-2.5 h-2.5 ${item.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-foreground min-w-[36px]">{item.ticker}</span>
                  <span className="text-[11px] font-mono text-foreground flex-1">
                    {item.loading ? (
                      <span className="text-muted-foreground animate-pulse">...</span>
                    ) : item.price > 0 ? (
                      `$${item.price.toFixed(2)}`
                    ) : '—'}
                  </span>
                  {!item.loading && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      <span>{isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTicker(item.ticker) }}
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-destructive" />
                  </button>
                </div>

                {/* Row 2: extended hours badge - show when marketTime is pre/post OR when extHoursSession is set */}
                {((item.marketTime === 'pre' || item.marketTime === 'post') || 
                  (item.extHoursSession && item.extHoursPrice && item.extHoursPrice > 0)) && (
                  <div className="flex items-center gap-1 mb-0.5 ml-4">
                    <span className={`text-[9px] font-mono px-1 rounded ${
                      (item.marketTime === 'pre' || item.extHoursSession === 'pre')
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {(item.marketTime === 'pre' || item.extHoursSession === 'pre') ? 'PRE' : 'POST'}
                    </span>
                    {item.extHoursPrice && item.extHoursPrice > 0 && (
                      <>
                        <span className="text-[10px] font-mono text-foreground">${item.extHoursPrice.toFixed(2)}</span>
                        {item.extHoursChange !== null && (
                          <span className={`text-[9px] font-mono ${item.extHoursChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.extHoursChange >= 0 ? '+' : ''}{item.extHoursChange.toFixed(2)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Row 3: Open/Close | 52W H/L | Vol */}
                <div className="grid grid-cols-3 gap-1 text-center text-[9px] font-mono">
                  <div>
                    <div className="text-muted-foreground/70 uppercase tracking-wide">Open/Close</div>
                    <div className="text-foreground">{fmtDollar(item.prevOpen)} / {fmtDollar(item.prevClose)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70 uppercase tracking-wide">52W H/L</div>
                    <div>
                      <span className="text-green-400">{fmtDollar(item.week52High)}</span>
                      {' / '}
                      <span className="text-red-400">{fmtDollar(item.week52Low)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70 uppercase tracking-wide">Vol</div>
                    <div className="text-foreground">{item.volume}</div>
                  </div>
                </div>

                {/* Row 4: UW enrichment — IV rank | C/P ratio | Net Premium tilt
                    Only renders when at least one UW field is loaded so
                    rows stay compact for tickers without options chains. */}
                {(item.ivRank !== null || item.callPutRatio !== null || item.netPrem !== null) && (
                  <div className="mt-0.5 grid grid-cols-3 gap-1 text-center text-[9px] font-mono">
                    <div>
                      <div className="text-muted-foreground/70 uppercase tracking-wide">IV Rank</div>
                      <div className={
                        item.ivRank === null ? 'text-muted-foreground' :
                        item.ivRank >= 70 ? 'text-red-400' :       // high vol
                        item.ivRank >= 40 ? 'text-yellow-400' :    // mid vol
                        'text-green-400'                           // low vol
                      }>
                        {item.ivRank !== null ? `${item.ivRank.toFixed(0)}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground/70 uppercase tracking-wide">C/P</div>
                      <div className={
                        item.callPutRatio === null ? 'text-muted-foreground' :
                        item.callPutRatio >= 1.5 ? 'text-green-400' :
                        item.callPutRatio <= 0.6 ? 'text-red-400' :
                        'text-foreground'
                      }>
                        {item.callPutRatio !== null ? item.callPutRatio.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground/70 uppercase tracking-wide">Net Prem</div>
                      <div className={
                        item.netPrem === null ? 'text-muted-foreground' :
                        item.netPrem > 0 ? 'text-green-400' :
                        item.netPrem < 0 ? 'text-red-400' :
                        'text-foreground'
                      }>
                        {item.netPrem !== null ? fmtAmt(item.netPrem) : '—'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 4: AI Trade Idea — shown only when selected or idea loaded */}
                {tradeIdeas[item.ticker] && (
                  <div className="mt-1 flex items-start gap-1 px-0.5">
                    <Sparkles className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 text-primary/70" />
                    {tradeIdeas[item.ticker].loading ? (
                      <span className="text-[9px] text-muted-foreground animate-pulse">Generating idea...</span>
                    ) : (
                      <span className={`text-[9px] leading-tight ${
                        tradeIdeas[item.ticker].action === 'buy'  ? 'text-green-400' :
                        tradeIdeas[item.ticker].action === 'sell' ? 'text-red-400'   :
                        'text-muted-foreground'
                      }`}>
                        <span className="font-mono font-bold uppercase mr-1 text-[8px]">
                          {tradeIdeas[item.ticker].action}
                        </span>
                        {tradeIdeas[item.ticker].idea}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* Quick Trade Ideas removed — now inline under each ticker row */}
      {/* Quick Trade widget removed from watchlist — it's now its own
          dashboard widget that users can add via the Widgets dropdown. */}

      {/* Footer */}
      {activeTab === 'watchlist' && (
      <div className="px-2 py-1 border-t border-border bg-card/50">
        <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>{watchlist.length} tickers</span>
            {source !== 'manual' && (
              <span className="text-cyan-400 bg-cyan-500/10 px-1 rounded">{source}</span>
            )}
            {lastSynced && (
              <span className="text-muted-foreground/70">saved</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/brokers"
              className="flex items-center gap-0.5 hover:text-cyan-400 transition-colors"
              title="Connect TradingView or Webull"
            >
              <Link2 className="w-2.5 h-2.5" />
              <span>Connect</span>
            </Link>
            <button
              onClick={() => refreshAll(watchlist.map(w => w.ticker))}
              className="flex items-center gap-0.5 hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>{lastUpdated ? `${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'refresh'}</span>
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
