'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Calendar, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Catalyst {
  type: 'earnings' | 'event' | 'news' | 'economic'
  title: string
  date: string
  impact: 'high' | 'medium' | 'low'
  sentiment?: 'bullish' | 'bearish' | 'neutral'
  source?: string
}

const MOCK_CATALYSTS: Record<string, Catalyst[]> = {
  AAPL: [
    {
      type: 'earnings',
      title: 'Q1 2025 Earnings Report',
      date: '2025-01-28',
      impact: 'high',
      sentiment: 'bullish',
      source: 'Company',
    },
    {
      type: 'event',
      title: 'Apple Spring Event',
      date: '2025-03-18',
      impact: 'high',
      sentiment: 'neutral',
      source: 'Company',
    },
    {
      type: 'economic',
      title: 'Fed Interest Rate Decision',
      date: '2025-02-19',
      impact: 'medium',
      sentiment: 'neutral',
      source: 'Federal Reserve',
    },
    {
      type: 'news',
      title: 'Analyst Upgrade Probability',
      date: '2025-02-01',
      impact: 'low',
      sentiment: 'bullish',
      source: 'Street',
    },
  ],
  NVDA: [
    {
      type: 'earnings',
      title: 'Q4 2025 Earnings Report',
      date: '2025-02-25',
      impact: 'high',
      sentiment: 'bullish',
      source: 'Company',
    },
    {
      type: 'event',
      title: 'GTC Conference (GPU Tech)',
      date: '2025-03-24',
      impact: 'medium',
      sentiment: 'neutral',
      source: 'Company',
    },
    {
      type: 'economic',
      title: 'AI Chip Sales Data Release',
      date: '2025-02-15',
      impact: 'medium',
      sentiment: 'neutral',
      source: 'Market',
    },
  ],
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntil < 0) return 'Past'
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  if (daysUntil <= 7) return `${daysUntil}d away`
  if (daysUntil <= 30) return `${Math.floor(daysUntil / 7)}w away`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTypeColor(type: string): string {
  if (type === 'earnings') return 'bg-blue-500/20 text-blue-400'
  if (type === 'event') return 'bg-purple-500/20 text-purple-400'
  if (type === 'economic') return 'bg-orange-500/20 text-orange-400'
  return 'bg-gray-500/20 text-gray-400'
}

export function Catalysts({ ticker = 'AAPL' }: { ticker: string }) {
  const [catalysts, setCatalysts] = useState<Catalyst[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      const mock = MOCK_CATALYSTS[ticker] || MOCK_CATALYSTS.AAPL
      setCatalysts(mock.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    } catch (err) {
      console.error('[Catalysts] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [ticker])

  if (loading) {
    return (
      <div className="h-full bg-card border border-border rounded-lg p-3 flex items-center justify-center">
        <div className="animate-spin"><RefreshCw className="w-4 h-4 text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-card border border-border rounded-lg p-3 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-muted-foreground/70" />
          <span className="text-xs font-mono text-muted-foreground/70 uppercase">Catalysts</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0.5">
            DEMO
          </Badge>
        </div>
        <button onClick={fetch} className="hover:bg-white/5 p-1 rounded transition-colors">
          <RefreshCw className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
        </button>
      </div>

      {/* Catalysts List */}
      <div className="space-y-2 flex-1">
        {catalysts.length === 0 ? (
          <div className="text-[9px] text-muted-foreground/50 py-4 text-center">No upcoming catalysts</div>
        ) : (
          catalysts.map((catalyst, idx) => (
            <div key={idx} className="bg-white/5 rounded p-2 border border-border/10 hover:border-border/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Badge className={`text-[8px] px-1 py-0.5 ${getTypeColor(catalyst.type)}`}>
                    {catalyst.type.charAt(0).toUpperCase() + catalyst.type.slice(1)}
                  </Badge>
                  <span className="text-[9px] font-semibold truncate">{catalyst.title}</span>
                </div>
                {catalyst.impact === 'high' && (
                  <TrendingUp className="w-3 h-3 text-orange-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center justify-between text-[8px] text-muted-foreground/60">
                <span>{formatDate(catalyst.date)}</span>
                {catalyst.sentiment && (
                  <span className={catalyst.sentiment === 'bullish' ? 'text-theme-green' : catalyst.sentiment === 'bearish' ? 'text-red-400' : 'text-yellow-500'}>
                    {catalyst.sentiment.charAt(0).toUpperCase() + catalyst.sentiment.slice(1)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-[8px] text-muted-foreground/40 mt-2 pt-2 border-t border-border/10">
        {catalysts.length} upcoming
      </div>
    </div>
  )
}
