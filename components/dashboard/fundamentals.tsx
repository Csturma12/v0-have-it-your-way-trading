'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { WidgetEmptyState } from './widget-empty-state'

interface Fundamentals {
  pe: number | null
  ps: number | null
  pb: number | null
  eps: number | null
  revenueGrowth: number | null
  grossMargin: number | null
  operatingMargin: number | null
  netMargin: number | null
  roe: number | null
  debtToEquity: number | null
  high52w: number | null
  low52w: number | null
  beta: number | null
  divYield: number | null
}

function fmt(value: number | null, type: 'pct' | 'ratio' | 'dollar' = 'ratio'): string {
  if (value === null || value === undefined) return '—'
  if (type === 'pct') return `${value.toFixed(2)}%`
  if (type === 'dollar') return `$${value.toFixed(2)}`
  return value.toFixed(2)
}

export function Fundamentals({ ticker = 'AAPL' }: { ticker: string }) {
  const [data, setData] = useState<Fundamentals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('unknown')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fundamentals come from /api/polygon/fundamentals which itself
      // merges Polygon (basic) + Finnhub /stock/metric (rich) on the
      // server side. Intrinio was removed.
      const polygonRes = await fetch(`/api/polygon/fundamentals?ticker=${ticker}`)

      let f: any = {}
      let src = 'unknown'

      if (polygonRes.ok) {
        const json = await polygonRes.json()
        f = json.fundamentals || {}
        src = json.source || 'polygon'
      }

      setData({
        pe: f.pe || null,
        ps: f.ps || null,
        pb: f.pb || null,
        eps: f.eps || null,
        revenueGrowth: f.revenueGrowth || null,
        grossMargin: f.grossMargin || null,
        operatingMargin: f.operatingMargin || null,
        netMargin: f.netMargin || null,
        roe: f.roe || null,
        debtToEquity: f.debtToEquity || null,
        high52w: f.high52w || null,
        low52w: f.low52w || null,
        beta: f.beta || null,
        divYield: f.divYield || null,
      })
      setSource(src)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fundamentals')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide">Fundamentals</span>
          <span className={`text-[7px] font-mono px-1 py-0 rounded ${source === 'polygon' ? 'bg-green-500/20 text-green-400' : source === 'finnhub' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
            {source === 'polygon' ? 'POLYGON' : source === 'finnhub' ? 'FINNHUB' : 'DEMO'}
          </span>
        </div>
        <button onClick={fetchData} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content — two-column grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && !data ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <WidgetEmptyState type="error" message={error} onRetry={fetchData} />
        ) : !data ? (
          <WidgetEmptyState type="no-ticker" />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
            {/* Left column */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">P/E (TTM)</span>
                <span className="font-mono font-bold">{fmt(data.pe)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">P/B</span>
                <span className="font-mono font-bold">{fmt(data.pb)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EPS (TTM)</span>
                <span className="font-mono font-bold">{fmt(data.eps, 'dollar')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EPS Growth</span>
                <span className="font-mono font-bold text-green-400">{fmt(data.revenueGrowth, 'pct')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operating Margin</span>
                <span className="font-mono font-bold">{fmt(data.operatingMargin, 'pct')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Debt / Equity</span>
                <span className="font-mono font-bold">{fmt(data.debtToEquity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">52w High</span>
                <span className="font-mono font-bold">{fmt(data.high52w, 'dollar')}</span>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PEG</span>
                <span className="font-mono font-bold">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue Growth</span>
                <span className="font-mono font-bold text-green-400">{fmt(data.revenueGrowth, 'pct')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Margin</span>
                <span className="font-mono font-bold">{fmt(data.grossMargin, 'pct')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Margin</span>
                <span className="font-mono font-bold">{fmt(data.netMargin, 'pct')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ROE</span>
                <span className="font-mono font-bold">{fmt(data.roe, 'pct')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">52w Low</span>
                <span className="font-mono font-bold">{fmt(data.low52w, 'dollar')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Beta</span>
                <span className="font-mono font-bold">{data.beta ? fmt(data.beta) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Div Yield</span>
                <span className="font-mono font-bold">{data.divYield ? fmt(data.divYield, 'pct') : '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
