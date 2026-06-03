'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { RefreshCw, Radio, Building2, Landmark, Zap, ChevronDown, Radar, TrendingUp, TrendingDown, Activity, BarChart2 } from 'lucide-react'
import { useTickerBundle, fmtPremium, fmtPrice, timeAgo } from '@/hooks/useTickerBundle'
import { WidgetEmptyState } from './widget-empty-state'
import type { RadarItem as RadarItemT, RadarResponse } from '@/lib/radar/types'

type Signal = {
  ts: number
  type: 'flow' | 'congress' | 'insider' | 'technical' | 'radar'
  side: 'bull' | 'bear' | 'neutral'
  title: string
  detail: string
  amount?: number
  isoTime: string
  strength?: number
  ticker?: string
}

type FeedMode = 'ai-signals' | 'pre-move' | 'technical'

const radarFetcher = async (url: string): Promise<RadarResponse> => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

const technicalFetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

export function SignalsFeed({ ticker }: { ticker: string }) {
  const [mode, setMode] = useState<FeedMode>('ai-signals')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // Original ticker bundle for flow/congress/insider signals
  const { bundle, isLoading: bundleLoading, error: bundleError, refresh: refreshBundle } = useTickerBundle(ticker)
  
  // Pre-Move Radar feed (UW data)
  const { data: radarData, isLoading: radarLoading, mutate: refreshRadar } = useSWR<RadarResponse>(
    mode === 'pre-move' ? '/api/radar/uw-feed' : null,
    radarFetcher,
    { refreshInterval: 15_000, revalidateOnFocus: false }
  )
  
  // Technical scanner
  const { data: technicalData, isLoading: technicalLoading, mutate: refreshTechnical } = useSWR(
    mode === 'technical' ? '/api/signals/technical-scanner' : null,
    technicalFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  )

  const signals = useMemo<Signal[]>(() => {
    if (mode === 'pre-move') {
      // Pre-Move Radar items
      const items = radarData?.items ?? []
      return items
        .filter((i: RadarItemT) => !ticker || i.ticker === ticker)
        .slice(0, 50)
        .map((i: RadarItemT) => ({
          ts: i.timestamp,
          type: 'radar' as const,
          side: i.sentiment === 'bullish' ? 'bull' as const : i.sentiment === 'bearish' ? 'bear' as const : 'neutral' as const,
          title: i.title,
          detail: i.detail ?? '',
          amount: i.amount,
          isoTime: new Date(i.timestamp).toISOString(),
          ticker: i.ticker ?? undefined,
        }))
    }
    
    if (mode === 'technical') {
      // Technical scanner signals
      const techSignals = technicalData?.signals ?? []
      return techSignals
        .filter((s: any) => !ticker || s.ticker === ticker)
        .slice(0, 50)
        .map((s: any) => ({
          ts: s.timestamp,
          type: 'technical' as const,
          side: s.signal === 'bullish' ? 'bull' as const : s.signal === 'bearish' ? 'bear' as const : 'neutral' as const,
          title: `${s.ticker} - ${s.title}`,
          detail: s.detail,
          strength: s.strength,
          isoTime: new Date(s.timestamp).toISOString(),
          ticker: s.ticker,
        }))
    }
    
    // Default: AI Signals - flow/congress/insider combined
    if (!bundle) return []
    const list: Signal[] = []

    // Flow alerts
    for (const a of bundle.flowAlerts ?? []) {
      const t = String(a.type || a.option_chain_id || '').toLowerCase()
      const isCall = t.includes('call') || /[A-Z]\d{6}C\d{8}/.test(t)
      const ts = new Date(a.created_at || a.alert_time || 0).getTime()
      list.push({
        ts: Number.isNaN(ts) ? 0 : ts,
        isoTime: a.created_at || a.alert_time,
        type: 'flow',
        side: isCall ? 'bull' : 'bear',
        title: `${isCall ? 'CALL' : 'PUT'} ${a.strike ? fmtPrice(a.strike) : ''} ${a.expiry || a.expiration || ''}`,
        detail: a.has_sweep ? 'Sweep' : a.has_multileg ? 'Multi-leg' : 'Block',
        amount: parseFloat(a.total_premium ?? a.premium ?? '0'),
      })
    }

    // Congressional trades
    for (const c of bundle.congress ?? []) {
      const ts = new Date(c.transaction_date || c.reportDate || 0).getTime()
      const isBuy = String(c.txn_type ?? c.transaction_type ?? '').toLowerCase().includes('buy') ||
                    String(c.txn_type ?? c.transaction_type ?? '').toLowerCase().includes('purchase')
      list.push({
        ts: Number.isNaN(ts) ? 0 : ts,
        isoTime: c.transaction_date,
        type: 'congress',
        side: isBuy ? 'bull' : 'bear',
        title: c.name || c.politician_name || 'Member of Congress',
        detail: `${c.txn_type ?? c.transaction_type ?? 'Trade'} · ${c.amount_range ?? c.amounts ?? ''}`,
        amount: parseFloat(c.amount ?? c.value ?? '0'),
      })
    }

    // Insider transactions
    for (const i of bundle.insider ?? []) {
      const ts = new Date(i.filing_date || i.transaction_date || 0).getTime()
      const isBuy = String(i.transaction_code ?? '').toUpperCase().startsWith('P') ||
                    String(i.transaction_type ?? '').toLowerCase().includes('buy')
      list.push({
        ts: Number.isNaN(ts) ? 0 : ts,
        isoTime: i.filing_date || i.transaction_date,
        type: 'insider',
        side: isBuy ? 'bull' : 'bear',
        title: i.reporter_name || i.insider_name || 'Insider',
        detail: `${i.transaction_type || i.transaction_code || 'Trade'} · ${i.shares ?? '—'} sh`,
        amount: parseFloat(i.value ?? i.transaction_value ?? '0'),
      })
    }

    return list.sort((a, b) => b.ts - a.ts).slice(0, 30)
  }, [bundle, mode, radarData, technicalData, ticker])

  const isLoading = mode === 'ai-signals' ? bundleLoading : mode === 'pre-move' ? radarLoading : technicalLoading
  const error = mode === 'ai-signals' ? bundleError : null
  
  const refresh = () => {
    if (mode === 'ai-signals') refreshBundle()
    else if (mode === 'pre-move') refreshRadar()
    else refreshTechnical()
  }

  if (isLoading && signals.length === 0) {
    return <div className="h-full flex items-center justify-center"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
  }
  if (error && mode === 'ai-signals') {
    return <WidgetEmptyState type="error" message="Signals unavailable" onRetry={refresh} />
  }

  const counts = mode === 'ai-signals' ? {
    flow: signals.filter(s => s.type === 'flow').length,
    congress: signals.filter(s => s.type === 'congress').length,
    insider: signals.filter(s => s.type === 'insider').length,
  } : null

  const modeLabels: Record<FeedMode, { icon: any; label: string; color: string }> = {
    'ai-signals': { icon: Radio, label: 'AI Signals', color: 'text-cyan-400' },
    'pre-move': { icon: Radar, label: 'Pre-Move Radar', color: 'text-emerald-400' },
    technical: { icon: BarChart2, label: 'Technical Scanner', color: 'text-purple-400' },
  }

  const ModeIcon = modeLabels[mode].icon

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-2 py-1 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
          >
            <ModeIcon className={`w-3 h-3 ${modeLabels[mode].color}`} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{modeLabels[mode].label}</span>
            <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[160px]">
              {(Object.entries(modeLabels) as [FeedMode, typeof modeLabels[FeedMode]][]).map(([key, { icon: Icon, label, color }]) => (
                <button
                  key={key}
                  onClick={() => { setMode(key); setIsDropdownOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono hover:bg-muted/50 transition-colors ${mode === key ? 'bg-muted/30' : ''}`}
                >
                  <Icon className={`w-3 h-3 ${color}`} />
                  <span>{label}</span>
                  {mode === key && <span className="ml-auto text-primary">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {mode === 'ai-signals' && <span className="text-[8px] font-mono text-muted-foreground">{ticker}</span>}
          <button onClick={refresh} className="p-0.5 hover:bg-muted/50 rounded">
            <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Source counts - only for ai-signals mode */}
      {mode === 'ai-signals' && counts && (
        <div className="grid grid-cols-3 gap-px bg-border/40 border-b border-border/40 flex-shrink-0 text-[8px] font-mono">
          <div className="bg-card px-1 py-0.5 text-center">
            <span className="text-yellow-400">Flow</span> · <span className="font-bold">{counts.flow}</span>
          </div>
          <div className="bg-card px-1 py-0.5 text-center">
            <span className="text-cyan-400">Congress</span> · <span className="font-bold">{counts.congress}</span>
          </div>
          <div className="bg-card px-1 py-0.5 text-center">
            <span className="text-purple-400">Insider</span> · <span className="font-bold">{counts.insider}</span>
          </div>
        </div>
      )}
      
      {/* Technical scanner summary */}
      {mode === 'technical' && technicalData && (
        <div className="grid grid-cols-2 gap-px bg-border/40 border-b border-border/40 flex-shrink-0 text-[8px] font-mono">
          <div className="bg-card px-1 py-0.5 text-center">
            <span className="text-green-400">Bullish</span> · <span className="font-bold">{signals.filter(s => s.side === 'bull').length}</span>
          </div>
          <div className="bg-card px-1 py-0.5 text-center">
            <span className="text-red-400">Bearish</span> · <span className="font-bold">{signals.filter(s => s.side === 'bear').length}</span>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="text-[9px] text-muted-foreground text-center py-4 font-mono">
            {mode === 'ai-signals' ? `No signals for ${ticker}` : mode === 'pre-move' ? 'No pre-move activity' : 'No technical signals found'}
          </div>
        ) : (
          <ul>
            {signals.map((s, i) => {
              const Icon = s.type === 'flow' ? Zap 
                : s.type === 'congress' ? Landmark 
                : s.type === 'insider' ? Building2 
                : s.type === 'technical' ? Activity
                : Radar
              const sideColor = s.side === 'bull' ? 'text-green-400 border-green-500/40'
                              : s.side === 'bear' ? 'text-red-400 border-red-500/40'
                              : 'text-muted-foreground border-border'
              return (
                <li key={`${s.type}-${i}`} className={`px-2 py-1 border-b border-border/20 hover:bg-muted/20 border-l-2 ${sideColor}`}>
                  <div className="flex items-center justify-between gap-2 text-[8px] font-mono">
                    <span className="flex items-center gap-1 min-w-0 flex-1">
                      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="font-bold truncate">{s.title}</span>
                    </span>
                    <span className="text-muted-foreground flex-shrink-0">{timeAgo(s.isoTime)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[8px] font-mono pl-3.5">
                    <span className="text-muted-foreground truncate">{s.detail}</span>
                    {s.amount ? (
                      <span className={`font-bold flex-shrink-0 ${s.side === 'bull' ? 'text-green-400' : s.side === 'bear' ? 'text-red-400' : ''}`}>
                        {fmtPremium(s.amount)}
                      </span>
                    ) : s.strength ? (
                      <span className={`font-bold flex-shrink-0 ${s.strength >= 75 ? 'text-green-400' : s.strength >= 50 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                        {s.strength}%
                      </span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
