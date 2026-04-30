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
    setLoading(true)
    try {
      const res = await fetch(`/api/polygon/profile?ticker=${ticker}`)
      if (res.ok) {
        const json = await res.json()
        if (json.profile || json.quote) {
          setData({
            quote:     json.quote     ?? null,
            profile:   json.profile   ?? null,
            aiSummary: json.aiSummary ?? null,
            source:    json.source    ?? 'polygon',
          })
          return
        }
      }
    } catch { /* fall through */ }
    setData({
      quote: null,
      profile: { name: ticker, exchange: '', description: 'No data available.', sector: '', industry: '', ceo: '', employees: 0, marketCap: 0, website: '', executives: [] },
      aiSummary: null,
      source: 'unavailable',
    })
  }, [ticker])

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
    <div className="h-full flex flex-col bg-card overflow-hidden">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border flex-shrink-0 bg-card/80">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground">Company Profile</span>
        </div>
        <div className="flex items-center gap-2">
          {source && (
            <span className={`text-[8px] font-mono border px-1.5 py-0.5 rounded ${
              source === 'polygon' ? 'border-green-500/40 text-green-400' : 'border-yellow-500/40 text-yellow-500'
            }`}>
              {source === 'polygon' ? 'POLYGON' : source === 'intrinio' ? 'INTRINIO' : 'DEMO'}
            </span>
          )}
          <button onClick={fetchData} className="p-1 hover:bg-muted/50 rounded" title="Refresh">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT — price / OHLCV */}
        <div className="w-[42%] flex-shrink-0 flex flex-col justify-center px-3 py-2 border-r border-border gap-2">

          {/* Ticker + name + exchange */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold font-mono text-foreground">{ticker}</span>
            {profile?.name && profile.name !== ticker && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{profile.name}</span>
            )}
            {profile?.exchange && (
              <span className="text-[8px] font-mono border border-border/60 bg-muted/30 text-muted-foreground px-1.5 py-0.5 rounded">
                {profile.exchange}
              </span>
            )}
          </div>

          {/* Price + change */}
          {quote ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono">${quote.price.toFixed(2)}</span>
                <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
                  {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {up ? '+' : ''}{quote.change.toFixed(2)}&nbsp;
                  <span className="opacity-80">({up ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
                </div>
              </div>

              {/* After-hours */}
              {quote.afterHoursPrice && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  AH&nbsp;
                  <span className="text-foreground">${quote.afterHoursPrice.toFixed(2)}</span>
                  {' '}
                  <span className={quote.afterHoursChange && quote.afterHoursChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {quote.afterHoursChange && quote.afterHoursChange >= 0 ? '+' : ''}
                    {quote.afterHoursChange?.toFixed(2)} ({quote.afterHoursChangePercent?.toFixed(2)}%)
                  </span>
                </div>
              )}

              {/* OHLCV grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground w-5">O</span>
                  <span className="text-foreground">${quote.open.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground w-5">H</span>
                  <span className="text-green-400">${quote.high.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground w-5">L</span>
                  <span className="text-red-400">${quote.low.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground w-5">C</span>
                  <span className="text-foreground">${quote.prevClose.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="text-muted-foreground w-5">V</span>
                  <span className="text-foreground">{formatVolume(quote.volume)}</span>
                </div>
              </div>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground">No quote data</span>
          )}
        </div>

        {/* RIGHT — company info */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Sub-tabs */}
          <div className="flex border-b border-border flex-shrink-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-1 text-[9px] font-mono font-bold tracking-wide transition-colors ${
                activeTab === 'profile'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              PROFILE
            </button>
            <button
              onClick={() => setActiveTab('executives')}
              className={`flex-1 py-1 text-[9px] font-mono font-bold tracking-wide transition-colors ${
                activeTab === 'executives'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EXECS
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">

            {activeTab === 'profile' && profile && (
              <>
                {/* AI summary */}
                {aiSummary && (
                  <div className="bg-primary/5 border border-primary/20 rounded p-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="w-2.5 h-2.5 text-primary" />
                      <span className="text-[8px] font-semibold text-primary uppercase tracking-wide">AI Summary</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-3">{aiSummary}</p>
                  </div>
                )}

                {/* Description */}
                {profile.description && profile.description !== 'No data available.' && (
                  <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-4">
                    {profile.description}
                  </p>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
                  {profile.sector && (
                    <div>
                      <span className="text-muted-foreground block">Sector</span>
                      <span className="font-medium">{profile.sector}</span>
                    </div>
                  )}
                  {profile.industry && (
                    <div>
                      <span className="text-muted-foreground block">Industry</span>
                      <span className="font-medium">{profile.industry}</span>
                    </div>
                  )}
                  {profile.marketCap > 0 && (
                    <div>
                      <span className="text-muted-foreground block">Mkt Cap</span>
                      <span className="font-mono font-medium">{formatNumber(profile.marketCap)}</span>
                    </div>
                  )}
                  {profile.employees > 0 && (
                    <div>
                      <span className="text-muted-foreground block">Employees</span>
                      <span className="font-mono font-medium">{profile.employees.toLocaleString()}</span>
                    </div>
                  )}
                  {profile.ceo && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground block">CEO</span>
                      <span className="font-medium">{profile.ceo}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'executives' && profile?.executives && (
              <div className="space-y-1">
                {profile.executives.slice(0, 8).map((exec, i) => (
                  <div key={i} className="flex items-start gap-1.5 p-1.5 rounded bg-muted/30">
                    <Users className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[9px] font-medium truncate">{exec.name}</div>
                      <div className="text-[8px] text-muted-foreground truncate">{exec.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
