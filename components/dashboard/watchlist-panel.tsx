'use client'

import { useState, useEffect } from 'react'
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
}

interface WatchlistPanelProps {
  onSelectTicker?: (ticker: string) => void
  selectedTicker?: string
}

const INITIAL_WATCHLIST: WatchlistItem[] = [
  { ticker: 'NVDA', price: 502.30, change: 5.01, changePercent: 1.00, volume: '15.0M', starred: false },
  { ticker: 'TSLA', price: 177.48, change: -5.20, changePercent: -2.91, volume: '98.2M', starred: false },
  { ticker: 'AMD', price: 164.25, change: 3.88, changePercent: 2.35, volume: '42.1M', starred: false },
  { ticker: 'JPM', price: 198.45, change: 11.33, changePercent: 0.57, volume: '8.9M', starred: false },
  { ticker: 'LLY', price: 792.30, change: 12.62, changePercent: 1.62, volume: '3.2M', starred: false },
]

export function WatchlistPanel({ onSelectTicker, selectedTicker }: WatchlistPanelProps) {
  const [hydrated, setHydrated] = useState(false)
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST)
  const [searchQuery, setSearchQuery] = useState('')
  const [newTicker, setNewTicker] = useState('')

  useEffect(() => {
    setHydrated(true)
  }, [])

  const filtered = watchlist.filter((item) =>
    item.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addTicker = () => {
    if (!newTicker.trim()) return
    if (watchlist.some((w) => w.ticker === newTicker)) return

    setWatchlist([
      ...watchlist,
      {
        ticker: newTicker,
        price: 100,
        change: 0,
        changePercent: 0,
        volume: '0',
        starred: false,
      },
    ])
    setNewTicker('')
  }

  const removeTicker = (ticker: string) => {
    setWatchlist(watchlist.filter((w) => w.ticker !== ticker))
  }

  const toggleStar = (ticker: string) => {
    setWatchlist(
      watchlist.map((w) =>
        w.ticker === ticker ? { ...w, starred: !w.starred } : w
      )
    )
  }

  if (!hydrated) return null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-bold font-mono tracking-wide text-foreground mb-3">WATCHLIST</h2>

        {/* Search */}
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

        {/* Add Ticker */}
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
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(item.ticker)
                      }}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Star
                        className={`w-3 h-3 ${
                          item.starred ? 'text-theme-gold fill-theme-gold' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                    <span className="text-sm font-mono font-bold text-foreground">{item.ticker}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTicker(item.ticker)
                    }}
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-foreground">
                    ${item.price.toFixed(2)}
                  </span>
                  <div
                    className={`flex items-center gap-1 text-xs font-mono ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Vol: {item.volume}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      isPositive ? 'text-green-400/70' : 'text-red-400/70'
                    }`}
                  >
                    {isPositive ? '+' : ''}{item.change.toFixed(2)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-border bg-card/50">
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>{watchlist.length} TICKERS</span>
          <span>{watchlist.filter((i) => i.starred).length} STARRED</span>
        </div>
      </div>
    </div>
  )
}
