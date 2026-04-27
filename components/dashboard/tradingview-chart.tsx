'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, BookmarkPlus, BookmarkCheck } from 'lucide-react'

interface ChartProps {
  ticker: string
  onChangeTicker?: (ticker: string) => void
}

declare global {
  interface Window {
    TradingView?: any
  }
}

export function TradingViewChart({ ticker, onChangeTicker }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tickerInput, setTickerInput] = useState('')
  const [tickerSearchActive, setTickerSearchActive] = useState(false)
  const tickerInputRef = useRef<HTMLInputElement>(null)
  const widgetRef = useRef<any>(null)
  const [addedToWatchlist, setAddedToWatchlist] = useState(false)

  // Reset confirmation badge when ticker changes
  useEffect(() => { setAddedToWatchlist(false) }, [ticker])

  const handleAddToWatchlist = () => {
    window.dispatchEvent(new CustomEvent('watchlist:add', { detail: { ticker } }))
    setAddedToWatchlist(true)
    // Reset after 2s so it can be triggered again
    setTimeout(() => setAddedToWatchlist(false), 2000)
  }

  // Load TradingView script once
  useEffect(() => {
    if (window.TradingView) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      // Script is loaded, widget will be created in next effect
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
    }
  }, [])

  // Create/update the widget when ticker changes
  useEffect(() => {
    if (!window.TradingView || !containerRef.current) return

    // Remove old widget if it exists
    if (containerRef.current.firstChild) {
      containerRef.current.innerHTML = ''
    }

    // Create new widget
    try {
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: `${ticker}`,
        interval: '1H',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: true,
        container_id: containerRef.current.id || 'tradingview-chart',
      })
    } catch (error) {
      console.error('[v0] TradingView widget error:', error)
    }
  }, [ticker])

  // Add ID to container if it doesn't have one
  useEffect(() => {
    if (containerRef.current && !containerRef.current.id) {
      containerRef.current.id = 'tradingview-chart'
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden font-mono select-none relative">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-[#0f1117] border-b border-[#1f2937] px-3 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {/* Ticker search */}
          {tickerSearchActive ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const val = tickerInput.trim().toUpperCase()
                if (val && onChangeTicker) onChangeTicker(val)
                setTickerSearchActive(false)
                setTickerInput('')
              }}
              className="flex items-center gap-1"
            >
              <input
                ref={tickerInputRef}
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value.toUpperCase())}
                onBlur={() => { setTickerSearchActive(false); setTickerInput('') }}
                onKeyDown={e => e.key === 'Escape' && (setTickerSearchActive(false), setTickerInput(''))}
                placeholder={ticker}
                autoFocus
                className="w-20 px-1.5 py-0.5 bg-white/10 border border-theme-green/60 rounded text-sm font-mono font-bold tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-theme-green"
              />
            </form>
          ) : (
            <button
              onClick={() => { setTickerSearchActive(true); setTickerInput('') }}
              className="flex items-center gap-1 font-mono font-bold text-sm tracking-wider hover:text-theme-green transition-colors group"
              title="Click to change ticker"
            >
              {ticker}
              <Search className="w-3 h-3 text-muted-foreground/50 group-hover:text-theme-green transition-colors" />
            </button>
          )}
        </div>

        {/* Add to Watchlist */}
        <button
          onClick={handleAddToWatchlist}
          title={addedToWatchlist ? 'Added to watchlist' : `Add ${ticker} to watchlist`}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-all duration-200 flex-shrink-0 ${
            addedToWatchlist
              ? 'bg-theme-green/20 border-theme-green/50 text-theme-green'
              : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-theme-green/10 hover:border-theme-green/40 hover:text-theme-green'
          }`}
        >
          {addedToWatchlist
            ? <><BookmarkCheck className="w-3.5 h-3.5" /> Added</>
            : <><BookmarkPlus className="w-3.5 h-3.5" /> Watchlist</>
          }
        </button>
      </div>

      {/* TradingView Chart */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full" />
    </div>
  )
}
