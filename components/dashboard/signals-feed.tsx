'use client'

import { useMemo } from 'react'
import { RefreshCw, Radio, Building2, Landmark, Zap } from 'lucide-react'
import { useTickerBundle, fmtPremium, fmtPrice, timeAgo } from '@/hooks/useTickerBundle'
import { WidgetEmptyState } from './widget-empty-state'

type Signal = {
  ts: number
  type: 'flow' | 'congress' | 'insider'
  side: 'bull' | 'bear' | 'neutral'
  title: string
  detail: string
  amount?: number
  isoTime: string
}

export function SignalsFeed({ ticker }: { ticker: string }) {
  const { bundle, isLoading, error, refresh } = useTickerBundle(ticker)

  const signals = useMemo<Signal[]>(() => {
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
  }, [bundle])

  if (isLoading && !bundle) {
    return <div className="h-full flex items-center justify-center"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
  }
  if (error || !bundle) {
    return <WidgetEmptyState type="error" message="Signals unavailable" onRetry={() => refresh()} />
  }

  const counts = {
    flow: signals.filter(s => s.type === 'flow').length,
    congress: signals.filter(s => s.type === 'congress').length,
    insider: signals.filter(s => s.type === 'insider').length,
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-2 py-1 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Signals</span>
          <span className="text-[8px] font-mono text-muted-foreground">{ticker}</span>
        </div>
        <button onClick={() => refresh()} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Source counts */}
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

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="text-[9px] text-muted-foreground text-center py-4 font-mono">
            No signals for {ticker}
          </div>
        ) : (
          <ul>
            {signals.map((s, i) => {
              const Icon = s.type === 'flow' ? Zap : s.type === 'congress' ? Landmark : Building2
              const sideColor = s.side === 'bull' ? 'text-green-400 border-green-500/40'
                              : s.side === 'bear' ? 'text-red-400 border-red-500/40'
                              : 'text-muted-foreground border-border'
              return (
                <li key={i} className={`px-2 py-1 border-b border-border/20 hover:bg-muted/20 border-l-2 ${sideColor}`}>
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
