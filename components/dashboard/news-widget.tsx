'use client'

import { useState, useEffect } from 'react'
import { Newspaper, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface NewsItem {
  id: string
  headline: string
  source: string
  summary: string
  url: string
  publishedAt: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  tickers: string[]
}

// Fallback mock news when API is unavailable
const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    headline: 'NVDA surges on data center demand beat — analysts raise targets to $1,100',
    source: 'Bloomberg',
    summary: 'Nvidia reported record quarterly revenue of $26B, driven by Hopper GPU demand from hyperscalers. Multiple analysts raised price targets above $1,000.',
    url: '#',
    publishedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    sentiment: 'bullish',
    tickers: ['NVDA'],
  },
  {
    id: '2',
    headline: 'Fed holds rates steady, signals two cuts possible in 2025',
    source: 'Reuters',
    summary: 'The Federal Reserve kept benchmark rates at 5.25–5.50%, with Chair Powell signaling openness to cuts if inflation continues declining.',
    url: '#',
    publishedAt: new Date(Date.now() - 38 * 60000).toISOString(),
    sentiment: 'bullish',
    tickers: ['SPY', 'QQQ', 'TLT'],
  },
  {
    id: '3',
    headline: 'LLY Mounjaro global sales top $3.1B — beats estimates by 18%',
    source: 'CNBC',
    summary: 'Eli Lilly posted blockbuster GLP-1 sales as international demand for Mounjaro accelerated. Full-year guidance raised significantly.',
    url: '#',
    publishedAt: new Date(Date.now() - 55 * 60000).toISOString(),
    sentiment: 'bullish',
    tickers: ['LLY'],
  },
  {
    id: '4',
    headline: 'Intel loses another foundry client — shares drop 4%',
    source: 'WSJ',
    summary: 'Intel\'s foundry business faced another setback as a major customer shifted orders to TSMC, raising concerns about the division\'s viability.',
    url: '#',
    publishedAt: new Date(Date.now() - 82 * 60000).toISOString(),
    sentiment: 'bearish',
    tickers: ['INTC', 'TSM'],
  },
  {
    id: '5',
    headline: 'JPMorgan upgrades energy sector — oil supply tightening into Q2',
    source: 'Barrons',
    summary: 'JPMorgan raised its energy sector weighting to overweight citing supply discipline from OPEC+ and rising Asian demand. XOM and CVX are top picks.',
    url: '#',
    publishedAt: new Date(Date.now() - 105 * 60000).toISOString(),
    sentiment: 'bullish',
    tickers: ['XOM', 'CVX', 'COP'],
  },
  {
    id: '6',
    headline: 'Treasury yields spike — 10-year hits 4.8%, growth stocks under pressure',
    source: 'FT',
    summary: 'Rising bond yields weighed on high-multiple tech names as investors reassessed rate cut timelines following stronger-than-expected jobs data.',
    url: '#',
    publishedAt: new Date(Date.now() - 142 * 60000).toISOString(),
    sentiment: 'bearish',
    tickers: ['QQQ', 'ARKK', 'TLT'],
  },
  {
    id: '7',
    headline: 'PLTR wins $480M DoD AI contract — defense AI accelerating',
    source: 'Defense News',
    summary: 'Palantir Technologies secured a significant Department of Defense contract for AI-powered battlefield analysis systems, beating three competitors.',
    url: '#',
    publishedAt: new Date(Date.now() - 198 * 60000).toISOString(),
    sentiment: 'bullish',
    tickers: ['PLTR'],
  },
  {
    id: '8',
    headline: 'Merger arbitrage: MSFT-ATVI spread narrows to $2.10 ahead of close',
    source: 'The Street',
    summary: 'With the Activision Blizzard deal approaching final regulatory approval, the merger arbitrage spread tightened significantly, signaling high deal confidence.',
    url: '#',
    publishedAt: new Date(Date.now() - 240 * 60000).toISOString(),
    sentiment: 'neutral',
    tickers: ['MSFT', 'ATVI'],
  },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
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
}

export function NewsWidget({ onSelectTicker }: NewsWidgetProps) {
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchNews = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/news?limit=20')
      if (res.ok) {
        const data = await res.json()
        if (data.articles?.length) {
          setNews(data.articles)
          setLastRefresh(new Date())
        }
      }
    } catch {
      // fall back to mock data
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchNews()
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const filtered = filter === 'all' ? news : news.filter(n => n.sentiment === filter)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Newspaper className="w-3.5 h-3.5 text-theme-gold" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-foreground">Market News</span>
          <span className="text-[9px] font-mono text-muted-foreground">
            {timeAgo(lastRefresh.toISOString())}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Sentiment filter */}
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

      {/* News list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(item => {
          const cfg = sentimentConfig[item.sentiment]
          const SentIcon = cfg.icon
          return (
            <div
              key={item.id}
              className={`border-b border-border/30 px-3 py-2.5 hover:bg-muted/20 transition-colors group`}
            >
              {/* Top row: sentiment badge + source + time */}
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`flex items-center gap-0.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} ${cfg.border} flex-shrink-0`}>
                    <SentIcon className="w-2 h-2" />
                    {cfg.label.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground truncate">{item.source}</span>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0">{timeAgo(item.publishedAt)}</span>
              </div>

              {/* Headline */}
              <p className="text-[11px] font-semibold text-foreground leading-snug mb-1 line-clamp-2">
                {item.headline}
              </p>

              {/* Summary */}
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">
                {item.summary}
              </p>

              {/* Tickers + link */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                  {item.tickers.map(t => (
                    <button
                      key={t}
                      onClick={() => onSelectTicker?.(t)}
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-card border border-border/50 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {item.url !== '#' && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
