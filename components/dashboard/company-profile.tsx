'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, TrendingUp, TrendingDown, Users, RefreshCw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  return num.toLocaleString()
}

function formatVolume(vol: number): string {
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`
  return vol.toString()
}

export function CompanyProfile({ ticker }: CompanyProfileProps) {
  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'executives'>('profile')
  const [source, setSource] = useState<string>('unknown')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setData(null)
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
          return
        }
      }
    } catch {
      // fall through
    }
    // Minimal fallback so the widget still renders with the correct ticker
    setData({
      quote: null,
      profile: { name: ticker, exchange: '', description: 'No data available.', sector: '', industry: '', ceo: '', employees: 0, marketCap: 0, website: '', executives: [] },
      aiSummary: null,
      source: 'unavailable',
    })
    setSource('unavailable')
  }, [ticker])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading && !data) {
    return (
      <div className="h-full flex flex-col bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-theme-green" />
            <span className="font-semibold text-sm">Company Profile</span>
          </div>
          <Badge variant="outline" className="text-[9px] animate-pulse">Loading...</Badge>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const { quote, profile, aiSummary } = data || {}

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Quote Section */}
      <div className="p-3 border-b border-border bg-card/80">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">{ticker}</span>
              <span className="text-xs text-muted-foreground">{profile?.name || ticker}</span>
              {profile?.exchange && (
                <span className="text-[9px] px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground">
                  {profile.exchange}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="outline" 
              className={`text-[9px] ${source === 'mock' ? 'border-yellow-500/50 text-yellow-500' : 'border-theme-green/50 text-theme-green'}`}
            >
              {source === 'mock' ? 'DEMO' : 'LIVE'}
            </Badge>
            <button 
              onClick={fetchData}
              className="p-1 hover:bg-muted/50 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {quote && (
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold font-mono">${quote.price.toFixed(2)}</span>
            <div className={`flex items-center gap-1 ${quote.change >= 0 ? 'text-theme-green' : 'text-red-500'}`}>
              {quote.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-mono font-semibold">
                {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
              </span>
              <span className="font-mono text-sm">
                ({quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        {quote?.afterHoursPrice && (
          <div className="mt-1 text-xs text-muted-foreground">
            <span>After: </span>
            <span className="font-mono">${quote.afterHoursPrice.toFixed(2)}</span>
            <span className={quote.afterHoursChange && quote.afterHoursChange >= 0 ? 'text-theme-green' : 'text-red-500'}>
              {' '}{quote.afterHoursChange && quote.afterHoursChange >= 0 ? '+' : ''}{quote.afterHoursChange?.toFixed(2)} ({quote.afterHoursChangePercent?.toFixed(2)}%)
            </span>
          </div>
        )}

        {quote && (
          <div className="grid grid-cols-4 gap-2 mt-3 text-[10px]">
            <div>
              <span className="text-muted-foreground">Open</span>
              <div className="font-mono">${quote.open.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">High</span>
              <div className="font-mono text-theme-green">${quote.high.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Low</span>
              <div className="font-mono text-red-500">${quote.low.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Vol</span>
              <div className="font-mono">{formatVolume(quote.volume)}</div>
            </div>
          </div>
        )}
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="px-3 py-2 border-b border-border bg-theme-green/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-theme-green" />
            <span className="text-[9px] font-semibold text-theme-green uppercase tracking-wide">AI Summary</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{aiSummary}</p>
        </div>
      )}

      {/* Profile Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'profile'
              ? 'text-theme-green border-b-2 border-theme-green bg-theme-green/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('executives')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'executives'
              ? 'text-theme-green border-b-2 border-theme-green bg-theme-green/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Key Executives
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'profile' && profile && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{profile.description}</p>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-muted-foreground">Sector</span>
                <div className="font-medium">{profile.sector}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Industry</span>
                <div className="font-medium">{profile.industry}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Market Cap</span>
                <div className="font-mono font-medium">{formatNumber(profile.marketCap)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Employees</span>
                <div className="font-mono font-medium">{profile.employees.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'executives' && profile?.executives && (
          <div className="space-y-2">
            {profile.executives.map((exec, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium">{exec.name}</div>
                  <div className="text-[10px] text-muted-foreground">{exec.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
