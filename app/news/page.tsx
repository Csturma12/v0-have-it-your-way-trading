'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Newspaper,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Zap,
  RefreshCw,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NewsItem {
  id: string
  title: string
  source: string
  timestamp: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  impact: 'high' | 'medium' | 'low'
  tickers: string[]
  summary: string
  url: string
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'NVIDIA Announces Next-Gen Blackwell Ultra GPUs for AI Data Centers',
    source: 'Reuters',
    timestamp: '15 min ago',
    sentiment: 'bullish',
    impact: 'high',
    tickers: ['NVDA', 'AMD', 'SMCI'],
    summary: 'NVIDIA reveals Blackwell Ultra architecture with 2x performance improvement. Expected to drive significant revenue growth in H2 2026.',
    url: '#',
  },
  {
    id: '2',
    title: 'Fed Signals Potential Rate Cut in June Meeting Minutes',
    source: 'Bloomberg',
    timestamp: '32 min ago',
    sentiment: 'bullish',
    impact: 'high',
    tickers: ['SPY', 'QQQ', 'TLT', 'XLF'],
    summary: 'Federal Reserve meeting minutes suggest growing consensus for rate cut amid cooling inflation data.',
    url: '#',
  },
  {
    id: '3',
    title: 'Tesla Recalls 500,000 Vehicles Over Safety Concerns',
    source: 'CNBC',
    timestamp: '1 hr ago',
    sentiment: 'bearish',
    impact: 'high',
    tickers: ['TSLA'],
    summary: 'Tesla issues recall for Model Y vehicles due to suspension component defect. Stock down 3% in pre-market.',
    url: '#',
  },
  {
    id: '4',
    title: 'Apple Services Revenue Hits All-Time High of $25B',
    source: 'WSJ',
    timestamp: '2 hr ago',
    sentiment: 'bullish',
    impact: 'medium',
    tickers: ['AAPL'],
    summary: 'Apple reports record services revenue driven by App Store, Apple TV+, and iCloud subscriptions.',
    url: '#',
  },
  {
    id: '5',
    title: 'Eli Lilly Receives FDA Breakthrough Therapy Designation',
    source: 'BioPharma Dive',
    timestamp: '2 hr ago',
    sentiment: 'bullish',
    impact: 'high',
    tickers: ['LLY'],
    summary: 'FDA grants breakthrough therapy designation for Eli Lilly\'s Alzheimer\'s drug candidate.',
    url: '#',
  },
  {
    id: '6',
    title: 'China Announces New Tariffs on US Semiconductor Imports',
    source: 'Financial Times',
    timestamp: '3 hr ago',
    sentiment: 'bearish',
    impact: 'high',
    tickers: ['INTC', 'AMD', 'QCOM', 'AVGO'],
    summary: 'China retaliates with 25% tariffs on US chip imports, escalating trade tensions.',
    url: '#',
  },
  {
    id: '7',
    title: 'JPMorgan Beats Q1 Estimates on Strong Trading Revenue',
    source: 'MarketWatch',
    timestamp: '4 hr ago',
    sentiment: 'bullish',
    impact: 'medium',
    tickers: ['JPM', 'BAC', 'GS'],
    summary: 'JPMorgan reports EPS of $4.50 vs $4.12 expected. Investment banking revenue up 15% YoY.',
    url: '#',
  },
  {
    id: '8',
    title: 'Oil Prices Surge 5% on Middle East Supply Concerns',
    source: 'OilPrice.com',
    timestamp: '5 hr ago',
    sentiment: 'bullish',
    impact: 'medium',
    tickers: ['XOM', 'CVX', 'COP', 'OXY'],
    summary: 'Brent crude jumps to $88/barrel amid geopolitical tensions affecting supply routes.',
    url: '#',
  },
]

export default function NewsPage() {
  const [news] = useState<NewsItem[]>(MOCK_NEWS)
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish'>('all')
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const filtered = news.filter((item) => {
    if (filter !== 'all' && item.sentiment !== filter) return false
    if (impactFilter !== 'all' && item.impact !== impactFilter) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold font-mono">MARKET NEWS</h1>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {filtered.length} Stories
              </Badge>
            </div>

            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-border bg-card/30 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">Sentiment:</span>
              {(['all', 'bullish', 'bearish'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                    filter === f
                      ? f === 'bullish'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : f === 'bearish'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">Impact:</span>
              {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setImpactFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                    impactFilter === f
                      ? 'bg-theme-gold/20 text-theme-gold border border-theme-gold/30'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* News List */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border bg-card p-5 transition-all hover:shadow-lg ${
                item.sentiment === 'bullish'
                  ? 'border-green-500/20 hover:border-green-500/40'
                  : item.sentiment === 'bearish'
                    ? 'border-red-500/20 hover:border-red-500/40'
                    : 'border-border/50 hover:border-border'
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {item.source}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {item.timestamp}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sentiment */}
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      item.sentiment === 'bullish'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : item.sentiment === 'bearish'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.sentiment === 'bullish' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : item.sentiment === 'bearish' ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : null}
                    {item.sentiment.toUpperCase()}
                  </Badge>

                  {/* Impact */}
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      item.impact === 'high'
                        ? 'bg-theme-gold/10 text-theme-gold border-theme-gold/30'
                        : item.impact === 'medium'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.impact === 'high' && <Zap className="w-3 h-3 mr-1" />}
                    {item.impact.toUpperCase()} IMPACT
                  </Badge>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-foreground mb-2 leading-tight">
                {item.title}
              </h2>

              {/* Summary */}
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {item.summary}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                {/* Tickers */}
                <div className="flex items-center gap-2 flex-wrap">
                  {item.tickers.map((ticker) => (
                    <Badge
                      key={ticker}
                      variant="outline"
                      className="text-[10px] font-mono bg-primary/5 border-primary/20 text-primary"
                    >
                      {ticker}
                    </Badge>
                  ))}
                </div>

                {/* Read More */}
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Read More
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="max-w-4xl mx-auto mt-8 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center">
            <strong className="text-foreground/60">Disclaimer:</strong> News sentiment is AI-generated.
            Always verify information with official sources before making trading decisions.
          </p>
        </div>
      </main>
    </div>
  )
}
