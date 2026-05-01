'use client'

import { useMemo } from 'react'
import { RefreshCw, Crosshair, Target } from 'lucide-react'
import { useTickerBundle, fmtPrice, fmtMillions } from '@/hooks/useTickerBundle'
import { WidgetEmptyState } from './widget-empty-state'

export function KeyLevels({ ticker }: { ticker: string }) {
  const { bundle, isLoading, error, refresh } = useTickerBundle(ticker)

  const data = useMemo(() => {
    if (!bundle) return null
    const price = parseFloat(bundle.state?.close ?? '0')
    // Most recent max-pain (front expiry)
    const maxPainRows = bundle.maxPain ?? []
    const front = maxPainRows[0]
    const maxPain = front ? parseFloat(front.max_pain) : null

    // GEX walls — pick top |total_gex| strikes near spot
    const byStrike = bundle.greekExposureByStrike ?? []
    const enriched = byStrike.map((r: any) => {
      const callGex = parseFloat(r.call_gex ?? '0')
      const putGex = parseFloat(r.put_gex ?? '0')
      const totalGex = callGex + putGex
      return {
        strike: parseFloat(r.strike),
        callGex,
        putGex,
        totalGex,
        callDelta: parseFloat(r.call_delta ?? '0'),
        putDelta: parseFloat(r.put_delta ?? '0'),
      }
    })
    // Top 5 walls by absolute total GEX
    const walls = [...enriched].sort((a, b) => Math.abs(b.totalGex) - Math.abs(a.totalGex)).slice(0, 5)
    // Resistance = positive GEX above spot, Support = negative GEX below
    const resistance = enriched.filter(s => s.strike > price).sort((a, b) => b.callGex - a.callGex)[0]
    const support = enriched.filter(s => s.strike < price).sort((a, b) => Math.abs(b.putGex) - Math.abs(a.putGex))[0]

    return { price, maxPain, walls, resistance, support, expiriesAvail: maxPainRows.length }
  }, [bundle])

  if (isLoading && !bundle) {
    return <div className="h-full flex items-center justify-center"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
  }
  if (error || !bundle || !data) {
    return <WidgetEmptyState type="error" message="Levels unavailable" onRetry={() => refresh()} />
  }

  const { price, maxPain, walls, resistance, support } = data

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-2 py-1 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Key Levels</span>
          <span className="text-[8px] font-mono text-muted-foreground">{ticker}</span>
        </div>
        <button onClick={() => refresh()} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-2">
        {/* Top: Max Pain + Spot */}
        <div className="grid grid-cols-3 gap-1 text-[9px]">
          <div className="bg-muted/30 rounded p-1">
            <div className="text-muted-foreground text-[8px] uppercase">Spot</div>
            <div className="font-mono font-bold">{fmtPrice(price)}</div>
          </div>
          <div className="bg-muted/30 rounded p-1">
            <div className="text-muted-foreground text-[8px] uppercase flex items-center gap-0.5">
              <Target className="w-2.5 h-2.5" /> Max Pain
            </div>
            <div className="font-mono font-bold text-yellow-400">{fmtPrice(maxPain)}</div>
          </div>
          <div className="bg-muted/30 rounded p-1">
            <div className="text-muted-foreground text-[8px] uppercase">Pain Pull</div>
            <div className={`font-mono font-bold ${maxPain && maxPain > price ? 'text-green-400' : 'text-red-400'}`}>
              {maxPain ? ((maxPain - price) / price * 100).toFixed(2) + '%' : '—'}
            </div>
          </div>
        </div>

        {/* Resistance / Support from GEX */}
        <div className="space-y-1">
          {resistance && (
            <div className="flex items-center justify-between bg-red-500/5 border-l-2 border-red-500/60 px-2 py-1 rounded-r">
              <div>
                <div className="text-[8px] font-mono text-red-400 uppercase tracking-wider">Resistance · Call Wall</div>
                <div className="text-[10px] font-mono font-bold">{fmtPrice(resistance.strike)}</div>
              </div>
              <div className="text-[8px] font-mono text-right">
                <div className="text-muted-foreground">Call GEX</div>
                <div className="text-red-400 font-bold">{fmtMillions(resistance.callGex)}</div>
              </div>
            </div>
          )}
          {support && (
            <div className="flex items-center justify-between bg-green-500/5 border-l-2 border-green-500/60 px-2 py-1 rounded-r">
              <div>
                <div className="text-[8px] font-mono text-green-400 uppercase tracking-wider">Support · Put Wall</div>
                <div className="text-[10px] font-mono font-bold">{fmtPrice(support.strike)}</div>
              </div>
              <div className="text-[8px] font-mono text-right">
                <div className="text-muted-foreground">Put GEX</div>
                <div className="text-green-400 font-bold">{fmtMillions(Math.abs(support.putGex))}</div>
              </div>
            </div>
          )}
        </div>

        {/* Top GEX walls table */}
        <div>
          <div className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Top GEX Strikes</div>
          <table className="w-full text-[8px] font-mono">
            <thead className="border-b border-border/40 text-muted-foreground">
              <tr>
                <th className="text-left px-1 py-0.5">Strike</th>
                <th className="text-right px-1 py-0.5">Call GEX</th>
                <th className="text-right px-1 py-0.5">Put GEX</th>
                <th className="text-right px-1 py-0.5">Net</th>
              </tr>
            </thead>
            <tbody>
              {walls.map((w, i) => (
                <tr key={i} className={`border-b border-border/20 ${Math.abs(w.strike - price) < 1 ? 'bg-yellow-500/5' : ''}`}>
                  <td className="px-1 py-0.5 font-bold">{fmtPrice(w.strike)}</td>
                  <td className="px-1 py-0.5 text-right text-red-400">{fmtMillions(w.callGex)}</td>
                  <td className="px-1 py-0.5 text-right text-green-400">{fmtMillions(w.putGex)}</td>
                  <td className={`px-1 py-0.5 text-right font-bold ${w.totalGex >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {fmtMillions(w.totalGex)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
