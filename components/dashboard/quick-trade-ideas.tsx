'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Zap, Flame, Target, ArrowRight, Search, Plus, X, Loader, Sparkles } from 'lucide-react'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'

interface TradeIdea {
  ticker: string
  action: 'buy' | 'sell'
  reason: string
  strength: 'high' | 'medium' | 'low'
  price?: number
  change?: number
}

interface QuickTradeIdeasProps {
  onSelectIdea?: (ticker: string, action: 'buy' | 'sell') => void
}

const DEFAULT_IDEAS = [
  { ticker: 'NVDA', action: 'buy' as const, reason: 'AI momentum', strength: 'high' as const },
  { ticker: 'TSLA', action: 'buy' as const, reason: 'Breakout setup', strength: 'medium' as const },
  { ticker: 'META', action: 'buy' as const, reason: 'Dark pool activity', strength: 'high' as const },
  { ticker: 'AMD', action: 'sell' as const, reason: 'Resistance hit', strength: 'medium' as const },
  { ticker: 'AAPL', action: 'buy' as const, reason: 'Earnings play', strength: 'low' as const },
]

export function QuickTradeIdeas({ onSelectIdea }: QuickTradeIdeasProps) {
  const [customTickers, setCustomTickers] = useState<typeof DEFAULT_IDEAS>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  // AI analysis state
  const [aiTicker, setAiTicker] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  
  const IDEA_TICKERS = [...DEFAULT_IDEAS, ...customTickers]
  const tickers = IDEA_TICKERS.map(i => i.ticker)
  const { quotes, isLoading } = useLiveQuotes(tickers, { refreshInterval: 30000 })

  // Search for any stock globally
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/tickers/search?q=${encodeURIComponent(searchQuery)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results || [])
      }
    } catch {
      setSearchResults([])
    }
    setIsSearching(false)
  }

  // Add ticker to ideas
  const addTicker = (symbol: string) => {
    if (!customTickers.find(t => t.ticker === symbol) && !DEFAULT_IDEAS.find(t => t.ticker === symbol)) {
      setCustomTickers([...customTickers, {
        ticker: symbol,
        action: 'buy' as const,
        reason: 'User added',
        strength: 'medium' as const
      }])
    }
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  // Remove custom ticker
  const removeTicker = (symbol: string) => {
    setCustomTickers(customTickers.filter(t => t.ticker !== symbol))
  }

  // Fetch AI trade analysis (Claude via AI Gateway)
  const fetchAiAnalysis = async (ticker: string, currentPrice?: number, change?: number) => {
    setAiTicker(ticker)
    setAiLoading(true)
    setAiError(null)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/ai/trade-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, currentPrice, change }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setAiAnalysis(data.analysis || '')
    } catch (err: any) {
      setAiError(err?.message || 'AI analysis failed')
    } finally {
      setAiLoading(false)
    }
  }

  const ideas: TradeIdea[] = IDEA_TICKERS.map(idea => {
    const q = quotes[idea.ticker]
    return {
      ...idea,
      price: q?.price || 0,
      change: q?.changePercent || 0,
    }
  })

  const loading = isLoading && Object.keys(quotes).length === 0

  const strengthColors = {
    high: 'bg-green-500/20 border-green-500/40 text-green-400',
    medium: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
    low: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  }

  const strengthIcons = {
    high: Flame,
    medium: Target,
    low: Zap,
  }

  if (loading) {
    return (
      <div className="p-2 border-t border-border">
        <div className="text-[9px] font-mono font-bold text-foreground/70 uppercase tracking-wide mb-2">
          Trade Ideas
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 w-20 bg-muted/20 rounded animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-mono font-bold text-foreground/70 uppercase tracking-wide flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" />
          Trade Ideas
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-mono text-muted-foreground">{ideas.length} active</span>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-0.5 rounded hover:bg-muted/50 transition-colors"
            title="Search any stock"
          >
            {showSearch ? <X className="w-3 h-3 text-muted-foreground" /> : <Search className="w-3 h-3 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Universal Stock Search */}
      {showSearch && (
        <div className="mb-2 p-1.5 rounded border border-border/50 bg-muted/10">
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search any stock worldwide..."
                className="w-full pl-5 pr-2 py-1 text-[10px] font-mono bg-background/50 border border-border/50 rounded focus:outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              className="px-2 py-1 text-[9px] font-mono font-bold rounded border bg-primary/20 border-primary/30 text-primary hover:bg-primary/30 disabled:opacity-40"
            >
              {isSearching ? <Loader className="w-2.5 h-2.5 animate-spin" /> : 'GO'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1.5 space-y-0.5 max-h-32 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => addTicker(r.symbol)}
                  className="w-full flex items-center justify-between px-1.5 py-1 rounded bg-background/50 hover:bg-primary/10 transition-colors text-left group"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-foreground">{r.symbol}</span>
                    <span className="text-[8px] font-mono text-muted-foreground truncate">{r.name}</span>
                  </div>
                  <Plus className="w-2.5 h-2.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Horizontal scrollable pill box */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {ideas.map((idea) => {
          const StrengthIcon = strengthIcons[idea.strength]
          const isPositive = idea.action === 'buy'
          const isCustom = customTickers.some(t => t.ticker === idea.ticker)
          
          return (
            <div key={idea.ticker} className="relative flex-shrink-0 group">
              {isCustom && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeTicker(idea.ticker) }}
                  className="absolute -top-1 -right-1 z-10 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <X className="w-2 h-2" />
                </button>
              )}
              {/* AI analysis button (top-left of pill) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  fetchAiAnalysis(idea.ticker, idea.price, idea.change)
                }}
                className="absolute -top-1 -left-1 z-10 p-0.5 rounded-full bg-violet-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-400"
                title="AI trade analysis (Claude)"
              >
                <Sparkles className="w-2 h-2" />
              </button>
              <button
                onClick={() => onSelectIdea?.(idea.ticker, idea.action)}
                className={`p-1.5 rounded border transition-all hover:scale-105 cursor-pointer ${
                  isPositive 
                    ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' 
                    : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                } ${isCustom ? 'ring-1 ring-primary/30' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  {/* Action indicator */}
                  <div className={`p-0.5 rounded ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {isPositive 
                      ? <TrendingUp className="w-2.5 h-2.5 text-green-400" />
                      : <TrendingDown className="w-2.5 h-2.5 text-red-400" />
                    }
                  </div>
                  
                  {/* Ticker + info */}
                  <div className="text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono font-bold text-foreground">{idea.ticker}</span>
                      <span className={`text-[8px] font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{idea.change?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <StrengthIcon className={`w-2 h-2 ${strengthColors[idea.strength].split(' ')[2]}`} />
                      <span className="text-[7px] font-mono text-muted-foreground truncate max-w-[60px]">
                        {idea.reason}
                      </span>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <ArrowRight className={`w-2.5 h-2.5 ${isPositive ? 'text-green-400/50' : 'text-red-400/50'}`} />
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* AI Analysis Panel */}
      {aiTicker && (
        <div className="mt-2 p-2 rounded border border-violet-500/30 bg-violet-500/5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span className="text-[9px] font-mono font-bold text-violet-400 uppercase">
                AI Analysis · {aiTicker}
              </span>
            </div>
            <button
              onClick={() => { setAiTicker(null); setAiAnalysis(''); setAiError(null) }}
              className="p-0.5 rounded hover:bg-muted/50 transition-colors"
              title="Close"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          {aiLoading && (
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground py-2">
              <Loader className="w-3 h-3 animate-spin text-violet-400" />
              Analyzing with Claude...
            </div>
          )}
          {aiError && (
            <div className="text-[9px] font-mono text-red-400 py-1">
              {aiError}
            </div>
          )}
          {aiAnalysis && !aiLoading && (
            <pre className="text-[9px] font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {aiAnalysis}
            </pre>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border/30">
        <div className="flex items-center gap-0.5">
          <Flame className="w-2 h-2 text-green-400" />
          <span className="text-[7px] font-mono text-muted-foreground">High</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Target className="w-2 h-2 text-yellow-400" />
          <span className="text-[7px] font-mono text-muted-foreground">Med</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Zap className="w-2 h-2 text-blue-400" />
          <span className="text-[7px] font-mono text-muted-foreground">Low</span>
        </div>
      </div>
    </div>
  )
}
