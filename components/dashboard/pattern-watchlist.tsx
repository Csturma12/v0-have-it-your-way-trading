'use client'

import { useState, useEffect } from 'react'
import { 
  Target, Search, Plus, X, Loader, Radar, Eye, EyeOff, 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Trash2, Settings
} from 'lucide-react'
import { useWatchlist, useWatchlistsByPurpose, type Watchlist } from '@/contexts/watchlist-context'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'

interface PatternWatchlistProps {
  onSelectTicker?: (ticker: string) => void
}

const WATCHLIST_COLORS = [
  { name: 'cyan', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' },
  { name: 'purple', bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  { name: 'green', bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
  { name: 'orange', bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  { name: 'pink', bg: 'bg-pink-500/20', border: 'border-pink-500/50', text: 'text-pink-400' },
]

export function PatternWatchlist({ onSelectTicker }: PatternWatchlistProps) {
  const { 
    createWatchlist, 
    deleteWatchlist,
    addTicker, 
    removeTicker, 
    toggleScanEnabled,
    patternScanTickers 
  } = useWatchlist()
  
  const patternWatchlists = useWatchlistsByPurpose('pattern_scan')
  
  const [isExpanded, setIsExpanded] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [selectedColor, setSelectedColor] = useState('cyan')
  const [isCreating, setIsCreating] = useState(false)
  
  // Search state
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Get live quotes for all pattern scan tickers
  const { quotes } = useLiveQuotes(patternScanTickers, { refreshInterval: 30000 })
  
  // Set active list to first pattern watchlist
  useEffect(() => {
    if (patternWatchlists.length > 0 && !activeListId) {
      setActiveListId(patternWatchlists[0].id)
    }
  }, [patternWatchlists, activeListId])

  // Search for tickers
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

  // Create new pattern watchlist
  const handleCreate = async () => {
    if (!newListName.trim()) return
    setIsCreating(true)
    const newList = await createWatchlist(newListName.trim(), 'pattern_scan', selectedColor)
    if (newList) {
      setActiveListId(newList.id)
    }
    setNewListName('')
    setShowCreateForm(false)
    setIsCreating(false)
  }

  // Add ticker to active list
  const handleAddTicker = (symbol: string) => {
    if (activeListId) {
      addTicker(symbol, activeListId)
    }
    setSearchQuery('')
    setSearchResults([])
  }

  // Get color classes for a watchlist
  const getColorClasses = (color: string) => {
    return WATCHLIST_COLORS.find(c => c.name === color) || WATCHLIST_COLORS[0]
  }

  return (
    <div className="border border-border rounded-lg bg-card/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-purple-500/20 border border-purple-500/30">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">Pattern Scan Watchlists</h3>
            <p className="text-[10px] font-mono text-muted-foreground">
              {patternScanTickers.length} tickers actively scanned
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {patternScanTickers.length > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
              <Radar className="w-3 h-3 animate-pulse" />
              SCANNING
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {/* Watchlist tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-border/50 bg-muted/30 overflow-x-auto">
            {patternWatchlists.map(list => {
              const colors = getColorClasses(list.color)
              const isActive = list.id === activeListId
              return (
                <button
                  key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold whitespace-nowrap transition-all ${
                    isActive 
                      ? `${colors.bg} ${colors.border} border ${colors.text}` 
                      : 'bg-muted/50 border border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {list.scanEnabled ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3 opacity-50" />
                  )}
                  {list.name}
                  <span className="opacity-60">({list.tickers.length})</span>
                </button>
              )
            })}
            
            {/* Create new button */}
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-3 h-3" />
              New List
            </button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="p-2 border-b border-border/50 bg-purple-500/5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Watchlist name..."
                  className="flex-1 px-2 py-1 text-xs font-mono bg-background/50 border border-border/50 rounded focus:outline-none focus:border-purple-500/50"
                  autoFocus
                />
                <div className="flex gap-1">
                  {WATCHLIST_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`w-4 h-4 rounded-full ${c.bg} border-2 ${
                        selectedColor === c.name ? c.border : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!newListName.trim() || isCreating}
                  className="px-2 py-1 text-[10px] font-mono font-bold bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded hover:bg-purple-500/30 disabled:opacity-40"
                >
                  {isCreating ? <Loader className="w-3 h-3 animate-spin" /> : 'Create'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Active watchlist content */}
          {activeListId && patternWatchlists.find(w => w.id === activeListId) && (
            <WatchlistContent
              watchlist={patternWatchlists.find(w => w.id === activeListId)!}
              quotes={quotes}
              onSelectTicker={onSelectTicker}
              onRemoveTicker={(ticker) => removeTicker(ticker, activeListId)}
              onToggleScan={(enabled) => toggleScanEnabled(activeListId, enabled)}
              onDelete={() => deleteWatchlist(activeListId)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSearch={handleSearch}
              onAddTicker={handleAddTicker}
            />
          )}

          {/* Empty state */}
          {patternWatchlists.length === 0 && !showCreateForm && (
            <div className="p-6 text-center">
              <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">No pattern scan watchlists yet</p>
              <p className="text-xs text-muted-foreground/70 mb-3">
                Create a watchlist to have the bot actively scan for patterns on specific tickers
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-3 py-1.5 text-xs font-mono font-semibold bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded hover:bg-purple-500/30"
              >
                <Plus className="w-3 h-3 inline mr-1" />
                Create Pattern Watchlist
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Subcomponent for watchlist content
interface WatchlistContentProps {
  watchlist: Watchlist
  quotes: Record<string, { price: number; change: number; changePercent: number }>
  onSelectTicker?: (ticker: string) => void
  onRemoveTicker: (ticker: string) => void
  onToggleScan: (enabled: boolean) => void
  onDelete: () => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: { symbol: string; name: string }[]
  isSearching: boolean
  onSearch: () => void
  onAddTicker: (symbol: string) => void
}

function WatchlistContent({
  watchlist,
  quotes,
  onSelectTicker,
  onRemoveTicker,
  onToggleScan,
  onDelete,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSearch,
  onAddTicker,
}: WatchlistContentProps) {
  const colors = WATCHLIST_COLORS.find(c => c.name === watchlist.color) || WATCHLIST_COLORS[0]
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="p-2">
      {/* Search bar */}
      <div className="flex items-center gap-1 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Search any stock to add..."
            className="w-full pl-7 pr-2 py-1.5 text-xs font-mono bg-background/50 border border-border/50 rounded focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button
          onClick={onSearch}
          disabled={!searchQuery.trim() || isSearching}
          className={`px-2 py-1.5 text-[10px] font-mono font-bold rounded border ${colors.bg} ${colors.border} ${colors.text} hover:brightness-110 disabled:opacity-40`}
        >
          {isSearching ? <Loader className="w-3 h-3 animate-spin" /> : 'Search'}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mb-2 p-1 rounded border border-border/50 bg-muted/20 space-y-0.5">
          {searchResults.map(r => (
            <button
              key={r.symbol}
              onClick={() => onAddTicker(r.symbol)}
              className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-foreground">{r.symbol}</span>
                <span className="text-[10px] font-mono text-muted-foreground truncate">{r.name}</span>
              </div>
              <Plus className="w-3 h-3 text-purple-400" />
            </button>
          ))}
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-2 p-2 rounded border border-border/50 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">Active Scanning</span>
            <button
              onClick={() => onToggleScan(!watchlist.scanEnabled)}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                watchlist.scanEnabled 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {watchlist.scanEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs font-mono text-red-400/70">Delete watchlist</span>
            <button
              onClick={onDelete}
              className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
            >
              <Trash2 className="w-3 h-3 inline mr-1" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Ticker list */}
      {watchlist.tickers.length > 0 ? (
        <div className="space-y-1">
          {watchlist.tickers.map(ticker => {
            const quote = quotes[ticker]
            const isPositive = quote?.changePercent >= 0
            
            return (
              <div
                key={ticker}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <button
                  onClick={() => onSelectTicker?.(ticker)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <span className="text-xs font-mono font-bold text-foreground">{ticker}</span>
                  {quote && (
                    <>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        ${quote.price.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
                      </span>
                    </>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  {watchlist.scanEnabled && (
                    <span className="text-[8px] font-mono text-purple-400/70 bg-purple-500/10 px-1 rounded">
                      scanning
                    </span>
                  )}
                  <button
                    onClick={() => onRemoveTicker(ticker)}
                    className="p-0.5 text-muted-foreground/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-muted-foreground">
          No tickers yet. Search to add stocks for pattern scanning.
        </div>
      )}
    </div>
  )
}
