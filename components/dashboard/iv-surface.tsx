'use client'

import { useMemo } from 'react'
import { RefreshCw, Activity, Flame, TrendingUp, TrendingDown } from 'lucide-react'
import { useTickerBundle, fmtNum } from '@/hooks/useTickerBundle'
import { WidgetEmptyState } from './widget-empty-state'

/**
 * IV Surface — volatility regime panel.
 *
 * Data sources (all via useTickerBundle / Phase 1 vol suite):
 *   - ivRank             : current IV rank vs 1y range
 *   - volatilityStats    : current iv/rv + 52w high/low for both
 *   - realizedVol        : daily IV vs RV time series (RV shifted -30d
 *                          so historical underpricing/overpricing is
 *                          visually obvious)
 *   - ivTermStructure    : per-expiry IV + expected $ and % moves
 *
 * "IV > RV" means options are pricing in more vol than the stock has
 * actually delivered — premium-sellers' market. "IV < RV" is the
 * opposite — premium-buyers' market (rarer).
 */

// Visual: where value sits within [low, high] as a 0-100% bar.
function rangePosition(value: number, low: number, high: number): number {
  if (high <= low) return 50
  const pct = ((value - low) / (high - low)) * 100
  return Math.max(0, Math.min(100, pct))
}

export function IVSurface({ ticker }: { ticker: string }) {
  const { bundle, isLoading, error, refresh } = useTickerBundle(ticker)

  const data = useMemo(() => {
    if (!bundle) return null
    const ivRows = bundle.ivRank ?? []
    const latest = ivRows[0]
    const ivRank1y = latest ? parseFloat(latest.iv_rank_1y) * 100 : null

    // Volatility stats: prefer fresh 52w stats over the simpler latest IV
    // from ivRank — the stats endpoint gives us iv_high/iv_low/rv_high/
    // rv_low for a real range bar.
    const stats = (bundle.volatilityStats ?? [])[0] ?? null
    const iv      = stats ? parseFloat(stats.iv)       * 100 : (latest ? parseFloat(latest.volatility) * 100 : null)
    const ivHigh  = stats ? parseFloat(stats.iv_high)  * 100 : null
    const ivLow   = stats ? parseFloat(stats.iv_low)   * 100 : null
    const rv      = stats ? parseFloat(stats.rv)       * 100 : null
    const rvHigh  = stats ? parseFloat(stats.rv_high)  * 100 : null
    const rvLow   = stats ? parseFloat(stats.rv_low)   * 100 : null

    // IV vs realized comparison: take the most recent ~20 trading days
    // of the realizedVol series and compute how often IV exceeded RV
    // (premium-sellers' edge) and the average spread.
    const rvSeries = bundle.realizedVol ?? []
    const recent = rvSeries.slice(-20)
    let ivOverRvCount = 0
    let totalSpread = 0
    let validRows = 0
    for (const r of recent) {
      const rIv = parseFloat(r.implied_volatility)
      const rRv = parseFloat(r.realized_volatility)
      if (!Number.isFinite(rIv) || !Number.isFinite(rRv)) continue
      validRows++
      if (rIv > rRv) ivOverRvCount++
      totalSpread += (rIv - rRv) * 100
    }
    const ivOverRvPct = validRows > 0 ? (ivOverRvCount / validRows) * 100 : null
    const avgSpread   = validRows > 0 ? totalSpread / validRows : null

    const term = (bundle.ivTermStructure ?? []).map((r: any) => ({
      expiry: r.expiry,
      iv: parseFloat(r.volatility) * 100,
      impliedMove: parseFloat(r.implied_move),
      impliedMovePct: parseFloat(r.implied_move_perc) * 100,
    })).filter(r => !Number.isNaN(r.iv))
      .sort((a, b) => a.expiry.localeCompare(b.expiry))
      .slice(0, 12)

    return {
      ivRank1y, iv, ivHigh, ivLow, rv, rvHigh, rvLow,
      ivOverRvPct, avgSpread, term,
    }
  }, [bundle])

  if (isLoading && !bundle) {
    return <div className="h-full flex items-center justify-center"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
  }
  if (error || !bundle || !data) {
    return <WidgetEmptyState type="error" message="IV unavailable" onRetry={() => refresh()} />
  }

  const { ivRank1y, iv, ivHigh, ivLow, rv, rvHigh, rvLow,
          ivOverRvPct, avgSpread, term } = data
  const rankColor = ivRank1y == null ? '' : ivRank1y > 70 ? 'text-red-400' : ivRank1y < 30 ? 'text-green-400' : 'text-yellow-400'

  // IV vs RV regime — green when IV >> RV (sellers' edge), red when IV < RV.
  const regimeIcon = avgSpread == null ? null
    : avgSpread > 2 ? <TrendingUp className="w-2.5 h-2.5" />
    : avgSpread < -2 ? <TrendingDown className="w-2.5 h-2.5" />
    : null
  const regimeColor = avgSpread == null ? ''
    : avgSpread > 2 ? 'text-green-400'
    : avgSpread < -2 ? 'text-red-400'
    : 'text-yellow-400'
  const regimeLabel = avgSpread == null ? '—'
    : avgSpread > 2 ? 'IV > RV'
    : avgSpread < -2 ? 'IV < RV'
    : 'IV ≈ RV'

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
        {/* Top stats: IV Rank + 20d regime call */}
        <div className="grid grid-cols-2 gap-1 text-[9px]">
          <div className="bg-muted/30 rounded p-1">
            <div className="text-muted-foreground text-[8px] uppercase flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5" /> IV Rank 1Y
            </div>
            <div className={`font-mono font-bold ${rankColor}`}>
              {ivRank1y == null ? '—' : ivRank1y.toFixed(1) + '%'}
            </div>
          </div>
          <div className="bg-muted/30 rounded p-1" title="Average IV minus RV over last 20 days. Positive = options have been overpricing realized vol (sellers' edge).">
            <div className="text-muted-foreground text-[8px] uppercase flex items-center gap-0.5">
              {regimeIcon} 20D Regime
            </div>
            <div className={`font-mono font-bold ${regimeColor}`}>
              {regimeLabel}
              {avgSpread != null && (
                <span className="ml-1 text-[8px] text-muted-foreground font-normal">
                  {avgSpread >= 0 ? '+' : ''}{avgSpread.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* IV / RV 52w range bars — shows where current value sits in
            the past year's range. Red dot left=cheap, right=expensive.
            Bar fills from low to high; the dot marks the current value. */}
        {(ivHigh != null && ivLow != null && iv != null) && (
          <div className="space-y-1">
            <div className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">
              52-Week Range
            </div>

            {/* IV row */}
            <div className="flex items-center gap-1.5 text-[8px] font-mono">
              <span className="w-4 text-muted-foreground">IV</span>
              <span className="w-8 text-right">{ivLow.toFixed(0)}%</span>
              <div className="flex-1 relative h-2 bg-muted/30 rounded">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400"
                  style={{ left: `calc(${rangePosition(iv, ivLow, ivHigh)}% - 3px)` }}
                  title={`Current IV: ${iv.toFixed(1)}%`}
                />
              </div>
              <span className="w-8">{ivHigh.toFixed(0)}%</span>
              <span className="w-12 text-right text-blue-400 font-bold">{iv.toFixed(1)}%</span>
            </div>

            {/* RV row */}
            {(rvHigh != null && rvLow != null && rv != null) && (
              <div className="flex items-center gap-1.5 text-[8px] font-mono">
                <span className="w-4 text-muted-foreground">RV</span>
                <span className="w-8 text-right">{rvLow.toFixed(0)}%</span>
                <div className="flex-1 relative h-2 bg-muted/30 rounded">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-orange-400"
                    style={{ left: `calc(${rangePosition(rv, rvLow, rvHigh)}% - 3px)` }}
                    title={`Current RV: ${rv.toFixed(1)}%`}
                  />
                </div>
                <span className="w-8">{rvHigh.toFixed(0)}%</span>
                <span className="w-12 text-right text-orange-400 font-bold">{rv.toFixed(1)}%</span>
              </div>
            )}

            {ivOverRvPct != null && (
              <div className="text-[8px] font-mono text-muted-foreground pt-0.5">
                IV exceeded RV on {ivOverRvPct.toFixed(0)}% of last 20 days
              </div>
            )}
          </div>
        )}

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
