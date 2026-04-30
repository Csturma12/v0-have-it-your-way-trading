'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Users, RefreshCw, Sparkles, Building2 } from 'lucide-react'

interface CompanyProfileProps {
  ticker: string
}

interface QuoteData {
  price: number
  change: number
  changePercent: number
  afterHoursPrice?: number
  afterHoursChange?: number
  afterHoursChangePercent?: number
  volume: number
  high: number
  low: number
  open: number
  prevClose: number
}

interface ProfileData {
  name: string
  exchange: string
  description: string
  sector: string
  industry: string
  ceo: string
  employees: number
  marketCap: number
  website: string
  executives?: { name: string; title: string }[]
}

interface CompanyData {
  quote: QuoteData | null
  profile: ProfileData | null
  aiSummary: string | null
  source: string
}

function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9)  return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6)  return `$${(num / 1e6).toFixed(2)}M`
  return num.toLocaleString()
}

function formatVolume(vol: number): string {
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`
  return vol.toString()
}

export function CompanyProfile({ ticker }: CompanyProfileProps) {
  const [data, setData]           = useState<CompanyData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'executives'>('profile')

  const fetchData = useCallback(async () => {
    if (data) setLoading(true)  // Only show spinner if we don't have cached data
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)  // 8s timeout
      
      const res = await fetch(`/api/polygon/profile?ticker=${ticker}`, {
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      if (res.ok) {
        const json = await res.json()
        if (json.profile || json.quote) {
          setData({
            quote:     json.quote     ?? null,
            profile:   json.profile   ?? null,
            aiSummary: json.aiSummary ?? null,
            source:    json.source    ?? 'polygon',
          })
          setLoading(false)
          return
        }
      }
    } catch (err) { 
      console.log(`[v0] Company profile fetch failed for ${ticker}:`, err instanceof Error ? err.message : 'unknown error')
    }
    
    // Fallback data
    if (!data) {
      setData({
        quote: null,
        profile: { name: ticker, exchange: '', description: 'Unable to load profile.', sector: '', industry: '', ceo: '', employees: 0, marketCap: 0, website: '', executives: [] },
        aiSummary: null,
        source: 'unavailable',
      })
    }
    setLoading(false)
  }, [ticker, data])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const { quote, profile, aiSummary, source } = data ?? {}
  const up = (quote?.change ?? 0) >= 0

  if (loading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex items-center bg-card overflow-hidden">
      {/* Ultra-compact single-line profile bar */}
      <div className="flex items-center gap-3 px-3 py-1 w-full overflow-x-auto min-w-0">
        
        {/* Ticker + Price */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs font-mono font-bold text-foreground">{ticker}</span>
          {quote && (
            <>
              <span className="text-xs font-mono font-bold text-foreground">${quote.price.toFixed(2)}</span>
              <div className={`flex items-center gap-0.5 text-[9px] font-mono font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
                {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                <span>{up ? '+' : ''}{quote.change.toFixed(2)}</span>
                <span className="opacity-75">({up ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-3 bg-border/40 flex-shrink-0" />

        {/* OHLCV */}
        {quote && (
          <div className="flex items-center gap-3 flex-shrink-0 text-[8px] font-mono">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">O</span>
              <span className="text-foreground font-semibold">${quote.open.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">H</span>
              <span className="text-green-400 font-semibold">${quote.high.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">L</span>
              <span className="text-red-400 font-semibold">${quote.low.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">PC</span>
              <span className="text-foreground font-semibold">${quote.prevClose.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">Vol</span>
              <span className="text-foreground font-semibold">{formatVolume(quote.volume)}</span>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-3 bg-border/40 flex-shrink-0" />

        {/* Company info */}
        {profile && (
          <div className="flex items-center gap-3 flex-shrink-0 text-[8px]">
            {profile.exchange && (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Exch</span>
                <span className="text-foreground font-semibold">{profile.exchange}</span>
              </div>
            )}
            {profile.sector && (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Sector</span>
                <span className="text-foreground font-semibold truncate max-w-[50px]">{profile.sector}</span>
              </div>
            )}
            {profile.marketCap > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Cap</span>
                <span className="text-foreground font-semibold">{formatNumber(profile.marketCap).replace('$', '')}</span>
              </div>
            )}
            {profile.industry && (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Industry</span>
                <span className="text-foreground font-semibold truncate max-w-[80px]">{profile.industry}</span>
              </div>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Source + Refresh */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {source && (
            <span className={`text-[7px] font-mono px-1 py-0.5 rounded border ${
              source === 'polygon' ? 'border-green-500/40 text-green-400' : 'border-yellow-500/40 text-yellow-500'
            }`}>
              {source === 'polygon' ? 'POLY' : 'DEMO'}
            </span>
          )}
          <button onClick={fetchData} className="p-0.5 hover:bg-muted/50 rounded" title="Refresh">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
