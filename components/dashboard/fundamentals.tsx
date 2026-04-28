'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Fundamentals {
  pe: number | null
  ps: number | null
  pb: number | null
  eps: number | null
  revenue: number | null
  revenuePerShare: number | null
  grossMargin: number | null
  operatingMargin: number | null
  netMargin: number | null
  roe: number | null
  roa: number | null
  debtToEquity: number | null
  currentRatio: number | null
  marketCap: number | null
  employees: number | null
  sector: string | null
  industry: string | null
}

function formatValue(value: number | null, format: 'percent' | 'ratio' | 'count' | 'currency' = 'ratio'): string {
  if (value === null || value === undefined) return '—'
  
  // Percentages from API are already in % form (e.g., 46.2 not 0.462)
  if (format === 'percent') return `${value.toFixed(1)}%`
  if (format === 'ratio') return value.toFixed(2)
  if (format === 'count') return value > 1000000 ? `${(value / 1000000).toFixed(1)}M` : value > 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString()
  if (format === 'currency') {
    if (value > 1000000000000) return `$${(value / 1000000000000).toFixed(2)}T`
    if (value > 1000000000) return `$${(value / 1000000000).toFixed(2)}B`
    if (value > 1000000) return `$${(value / 1000000).toFixed(1)}M`
    return `$${value.toFixed(2)}`
  }
  
  return value.toFixed(2)
}

export function Fundamentals({ ticker = 'AAPL' }: { ticker: string }) {
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')

  const fetchFundamentals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await globalThis.fetch(`/api/polygon/fundamentals?ticker=${ticker}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setFundamentals(data.fundamentals)
      setSource(data.source)
    } catch (err) {
      console.error('[Fundamentals] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchFundamentals()
    const interval = setInterval(fetchFundamentals, 300000) // 5 min
    return () => clearInterval(interval)
  }, [fetchFundamentals])

  if (loading) {
    return (
      <div className="h-full bg-card border border-border rounded-lg p-3 flex items-center justify-center">
        <div className="animate-spin"><RefreshCw className="w-4 h-4 text-muted-foreground" /></div>
      </div>
    )
  }

  if (!fundamentals) {
    return (
      <div className="h-full bg-card border border-border rounded-lg p-3 flex items-center justify-center text-xs text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="h-full bg-card border border-border rounded-lg p-3 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground/70 uppercase">Fundamentals</span>
          <Badge variant="outline" className={`text-[10px] px-1 py-0.5 ${source === 'intrinio' ? 'border-blue-500/50 text-blue-400' : source === 'polygon' ? 'border-green-500/50 text-green-400' : ''}`}>
            {source === 'intrinio' ? 'INTRINIO' : source === 'polygon' ? 'POLYGON' : 'DEMO'}
          </Badge>
        </div>
        <button onClick={fetchFundamentals} className="hover:bg-white/5 p-1 rounded transition-colors">
          <RefreshCw className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
        </button>
      </div>

      {/* Valuation Metrics */}
      <div className="space-y-2 mb-3">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Valuation</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">P/E</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.pe)}</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">P/S</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.ps)}</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">P/B</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.pb)}</div>
          </div>
        </div>
      </div>

      {/* Profitability */}
      <div className="space-y-2 mb-3">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Profitability</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">EPS (TTM)</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.eps, 'currency')}</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">Net Margin</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.netMargin, 'percent')}</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">Operating Margin</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.operatingMargin, 'percent')}</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">Gross Margin</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.grossMargin, 'percent')}</div>
          </div>
        </div>
      </div>

      {/* Returns */}
      <div className="space-y-2 mb-3">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Returns</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">ROE</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.roe, 'percent')}</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">ROA</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.roa, 'percent')}</div>
          </div>
        </div>
      </div>

      {/* Financial Health */}
      <div className="space-y-2 mb-3">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Financial Health</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">Debt/Equity</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.debtToEquity)}</div>
          </div>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[9px] text-muted-foreground/60">Current Ratio</div>
            <div className="text-sm font-semibold">{formatValue(fundamentals.currentRatio)}</div>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="space-y-2 mt-auto pt-2 border-t border-border/20">
        <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Company</div>
        <div className="grid grid-cols-1 gap-1 text-[9px]">
          {fundamentals.marketCap && (
            <div className="flex justify-between">
              <span className="text-muted-foreground/60">Market Cap</span>
              <span className="font-semibold">{formatValue(fundamentals.marketCap, 'currency')}</span>
            </div>
          )}
          {fundamentals.employees && (
            <div className="flex justify-between">
              <span className="text-muted-foreground/60">Employees</span>
              <span className="font-semibold">{formatValue(fundamentals.employees, 'count')}</span>
            </div>
          )}
          {fundamentals.sector && (
            <div className="flex justify-between">
              <span className="text-muted-foreground/60">Sector</span>
              <span className="font-semibold truncate">{fundamentals.sector}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
