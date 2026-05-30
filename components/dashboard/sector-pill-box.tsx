'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Flame, RefreshCw, Search, Loader, ExternalLink } from 'lucide-react'

type AccentColor = 'green' | 'gold' | 'red' | 'cyan'

interface Ticker {
  symbol: string
  price: number
  change: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  conviction: number
  trending: number
  isHolding?: boolean
}

interface LivePrice {
  price: number
  changePct: number
  extendedPrice?: number
  extendedChangePct?: number
  session: 'pre' | 'post' | 'regular' | 'closed'
}

interface SectorPillBoxProps {
  title: string
  accent: AccentColor
  tickers: Ticker[]
  onSelectTicker?: (ticker: string) => void
}

const accentStyles: Record<AccentColor, {
  border: string; headerBg: string; dot: string; text: string; headerText: string
}> = {
  green: { border: 'border-green-500/30',  headerBg: 'bg-green-500/10',  dot: 'bg-green-400',  text: 'text-green-400',  headerText: 'text-green-400'  },
  gold:  { border: 'border-yellow-500/30', headerBg: 'bg-yellow-500/10', dot: 'bg-yellow-400', text: 'text-yellow-400', headerText: 'text-yellow-400' },
  red:   { border: 'border-red-500/30',    headerBg: 'bg-red-500/10',    dot: 'bg-red-400',    text: 'text-red-400',    headerText: 'text-red-400'    },
  cyan:  { border: 'border-cyan-500/30',   headerBg: 'bg-cyan-500/10',   dot: 'bg-cyan-400',   text: 'text-cyan-400',   headerText: 'text-cyan-400'   },
}

export function SectorPillBox({ title, accent, tickers, onSelectTicker }: SectorPillBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const s = accentStyles[accent]

  // Search for any US stock
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/tickers/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results || [])
      }
    } catch {
      setSearchResults([])
    }
    setIsSearching(false)
  }

  // Search on Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const fetchLivePrices = useCallback(async () => {
    setIsRefreshing(true)
    const symbols = tickers.map(t => t.symbol).join(',')
    try {
      console.log('[v0] SectorPillBox fetching prices for:', symbols)
      const res = await fetch(`/api/polygon/batch-quotes?tickers=${symbols}`)
      if (res.ok) {
        const data = await res.json()
        console.log('[v0] SectorPillBox got data:', { source: data.source, count: Object.keys(data.quotes || {}).length })
        const next: Record<string, LivePrice> = {}
        for (const t of tickers) {
          const q = data.quotes?.[t.symbol]
          if (q) {
            next[t.symbol] = {
              price: q.price,
              changePct: q.changePct,
              extendedPrice: q.extendedPrice,
              extendedChangePct: q.extendedChangePct,
              session: q.session,
            }
          }
        }
        setLivePrices(next)
        setLastUpdated(new Date())
      } else {
        console.error('[v0] SectorPillBox batch-quotes failed:', res.status)
      }
    } catch (err) {
      console.error('[v0] SectorPillBox fetch error:', err)
      // fall back to static prices silently
    }
    setIsRefreshing(false)
  }, [tickers])

  // Fetch prices on mount and refresh every 30s while expanded
  useEffect(() => {
    // Always fetch once on mount to replace stale hardcoded prices
    fetchLivePrices()
    
    if (!isExpanded) return
    // Refresh every 30s only when expanded
    const interval = setInterval(fetchLivePrices, 30_000)
    return () => clearInterval(interval)
  }, [isExpanded, fetchLivePrices])

  const sorted = [...tickers].sort((a, b) => a.trending - b.trending)

  return (
    <div className={`rounded-md border ${s.border} overflow-hidden`}>

      {/* Header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 ${s.headerBg} hover:brightness-110 transition-all`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
          <span className={`text-[11px] font-mono font-bold tracking-widest uppercase truncate ${s.headerText}`}>
            {title}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground ml-1">{tickers.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {isExpanded && (
            <button
              onClick={(e) => { e.stopPropagation(); fetchLivePrices() }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
              title="Refresh prices"
            >
              <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {isExpanded
            ? <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            : <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          }
        </div>
      </button>

      {/* Expanded ticker table — no max-height, expands naturally with scrollable sidebar */}
      {isExpanded && (
        <div className="w-full">
          {/* Search any US stock */}
          <div className="px-2 py-1.5 border-b border-border/20 bg-muted/10">
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="Search any stock..."
                  className="w-full pl-5 pr-2 py-1 text-[10px] font-mono bg-background/50 border border-border/50 rounded focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
                className={`px-2 py-1 text-[9px] font-mono font-bold rounded border transition-colors ${s.headerBg} ${s.border} ${s.headerText} hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isSearching ? <Loader className="w-2.5 h-2.5 animate-spin" /> : 'GO'}
              </button>
            </div>
            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => {
                      onSelectTicker?.(r.symbol)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="w-full flex items-center justify-between px-1.5 py-1 rounded bg-background/50 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-foreground">{r.symbol}</span>
                      <span className="text-[8px] font-mono text-muted-foreground truncate">{r.name}</span>
                    </div>
                    <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/50 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[16px_1fr_58px_44px_36px] gap-x-1.5 px-2 py-1 border-b border-border/20">
            <span className="text-[8px] font-mono text-muted-foreground/50">#</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">Ticker</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 text-right uppercase">Price</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 text-center uppercase">Sig</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 text-right uppercase">Conv</span>
          </div>

          {sorted.map((t) => {
            const live = livePrices[t.symbol]
            // Only show live price — don't fall back to stale mock data
            const hasLiveData = live?.price !== undefined && live.price > 0
            const displayPrice  = hasLiveData ? live.price : null
            const displayChgPct = hasLiveData ? live.changePct : null
            const isPrePost     = live?.session === 'pre' || live?.session === 'post'
            const isPositive    = (displayChgPct ?? 0) >= 0

            const signalColor =
              t.signal === 'BUY'  ? 'text-green-400 bg-green-500/10 border-green-500/30' :
              t.signal === 'SELL' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                                    'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'

            const convColor =
              t.conviction >= 0.90 || t.isHolding ? 'text-cyan-400' :
              t.conviction >= 0.75                  ? 'text-yellow-400' : 'text-orange-400'

            return (
              <button
                key={t.symbol}
                onClick={() => onSelectTicker?.(t.symbol)}
                className={`w-full grid grid-cols-[16px_1fr_58px_44px_36px] gap-x-1.5 px-2 py-1 hover:bg-white/5 transition-colors border-b border-border/10 last:border-b-0 text-left ${t.isHolding ? 'bg-cyan-500/5' : ''}`}
              >
                {/* Rank */}
                <span className="text-[9px] font-mono text-muted-foreground/40 self-center">
                  {t.trending === 1 ? <Flame className="w-2.5 h-2.5 text-orange-400" /> : t.trending}
                </span>

                {/* Symbol + change */}
                <div className="flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono font-bold text-foreground leading-none">{t.symbol}</span>
                    {t.isHolding && (
                      <span className="text-[7px] font-mono font-bold text-cyan-400 bg-cyan-500/15 px-1 rounded">HELD</span>
                    )}
                  </div>
                  {isRefreshing && !live ? (
                    <span className="text-[9px] font-mono text-muted-foreground animate-pulse">loading...</span>
                  ) : displayChgPct === null ? (
                    <span className="text-[9px] font-mono text-muted-foreground animate-pulse">loading...</span>
                  ) : isPrePost && live?.extendedChangePct !== undefined ? (
                    <div className="flex items-center gap-1">
                      <span className={`text-[8px] font-mono px-1 rounded ${live.session === 'pre' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {live.session === 'pre' ? 'PRE' : 'POST'}
                      </span>
                      <span className={`text-[9px] font-mono ${live.extendedChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {live.extendedChangePct >= 0 ? '+' : ''}{live.extendedChangePct.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className={`text-[9px] font-mono leading-none mt-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{displayChgPct.toFixed(2)}%
                    </span>
                  )}
                </div>

                {/* Price */}
                <span className="text-[10px] font-mono text-foreground text-right self-center">
                  {displayPrice === null ? (
                    <span className="text-muted-foreground animate-pulse">...</span>
                  ) : isPrePost && live?.extendedPrice ? (
                    `$${live.extendedPrice.toFixed(2)}`
                  ) : (
                    `$${displayPrice.toFixed(2)}`
                  )}
                </span>

                {/* Signal */}
                <div className="flex items-center justify-center">
                  <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded border flex items-center gap-0.5 ${signalColor}`}>
                    {t.signal === 'BUY'  && <TrendingUp className="w-2 h-2" />}
                    {t.signal === 'SELL' && <TrendingDown className="w-2 h-2" />}
                    {t.signal === 'HOLD' && <Minus className="w-2 h-2" />}
                    {t.signal}
                  </span>
                </div>

                {/* Conviction */}
                <span className={`text-[10px] font-mono font-bold text-right self-center ${convColor}`}>
                  {(t.conviction * 100).toFixed(0)}%
                </span>
              </button>
            )
          })}

          {/* Footer */}
          {lastUpdated && (
            <div className="px-2 py-1 border-t border-border/10 flex items-center justify-between">
              <span className="text-[8px] font-mono text-muted-foreground/40">
                {lastUpdated.toLocaleTimeString()}
              </span>
              {isRefreshing && <RefreshCw className="w-2 h-2 text-muted-foreground animate-spin" />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
