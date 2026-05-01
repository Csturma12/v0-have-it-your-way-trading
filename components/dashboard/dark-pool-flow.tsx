'use client'

import { useMemo } from 'react'
import { RefreshCw, Server, ArrowUp, ArrowDown } from 'lucide-react'
import { useTickerBundle, fmtPremium, fmtPrice, timeAgo, fmtMillions } from '@/hooks/useTickerBundle'
import { WidgetEmptyState } from './widget-empty-state'

export function DarkPoolFlow({ ticker }: { ticker: string }) {
  const { bundle, isLoading, error, refresh } = useTickerBundle(ticker)
  const dp = bundle?.darkPool

  const sentiment = useMemo(() => {
    if (!dp || !dp.totalVol) return null
    const buyPct = (dp.buyVol / dp.totalVol) * 100
    const sellPct = (dp.sellVol / dp.totalVol) * 100
    const neutral = 100 - buyPct - sellPct
    const tone: 'bullish' | 'bearish' | 'neutral' =
      dp.buyVol > dp.sellVol * 1.2 ? 'bullish'
      : dp.sellVol > dp.buyVol * 1.2 ? 'bearish'
      : 'neutral'
    return { buyPct, sellPct, neutral, tone }
  }, [dp])

  if (isLoading && !bundle) {
    return <div className="h-full flex items-center justify-center"><RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" /></div>
  }
  if (error || !bundle) {
    return <WidgetEmptyState type="error" message="Dark pool unavailable" onRetry={() => refresh()} />
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2 py-1 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Server className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Dark Pool</span>
          <span className="text-[8px] font-mono text-muted-foreground">{ticker}</span>
        </div>
        <button onClick={() => refresh()} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Aggregate stats */}
      {dp && (
        <div className="px-2 py-1 border-b border-border/40 flex-shrink-0">
          <div className="grid grid-cols-3 gap-1 text-[8px] font-mono">
            <div className="bg-muted/30 rounded px-1 py-0.5">
              <div className="text-muted-foreground">Prints</div>
              <div className="font-bold">{dp.count}</div>
            </div>
            <div className="bg-muted/30 rounded px-1 py-0.5">
              <div className="text-muted-foreground">Vol</div>
              <div className="font-bold">{fmtMillions(dp.totalVol)}</div>
            </div>
            <div className="bg-muted/30 rounded px-1 py-0.5">
              <div className="text-muted-foreground">B/S Ratio</div>
              <div className={`font-bold ${sentiment?.tone === 'bullish' ? 'text-green-400' : sentiment?.tone === 'bearish' ? 'text-red-400' : ''}`}>
                {dp.sellVol ? (dp.buyVol / dp.sellVol).toFixed(2) : '∞'}
              </div>
            </div>
          </div>
          {/* Sentiment bar */}
          {sentiment && (
            <div className="mt-1">
              <div className="flex h-1.5 rounded overflow-hidden bg-muted/20">
                <div className="bg-green-500/70" style={{ width: `${sentiment.buyPct}%` }} title={`Buy ${sentiment.buyPct.toFixed(0)}%`} />
                <div className="bg-muted-foreground/30" style={{ width: `${Math.max(0, sentiment.neutral)}%` }} title={`Neutral`} />
                <div className="bg-red-500/70" style={{ width: `${sentiment.sellPct}%` }} title={`Sell ${sentiment.sellPct.toFixed(0)}%`} />
              </div>
              <div className="flex justify-between text-[7px] font-mono mt-0.5">
                <span className="text-green-400">Buy {sentiment.buyPct.toFixed(0)}%</span>
                <span className="text-muted-foreground uppercase">{sentiment.tone}</span>
                <span className="text-red-400">Sell {sentiment.sellPct.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print list */}
      <div className="flex-1 overflow-y-auto">
        {!dp?.trades?.length ? (
          <div className="text-[9px] text-muted-foreground text-center py-4 font-mono">
            No dark pool prints for {ticker}
          </div>
        ) : (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-background/95 backdrop-blur border-b border-border/40">
              <tr className="text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-1.5 py-1">Side</th>
                <th className="text-right px-1 py-1">Size</th>
                <th className="text-right px-1 py-1">Price</th>
                <th className="text-right px-1 py-1">Prem</th>
                <th className="text-right px-1.5 py-1">Time</th>
              </tr>
            </thead>
            <tbody>
              {dp.trades.map((t: any, i: number) => {
                const price = parseFloat(t.price ?? '0')
                const ask = parseFloat(t.nbbo_ask ?? '0')
                const bid = parseFloat(t.nbbo_bid ?? '0')
                const side = t.side ||
                  (ask > 0 && price >= ask ? 'buy'
                  : bid > 0 && price <= bid ? 'sell'
                  : 'mid')
                const isBuy = side === 'buy'
                const isSell = side === 'sell'
                return (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-1.5 py-0.5">
                      <span className={`inline-flex items-center gap-0.5 ${isBuy ? 'text-green-400' : isSell ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {isBuy ? <ArrowUp className="w-2 h-2" /> : isSell ? <ArrowDown className="w-2 h-2" /> : <span>–</span>}
                        <span className="uppercase">{side === 'mid' ? 'mid' : side}</span>
                      </span>
                    </td>
                    <td className="px-1 py-0.5 text-right">{fmtMillions(t.size)}</td>
                    <td className="px-1 py-0.5 text-right">{fmtPrice(price)}</td>
                    <td className="px-1 py-0.5 text-right font-bold">{fmtPremium(t.premium)}</td>
                    <td className="px-1.5 py-0.5 text-right text-muted-foreground">{timeAgo(t.executed_at)}</td>
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
