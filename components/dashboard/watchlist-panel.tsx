'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, TrendingUp, TrendingDown, Star, Trash2, RefreshCw, Link2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QuickTradeBox } from './quick-trade-box'
import { QuickTradeIdeas } from './quick-trade-ideas'
import { PatternWatchlist } from './pattern-watchlist'
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
  const [tradingMode, setTradingMode] = useState<'autonomous' | 'manual'>('manual')
  const refreshInterval = useRef<NodeJS.Timeout | null>(null)

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

  // Fetch all tickers and refresh every 15 seconds
  const refreshAll = useCallback((tickers: string[]) => {
    tickers.forEach(t => fetchTicker(t))
    setLastUpdated(new Date())
  }, [fetchTicker])

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
                onClick={() => onSelectTicker?.(item.ticker)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectTicker?.(item.ticker)}
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

                {/* Row 2: extended hours badge */}
                {item.extHoursSession && item.extHoursPrice && item.extHoursPrice > 0 && (
                  <div className="flex items-center gap-1 mb-0.5 ml-4">
                    <span className={`text-[9px] font-mono px-1 rounded ${
                      item.extHoursSession === 'pre'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {item.extHoursSession === 'pre' ? 'PRE' : 'POST'}
                    </span>
                    <span className="text-[10px] font-mono text-foreground">${item.extHoursPrice.toFixed(2)}</span>
                    {item.extHoursChange !== null && (
                      <span className={`text-[9px] font-mono ${item.extHoursChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.extHoursChange >= 0 ? '+' : ''}{item.extHoursChange.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}

                {/* Row 3: Open/Close | 52W H/L | DP %/Amt */}
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
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* Quick Trade Ideas - only shown on watchlist tab */}
      {activeTab === 'watchlist' && (
      <>
      <QuickTradeIdeas
        onSelectIdea={(ticker) => onSelectTicker?.(ticker)}
      />

      {/* Quick Trade */}
      <QuickTradeBox
        selectedTicker={selectedTicker ?? null}
        price={watchlist.find(w => w.ticker === selectedTicker)?.price ?? null}
        mode={tradingMode}
        onModeChange={setTradingMode}
      />

      {/* Footer */}
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
      </>
      )}
    </div>
  )
}
