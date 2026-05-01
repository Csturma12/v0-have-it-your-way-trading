'use client'

import { useMemo } from 'react'
import { RefreshCw, Activity, Flame } from 'lucide-react'
import { useTickerBundle, fmtNum, fmtPct } from '@/hooks/useTickerBundle'
import { WidgetEmptyState } from './widget-empty-state'

export function IVSurface({ ticker }: { ticker: string }) {
  const { bundle, isLoading, error, refresh } = useTickerBundle(ticker)

  const data = useMemo(() => {
    if (!bundle) return null
    const ivRows = bundle.ivRank ?? []
    const latest = ivRows[0]
    const ivRank1y = latest ? parseFloat(latest.iv_rank_1y) * 100 : null
    const realizedVol = latest ? parseFloat(latest.volatility) * 100 : null

    const term = (bundle.ivTermStructure ?? []).map((r: any) => ({
      expiry: r.expiry,
      iv: parseFloat(r.volatility) * 100,
      impliedMove: parseFloat(r.implied_move),
      impliedMovePct: parseFloat(r.implied_move_perc) * 100,
    })).filter(r => !Number.isNaN(r.iv))
      .sort((a, b) => a.expiry.localeCompare(b.expiry))
      .slice(0, 12)

    return { ivRank1y, realizedVol, term }
  }, [bundle])

  if (isLoading && !bundle) {
    return <div className="h-full flex items-center justify-center"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
  }
  if (error || !bundle || !data) {
    return <WidgetEmptyState type="error" message="IV unavailable" onRetry={() => refresh()} />
  }

  const { ivRank1y, realizedVol, term } = data
  const rankColor = ivRank1y == null ? '' : ivRank1y > 70 ? 'text-red-400' : ivRank1y < 30 ? 'text-green-400' : 'text-yellow-400'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-2 py-1 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">IV Surface</span>
          <span className="text-[8px] font-mono text-muted-foreground">{ticker}</span>
        </div>
        <button onClick={() => refresh()} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-2">
        {/* Top stats */}
        <div className="grid grid-cols-2 gap-1 text-[9px]">
          <div className="bg-muted/30 rounded p-1">
            <div className="text-muted-foreground text-[8px] uppercase flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5" /> IV Rank 1Y
            </div>
            <div className={`font-mono font-bold ${rankColor}`}>
              {ivRank1y == null ? '—' : ivRank1y.toFixed(1) + '%'}
            </div>
          </div>
          <div className="bg-muted/30 rounded p-1">
            <div className="text-muted-foreground text-[8px] uppercase">Realized Vol</div>
            <div className="font-mono font-bold">
              {realizedVol == null ? '—' : realizedVol.toFixed(1) + '%'}
            </div>
          </div>
        </div>

        {/* Term structure */}
        <div>
          <div className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">
            Term Structure / Expected Moves
          </div>
          {term.length === 0 ? (
            <div className="text-[9px] text-muted-foreground text-center py-4 font-mono">No term structure data</div>
          ) : (
            <table className="w-full text-[8px] font-mono">
              <thead className="border-b border-border/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-1 py-0.5">Expiry</th>
                  <th className="text-right px-1 py-0.5">IV</th>
                  <th className="text-right px-1 py-0.5">Move ±$</th>
                  <th className="text-right px-1 py-0.5">Move ±%</th>
                </tr>
              </thead>
              <tbody>
                {term.map((r, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-1 py-0.5">{r.expiry}</td>
                    <td className="px-1 py-0.5 text-right font-bold">{r.iv.toFixed(1)}%</td>
                    <td className="px-1 py-0.5 text-right">${fmtNum(r.impliedMove)}</td>
                    <td className="px-1 py-0.5 text-right text-yellow-400">±{r.impliedMovePct.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
