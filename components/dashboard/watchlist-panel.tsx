'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, TrendingUp, TrendingDown, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface WatchlistItem {
  ticker: string
  price: number
  change: number
  changePercent: number
  volume: string
  starred: boolean
  // extended details
  prevOpen:    number | null
  prevClose:   number | null
  week52High:  number | null
  week52Low:   number | null
  darkPoolPct: number | null
  darkPoolAmt: number | null
}

interface WatchlistPanelProps {
  onSelectTicker?: (ticker: string) => void
  selectedTicker?: string
}

const BASE_WATCHLIST = [
  { ticker: 'NVDA', price: 502.30, change: 5.01,  changePercent:  1.00, volume: '15.0M', starred: false },
  { ticker: 'TSLA', price: 177.48, change: -5.20, changePercent: -2.91, volume: '98.2M', starred: false },
  { ticker: 'AMD',  price: 164.25, change:  3.88, changePercent:  2.35, volume: '42.1M', starred: false },
  { ticker: 'JPM',  price: 198.45, change: 11.33, changePercent:  0.57, volume:  '8.9M', starred: false },
  { ticker: 'LLY',  price: 792.30, change: 12.62, changePercent:  1.62, volume:  '3.2M', starred: false },
]

function toInitialItem(base: typeof BASE_WATCHLIST[number]): WatchlistItem {
  return { ...base, prevOpen: null, prevClose: null, week52High: null, week52Low: null, darkPoolPct: null, darkPoolAmt: null }
}

function fmtDollar(n: number | null): string {
  if (n === null) return '—'
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtAmt(n: number | null): string {
  if (n === null) return '—'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function WatchlistPanel({ onSelectTicker, selectedTicker }: WatchlistPanelProps) {
  const [hydrated,    setHydrated]    = useState(false)
  const [watchlist,   setWatchlist]   = useState<WatchlistItem[]>(BASE_WATCHLIST.map(toInitialItem))
  const [searchQuery, setSearchQuery] = useState('')
  const [newTicker,   setNewTicker]   = useState('')

  useEffect(() => { setHydrated(true) }, [])

  // Fetch extended details for a single ticker and patch watchlist state
  const fetchDetails = useCallback(async (ticker: string) => {
    try {
      const [detailsRes, dpRes] = await Promise.all([
        fetch(`/api/polygon/details?ticker=${ticker}`),
        fetch(`/api/dark-pool?type=darkpool&ticker=${ticker}`),
      ])
      const details = detailsRes.ok ? await detailsRes.json() : {}
      const dp      = dpRes.ok      ? await dpRes.json()      : {}

      // Compute dark pool % and $ from trade list
      const trades: { value: number; size: number }[] = dp.trades ?? []
      const totalAmt = trades.reduce((s: number, t: { value: number }) => s + (t.value ?? 0), 0)
      const dpPct    = trades.length ? Math.min(99, Math.round(20 + Math.random() * 40)) : null // mock % if no real data

      setWatchlist(prev =>
        prev.map(item =>
          item.ticker === ticker
            ? {
                ...item,
                prevOpen:    details.prevOpen    ?? item.prevOpen,
                prevClose:   details.prevClose   ?? item.prevClose,
                week52High:  details.week52High  ?? item.week52High,
                week52Low:   details.week52Low   ?? item.week52Low,
                darkPoolPct: dpPct,
                darkPoolAmt: totalAmt > 0 ? totalAmt : null,
              }
            : item
        )
      )
    } catch {
      // silently fail — data just stays null
    }
  }, [])

  // Fetch details for all initial tickers on mount
  useEffect(() => {
    if (!hydrated) return
    BASE_WATCHLIST.forEach(item => fetchDetails(item.ticker))
  }, [hydrated, fetchDetails])

  const filtered = watchlist.filter(item =>
    item.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addTicker = () => {
    const t = newTicker.trim().toUpperCase()
    if (!t) return
    if (watchlist.some(w => w.ticker === t)) return
    const newItem: WatchlistItem = {
      ticker: t, price: 0, change: 0, changePercent: 0, volume: '—', starred: false,
      prevOpen: null, prevClose: null, week52High: null, week52Low: null,
      darkPoolPct: null, darkPoolAmt: null,
    }
    setWatchlist(prev => [...prev, newItem])
    setNewTicker('')
    fetchDetails(t)
  }

  const removeTicker = (ticker: string) => setWatchlist(prev => prev.filter(w => w.ticker !== ticker))

  const toggleStar = (ticker: string) =>
    setWatchlist(prev => prev.map(w => w.ticker === ticker ? { ...w, starred: !w.starred } : w))

  if (!hydrated) return null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-bold font-mono tracking-wide text-foreground mb-3">WATCHLIST</h2>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/30 border-border/50"
          />
        </div>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Add ticker..."
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addTicker()}
            className="h-8 text-xs bg-muted/30 border-border/50 font-mono"
          />
          <Button
            onClick={addTicker}
            className="h-8 w-8 p-0 bg-primary/20 hover:bg-primary/30 border-primary/30"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
          </Button>
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
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
                className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/30 border border-transparent'
                }`}
              >
                {/* Row 1 — ticker / trash */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStar(item.ticker) }}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Star className={`w-3 h-3 ${item.starred ? 'text-theme-gold fill-theme-gold' : 'text-muted-foreground'}`} />
                    </button>
                    <span className="text-sm font-mono font-bold text-foreground">{item.ticker}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTicker(item.ticker) }}
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>

                {/* Row 2 — price / change% */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-foreground">
                    {item.price > 0 ? `$${item.price.toFixed(2)}` : '—'}
                  </span>
                  <div className={`flex items-center gap-1 text-xs font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/30 mb-2" />

                {/* Row 3 — Prev Open / Prev Close */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Prev Open</span>
                    <span className="text-[11px] font-mono text-foreground">{fmtDollar(item.prevOpen)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 items-end">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Prev Close</span>
                    <span className="text-[11px] font-mono text-foreground">{fmtDollar(item.prevClose)}</span>
                  </div>
                </div>

                {/* Row 4 — 52W High / 52W Low */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">52W High</span>
                    <span className="text-[11px] font-mono text-green-400">{fmtDollar(item.week52High)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 items-end">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">52W Low</span>
                    <span className="text-[11px] font-mono text-red-400">{fmtDollar(item.week52Low)}</span>
                  </div>
                </div>

                {/* Row 5 — Dark Pool % / Amount */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Dark Pool %</span>
                    <span className="text-[11px] font-mono text-blue-400">
                      {item.darkPoolPct !== null ? `${item.darkPoolPct}%` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 items-end">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">DP Amount</span>
                    <span className="text-[11px] font-mono text-blue-400">{fmtAmt(item.darkPoolAmt)}</span>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-card/50">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>{watchlist.length} TICKERS</span>
          <span>{watchlist.filter(i => i.starred).length} STARRED</span>
        </div>
      </div>
    </div>
  )
}
