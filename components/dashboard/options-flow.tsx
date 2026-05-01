'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Zap, TrendingUp, TrendingDown, Filter } from 'lucide-react'
import { useTickerBundle, fmtPremium, fmtPrice, timeAgo } from '@/hooks/useTickerBundle'
import { WidgetEmptyState } from './widget-empty-state'

type SideFilter = 'all' | 'calls' | 'puts'

export function OptionsFlow({ ticker }: { ticker: string }) {
  const { bundle, isLoading, error, refresh } = useTickerBundle(ticker)
  const [filter, setFilter] = useState<SideFilter>('all')

  const alerts = bundle?.flowAlerts ?? []

  const filtered = useMemo(() => {
    if (filter === 'all') return alerts
    return alerts.filter(a => {
      const t = String(a.option_chain_id || a.option_symbol || a.type || '').toLowerCase()
      const isCall = t.includes('call') || a.type === 'call' || /[A-Z]\d{6}C\d{8}/.test(t)
      return filter === 'calls' ? isCall : !isCall
    })
  }, [alerts, filter])

  const stats = useMemo(() => {
    if (!alerts.length) return null
    let calls = 0, puts = 0, callPrem = 0, putPrem = 0, sweeps = 0, multilegs = 0
    for (const a of alerts) {
      const prem = parseFloat(a.total_premium ?? a.premium ?? '0')
      const t = String(a.type || a.option_chain_id || '').toLowerCase()
      const isCall = t.includes('call') || /[A-Z]\d{6}C\d{8}/.test(t)
      if (isCall) { calls++; callPrem += prem } else { puts++; putPrem += prem }
      if (a.has_sweep) sweeps++
      if (a.has_multileg) multilegs++
    }
    return { calls, puts, callPrem, putPrem, sweeps, multilegs }
  }, [alerts])

  if (isLoading && !bundle) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (error || !bundle) {
    return <WidgetEmptyState type="error" message="Flow unavailable" onRetry={() => refresh()} />
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2 py-1 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Options Flow</span>
          <span className="text-[8px] font-mono text-muted-foreground">{ticker}</span>
        </div>
        <button onClick={() => refresh()} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Sentiment strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-px bg-border/40 border-b border-border/40 flex-shrink-0">
          <div className="bg-card px-2 py-1">
            <div className="flex items-center gap-1 text-[8px] font-mono text-green-400">
              <TrendingUp className="w-2.5 h-2.5" />
              CALLS · {stats.calls}
            </div>
            <div className="text-[10px] font-mono font-bold text-green-400">{fmtPremium(stats.callPrem)}</div>
          </div>
          <div className="bg-card px-2 py-1">
            <div className="flex items-center gap-1 text-[8px] font-mono text-red-400">
              <TrendingDown className="w-2.5 h-2.5" />
              PUTS · {stats.puts}
            </div>
            <div className="text-[10px] font-mono font-bold text-red-400">{fmtPremium(stats.putPrem)}</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex border-b border-border/40 flex-shrink-0 text-[8px] font-mono">
        {(['all', 'calls', 'puts'] as SideFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-0.5 uppercase tracking-wider transition-colors ${
              filter === f
                ? 'text-foreground bg-muted/40 border-b border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Flow list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-[9px] text-muted-foreground text-center py-4 font-mono">
            No flow alerts for {ticker}
          </div>
        ) : (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-background/95 backdrop-blur border-b border-border/40">
              <tr className="text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-1.5 py-1">Strike</th>
                <th className="text-left px-1 py-1">Exp</th>
                <th className="text-right px-1 py-1">Size</th>
                <th className="text-right px-1 py-1">Prem</th>
                <th className="text-center px-1 py-1">Flags</th>
                <th className="text-right px-1.5 py-1">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const t = String(a.type || a.option_chain_id || '').toLowerCase()
                const isCall = t.includes('call') || /[A-Z]\d{6}C\d{8}/.test(t)
                const strike = parseFloat(a.strike ?? '0')
                const exp = a.expiry || a.expiration || a.option_expiration || '—'
                return (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className={`px-1.5 py-0.5 font-bold ${isCall ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtPrice(strike)} {isCall ? 'C' : 'P'}
                    </td>
                    <td className="px-1 py-0.5 text-muted-foreground">
                      {String(exp).slice(5, 10) || '—'}
                    </td>
                    <td className="px-1 py-0.5 text-right">{a.total_size || a.size || '—'}</td>
                    <td className="px-1 py-0.5 text-right font-bold">
                      {fmtPremium(a.total_premium ?? a.premium)}
                    </td>
                    <td className="px-1 py-0.5 text-center">
                      <span className="inline-flex gap-0.5">
                        {a.has_sweep && <span className="px-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[7px]">SWP</span>}
                        {a.has_multileg && <span className="px-0.5 bg-blue-500/20 text-blue-400 rounded text-[7px]">MLG</span>}
                        {a.all_opening_trades && <span className="px-0.5 bg-purple-500/20 text-purple-400 rounded text-[7px]">OPN</span>}
                      </span>
                    </td>
                    <td className="px-1.5 py-0.5 text-right text-muted-foreground">
                      {timeAgo(a.created_at || a.alert_time || a.executed_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
