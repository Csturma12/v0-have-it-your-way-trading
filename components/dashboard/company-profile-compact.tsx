'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, TrendingUp, TrendingDown, RefreshCw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CompanyProfileCompactProps {
  ticker: string
}

interface ProfileData {
  name: string
  exchange: string
  description: string
  sector: string
  industry: string
  marketCap: number
}

interface QuoteData {
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
}

interface CompanyData {
  quote: QuoteData | null
  profile: ProfileData | null
  aiSummary: string | null
  source: string
}

function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  return num.toLocaleString()
}

function formatVolume(vol: number): string {
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`
  return vol.toString()
}

export function CompanyProfileCompact({ ticker }: CompanyProfileCompactProps) {
  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/polygon/profile?ticker=${ticker}`)
      if (res.ok) {
        const json = await res.json()
        if (json.profile || json.quote) {
          setData({
            quote: json.quote ?? null,
            profile: json.profile ?? null,
            aiSummary: json.aiSummary ?? null,
            source: json.source ?? 'polygon',
          })
          setSource(json.source ?? 'polygon')
          setLoading(false)
          return
        }
      }
    } catch {
      // fall through
    }
    setData({
      quote: null,
      profile: { name: ticker, exchange: '', description: 'No data available.', sector: '', industry: '', marketCap: 0 },
      aiSummary: null,
      source: 'unavailable',
    })
    setSource('unavailable')
    setLoading(false)
  }, [ticker])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  const { quote, profile, aiSummary } = data || {}

  if (!data) {
    return (
      <div className="flex items-center justify-center py-4">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-2 text-[9px]">
      {/* Header with ticker and price */}
      <div className="pb-2 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-3 h-3 text-foreground" />
            <span className="font-bold">{ticker}</span>
            <span className="text-muted-foreground">{profile?.name}</span>
          </div>
          <button onClick={fetchData} className="p-0.5 hover:bg-muted/50 rounded">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Price */}
        {quote && (
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-bold font-mono">${quote.price.toFixed(2)}</span>
            <div className={`flex items-center gap-1 text-[8px] font-mono ${quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {quote.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </div>
          </div>
        )}

        {/* Exchange badge */}
        {profile?.exchange && (
          <div className="flex gap-1 mt-1">
            <Badge variant="outline" className="text-[8px] h-4 px-1 py-0">
              {profile.exchange}
            </Badge>
          </div>
        )}
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
            <span className="text-[8px] font-bold text-purple-400 uppercase">AI</span>
          </div>
          <p className="text-[8px] text-muted-foreground leading-tight line-clamp-3">{aiSummary}</p>
        </div>
      )}

      {/* Profile info grid */}
      {profile && (
        <div className="space-y-1">
          {profile.description && (
            <div>
              <span className="text-muted-foreground">About</span>
              <p className="text-[8px] text-foreground leading-tight line-clamp-2">{profile.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1">
            {profile.sector && (
              <div>
                <span className="text-muted-foreground block">Sector</span>
                <span className="text-[8px] font-mono">{profile.sector}</span>
              </div>
            )}
            {profile.industry && (
              <div>
                <span className="text-muted-foreground block">Industry</span>
                <span className="text-[8px] font-mono">{profile.industry}</span>
              </div>
            )}
            {profile.marketCap > 0 && (
              <div>
                <span className="text-muted-foreground block">Market Cap</span>
                <span className="text-[8px] font-mono">{formatNumber(profile.marketCap)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quote metrics */}
      {quote && (
        <div className="grid grid-cols-4 gap-1 p-1 rounded bg-muted/20">
          <div>
            <span className="text-muted-foreground block text-[7px]">Open</span>
            <span className="text-[8px] font-mono">${quote.open.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[7px]">High</span>
            <span className="text-[8px] font-mono text-green-400">${quote.high.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[7px]">Low</span>
            <span className="text-[8px] font-mono text-red-400">${quote.low.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[7px]">Vol</span>
            <span className="text-[8px] font-mono">{formatVolume(quote.volume)}</span>
          </div>
        </div>
      )}

      {/* Source badge */}
      <div className="flex justify-end">
        <Badge 
          variant="outline" 
          className={`text-[7px] h-3 px-1 py-0 ${source === 'polygon' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'}`}
        >
          {source === 'polygon' ? 'POLYGON' : 'DEMO'}
        </Badge>
      </div>
    </div>
  )
}
