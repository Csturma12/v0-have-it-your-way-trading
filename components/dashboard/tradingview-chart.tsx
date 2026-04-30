'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, BookmarkPlus, BookmarkCheck, LogIn, ExternalLink, User } from 'lucide-react'

interface ChartProps {
  ticker: string
  onChangeTicker?: (ticker: string) => void
}

// Store premium mode preference in localStorage
const PREMIUM_MODE_KEY = 'tradingview-premium-mode'

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
  const [premiumMode, setPremiumMode] = useState(false)
  const [showPremiumMenu, setShowPremiumMenu] = useState(false)

  // Load premium mode preference
  useEffect(() => {
    const saved = localStorage.getItem(PREMIUM_MODE_KEY)
    if (saved === 'true') setPremiumMode(true)
  }, [])

  // Toggle premium mode
  const togglePremiumMode = (enabled: boolean) => {
    setPremiumMode(enabled)
    localStorage.setItem(PREMIUM_MODE_KEY, String(enabled))
    setShowPremiumMenu(false)
  }

  // Close premium menu when clicking outside
  useEffect(() => {
    if (!showPremiumMenu) return
    const handleClick = () => setShowPremiumMenu(false)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showPremiumMenu])

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

  // Create/update the widget when ticker or premium mode changes
  useEffect(() => {
    if (!window.TradingView || !containerRef.current) return

    // Remove old widget if it exists
    if (containerRef.current.firstChild) {
      containerRef.current.innerHTML = ''
    }

    // Create new widget with premium features if enabled
    try {
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: `${ticker}`,
        interval: premiumMode ? 'D' : '1H',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: premiumMode, // Enable for premium users
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: premiumMode, // Premium users can change symbols in widget
        save_image: true,
        studies: premiumMode ? ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies', 'MACD@tv-basicstudies'] : [],
        show_popup_button: premiumMode, // Opens in tradingview.com
        popup_width: '1000',
        popup_height: '650',
        container_id: containerRef.current.id || 'tradingview-chart',
      })
    } catch (error) {
      console.error('[v0] TradingView widget error:', error)
    }
  }, [ticker, premiumMode])

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

        {/* TradingView Premium Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowPremiumMenu(!showPremiumMenu)}
            title={premiumMode ? 'Premium Mode Active' : 'Login to TradingView'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-all duration-200 flex-shrink-0 ${
              premiumMode
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:text-cyan-400'
            }`}
          >
            {premiumMode ? <User className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            {premiumMode ? 'Premium' : 'Login'}
          </button>

          {/* Dropdown menu */}
          {showPremiumMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-[#2d2d44]">
                <p className="text-[10px] font-mono text-muted-foreground mb-2">
                  Connect your TradingView account for premium features
                </p>
              </div>
              
              <button
                onClick={() => togglePremiumMode(false)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${
                  !premiumMode ? 'bg-cyan-500/10 text-cyan-400' : 'text-foreground hover:bg-white/5'
                }`}
              >
                <div className={`w-3 h-3 rounded-full border-2 ${!premiumMode ? 'border-cyan-400 bg-cyan-400' : 'border-muted-foreground'}`} />
                Free Charts (No Login)
              </button>
              
              <button
                onClick={() => togglePremiumMode(true)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${
                  premiumMode ? 'bg-cyan-500/10 text-cyan-400' : 'text-foreground hover:bg-white/5'
                }`}
              >
                <div className={`w-3 h-3 rounded-full border-2 ${premiumMode ? 'border-cyan-400 bg-cyan-400' : 'border-muted-foreground'}`} />
                Premium Mode (Advanced Features)
              </button>

              <a
                href="https://www.tradingview.com/accounts/signin/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors border-t border-[#2d2d44]"
              >
                Open TradingView Login
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* TradingView Chart */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full" />
    </div>
  )
}
