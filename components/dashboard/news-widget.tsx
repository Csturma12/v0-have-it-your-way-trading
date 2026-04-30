'use client'

import { useState, useEffect, useCallback } from 'react'
import { Newspaper, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus, Clock, AlertCircle } from 'lucide-react'

interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  url: string
  image: string
  timestamp: number
  tickers: string[]
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const sentimentConfig = {
  bullish: {
    icon: TrendingUp,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    label: 'Bullish',
  },
  bearish: {
    icon: TrendingDown,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Bearish',
  },
  neutral: {
    icon: Minus,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    label: 'Neutral',
  },
}

interface NewsWidgetProps {
  onSelectTicker?: (ticker: string) => void
  selectedTicker?: string
  ticker?: string
}

type Tab = 'market' | 'ticker'

function NewsFeed({
  fetchTicker,
  onSelectTicker,
}: {
  fetchTicker?: string
  onSelectTicker?: (ticker: string) => void
}) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [sources, setSources] = useState<{ finnhub: boolean; polygon: boolean }>({ finnhub: false, polygon: false })

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)  // 8s timeout
      
      const params = new URLSearchParams()
      if (fetchTicker) params.set('ticker', fetchTicker)
      const res = await fetch(`/api/news?${params.toString()}`, {
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      if (!res.ok) throw new Error('Failed to fetch news')
      const data = await res.json()
      setNews(data.news || [])
      setSources(data.sources || { finnhub: false, polygon: false })
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load news'
      setError(message === 'The user aborted a request.' ? 'News fetch timeout' : message)
      setNews([])
    } finally {
      setLoading(false)
    }
  }, [fetchTicker])

  useEffect(() => {
    fetchNews()
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNews])

  const filtered = filter === 'all' ? news : news.filter(n => n.sentiment === filter)

  const activeSourceLabel = () => {
    const active = []
    if (sources.finnhub) active.push('Finnhub')
    if (sources.polygon) active.push('Polygon')
    return active.length ? active.join(' + ') : 'No sources'
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filter bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/50 bg-muted/10 flex-shrink-0">
        <div className="text-[9px] font-mono text-muted-foreground">
          {activeSourceLabel()} &nbsp;|&nbsp; {filtered.length} articles
          {lastRefresh && (
            <span className="ml-2 inline-flex items-center gap-0.5">
              <Clock className="w-2 h-2" />
              {timeAgo(lastRefresh.getTime())}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'bullish', 'bearish', 'neutral'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded capitalize transition-colors ${
                filter === f
                  ? f === 'bullish' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : f === 'bearish' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : f === 'neutral' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-muted/60 text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={fetchNews}
            disabled={loading}
            className="ml-1 p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2 text-[10px] text-red-400 flex-shrink-0">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {/* News list */}
      <div className="flex-1 overflow-y-auto">
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading news...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No {filter !== 'all' ? filter : ''} news found
          </div>
        ) : (
          filtered.map(item => {
            const cfg = sentimentConfig[item.sentiment]
            const SentIcon = cfg.icon
            return (
              <div
                key={item.id}
                className="border-b border-border/30 px-3 py-2.5 hover:bg-muted/20 transition-colors group"
              >
                <div className="flex gap-3">
                  {item.image && (
                    <div className="flex-shrink-0 w-16 h-12 rounded overflow-hidden bg-muted/30">
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`flex items-center gap-0.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} ${cfg.border} flex-shrink-0`}>
                          <SentIcon className="w-2 h-2" />
                          {cfg.label.toUpperCase()}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground truncate">{item.source}</span>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                      <p className="text-[11px] font-semibold text-foreground leading-snug mb-1 line-clamp-2 hover:text-primary transition-colors">
                        {item.headline}
                        <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover:opacity-100" />
                      </p>
                    </a>
                    {item.summary && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">
                        {item.summary}
                      </p>
                    )}
                    {item.tickers.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.tickers.slice(0, 5).map(t => (
                          <button
                            key={t}
                            onClick={() => onSelectTicker?.(t)}
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-card border border-border/50 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                        {item.tickers.length > 5 && (
                          <span className="text-[8px] text-muted-foreground">+{item.tickers.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export function NewsWidget({ onSelectTicker, selectedTicker }: NewsWidgetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('market')

  // Switch to ticker tab automatically when a ticker is selected
  useEffect(() => {
    if (selectedTicker) setActiveTab('ticker')
  }, [selectedTicker])

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border flex-shrink-0 bg-card/50">
        <button
          onClick={() => setActiveTab('market')}
          className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'market'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Newspaper className="w-3 h-3" />
          Market News
        </button>
        <button
          onClick={() => setActiveTab('ticker')}
          className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'ticker'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          {selectedTicker ? `${selectedTicker} News` : 'Ticker News'}
          {selectedTicker && (
            <span className="ml-1 px-1 py-0.5 text-[8px] bg-primary/20 text-primary rounded font-mono">
              {selectedTicker}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'market' && (
        <NewsFeed onSelectTicker={onSelectTicker} />
      )}

      {activeTab === 'ticker' && (
        selectedTicker ? (
          <NewsFeed fetchTicker={selectedTicker} onSelectTicker={onSelectTicker} />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
            <TrendingUp className="w-8 h-8 opacity-20" />
            <p className="text-[11px] font-mono text-center">
              Select a ticker from the watchlist<br />or chart to load ticker-specific news
            </p>
          </div>
        )
      )}
    </div>
  )
}
