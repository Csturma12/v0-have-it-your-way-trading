'use client'

import { useMemo } from 'react'
import { RefreshCw, BarChart2 } from 'lucide-react'
import { useTickerBundle, fmtMillions, fmtPrice } from '@/hooks/useTickerBundle'
import { WidgetEmptyState } from './widget-empty-state'

/**
 * Parses an OCC option symbol like "NVDA250620C00200000" into
 * { underlying, expiry: "2025-06-20", side: "C", strike: 200 }.
 * Returns nulls if it can't parse — falls back gracefully.
 */
function parseOcc(sym: string | undefined) {
  if (!sym || typeof sym !== 'string') return { exp: null, side: null, strike: null }
  const m = sym.match(/^[A-Z]+(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/)
  if (!m) return { exp: null, side: null, strike: null }
  const [, yy, mm, dd, side, strikeStr] = m
  const exp = `20${yy}-${mm}-${dd}`
  const strike = parseInt(strikeStr, 10) / 1000
  return { exp, side: side as 'C' | 'P', strike }
}

export function OiChanges({ ticker }: { ticker: string }) {
  const { bundle, isLoading, error, refresh } = useTickerBundle(ticker)

  const rows = useMemo(() => {
    if (!bundle?.oiChange) return []
    return bundle.oiChange.map((r: any) => {
      const occ = parseOcc(r.option_symbol)
      const oiCurr = parseInt(r.curr_oi ?? r.current_oi ?? '0', 10)
      const oiPrev = parseInt(r.prev_oi ?? r.previous_oi ?? '0', 10)
      const oiDelta = oiCurr - oiPrev
      const oiPct = oiPrev > 0 ? (oiDelta / oiPrev) * 100 : 0
      return {
        symbol: r.option_symbol,
        strike: occ.strike,
        side: occ.side,
        exp: occ.exp,
        volume: parseInt(r.volume ?? '0', 10),
        oi: oiCurr,
        oiDelta,
        oiPct,
        avgPrice: parseFloat(r.avg_price ?? '0'),
      }
    }).sort((a: any, b: any) => Math.abs(b.oiDelta) - Math.abs(a.oiDelta)).slice(0, 25)
  }, [bundle])

  if (isLoading && !bundle) {
    return <div className="h-full flex items-center justify-center"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
  }
  if (error || !bundle) {
    return <WidgetEmptyState type="error" message="OI changes unavailable" onRetry={() => refresh()} />
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-2 py-1 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">OI Changes</span>
          <span className="text-[8px] font-mono text-muted-foreground">{ticker}</span>
        </div>
        <button onClick={() => refresh()} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="text-[9px] text-muted-foreground text-center py-4 font-mono">No OI data</div>
        ) : (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-background/95 backdrop-blur border-b border-border/40">
              <tr className="text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-1.5 py-1">Strike</th>
                <th className="text-left px-1 py-1">Exp</th>
                <th className="text-right px-1 py-1">Vol</th>
                <th className="text-right px-1 py-1">OI</th>
                <th className="text-right px-1.5 py-1">ΔOI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => {
                const isCall = r.side === 'C'
                return (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className={`px-1.5 py-0.5 font-bold ${isCall ? 'text-green-400' : 'text-red-400'}`}>
                      {r.strike != null ? `${fmtPrice(r.strike)} ${r.side}` : (r.symbol || '—').slice(-12)}
                    </td>
                    <td className="px-1 py-0.5 text-muted-foreground">{r.exp ? r.exp.slice(5, 10) : '—'}</td>
                    <td className="px-1 py-0.5 text-right">{fmtMillions(r.volume)}</td>
                    <td className="px-1 py-0.5 text-right">{fmtMillions(r.oi)}</td>
                    <td className={`px-1.5 py-0.5 text-right font-bold ${r.oiDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.oiDelta >= 0 ? '+' : ''}{fmtMillions(r.oiDelta)}
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
