'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { ArrowLeftRight, RefreshCw, AlertCircle } from 'lucide-react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { TickerInputChips } from '@/components/compare/ticker-input-chips'
import { NormalizedChart } from '@/components/compare/normalized-chart'
import { ComparisonTable } from '@/components/compare/comparison-table'

// Fixed color palette for ticker slots — same colors used in chips, chart, and table
const SLOT_COLORS = [
  '#22c55e', // green
  '#facc15', // gold
  '#06b6d4', // cyan
  '#ef4444', // red
]

const RANGES: Array<{ label: string; value: string }> = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
]

interface CompareResult {
  ticker: string
  ok: boolean
  error?: string
  quote: any | null
  fundamentals: any | null
  profile: any | null
  bars: Array<{ time: string | number; close: number }> | null
}

interface CompareResponse {
  tickers: string[]
  range: string
  results: CompareResult[]
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
})

export default function ComparePage() {
  const [tickers, setTickers] = useState<string[]>(['NVDA', 'AMD'])
  const [range, setRange] = useState<string>('1Y')
  const [chartMode, setChartMode] = useState<'normalized' | 'absolute'>('normalized')

  const queryKey = tickers.length
    ? `/api/compare?tickers=${tickers.join(',')}&range=${range}`
    : null

  const { data, error, isLoading, mutate } = useSWR<CompareResponse>(
    queryKey,
    fetcher,
    {
      revalidateOnFocus: false,
      // Auto-refresh quotes every 60s, fundamentals/bars are server-cached
      refreshInterval: 60_000,
    }
  )

  const results = data?.results ?? []

  const seriesForChart = results.map((r, i) => ({
    ticker: r.ticker,
    bars: r.bars,
    color: SLOT_COLORS[i],
  }))

  const failedTickers = results.filter(r => !r.ok)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavBar />

      <main className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary/20">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold font-mono uppercase tracking-wide">
                Stock Comparison
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground">
                Up to 4 tickers, side-by-side metrics + price chart
              </p>
            </div>
          </div>

          <button
            onClick={() => mutate()}
            disabled={isLoading || tickers.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase border border-border hover:bg-muted/50 disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Ticker Input */}
        <TickerInputChips
          tickers={tickers}
          onChange={setTickers}
          colors={SLOT_COLORS}
          max={4}
        />

        {/* Range + Mode controls */}
        {tickers.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/50">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase mr-2">
                Range
              </span>
              {RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-colors ${
                    range === r.value
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'border border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase mr-2">
                Chart
              </span>
              <button
                onClick={() => setChartMode('normalized')}
                className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-colors ${
                  chartMode === 'normalized'
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'border border-border hover:bg-muted/50 text-muted-foreground'
                }`}
                title="Show % change since start of range"
              >
                % Change
              </button>
              <button
                onClick={() => setChartMode('absolute')}
                className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-colors ${
                  chartMode === 'absolute'
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'border border-border hover:bg-muted/50 text-muted-foreground'
                }`}
                title="Show raw $ price"
              >
                Price ($)
              </button>
            </div>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load comparison: {(error as Error).message}</span>
            <button
              onClick={() => mutate()}
              className="ml-auto px-2 py-0.5 rounded border border-red-500/40 hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        )}

        {failedTickers.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-500 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">
                {failedTickers.length} ticker{failedTickers.length > 1 ? 's' : ''} failed to load
              </div>
              <div className="text-[10px]">
                {failedTickers.map(r => `${r.ticker}: ${r.error || 'unknown error'}`).join(' • ')}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {tickers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <ArrowLeftRight className="w-8 h-8 opacity-40" />
            <p className="text-sm font-mono">Add tickers above to start comparing</p>
            <p className="text-[10px] font-mono opacity-60">Try NVDA, AMD, INTC, TSM</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !data && tickers.length > 0 && (
          <div className="space-y-4">
            <div className="h-80 border border-border rounded-lg bg-card/30 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Chart + Table */}
        {!isLoading && results.length > 0 && (
          <>
            <NormalizedChart series={seriesForChart} mode={chartMode} />
            <ComparisonTable results={results} colors={SLOT_COLORS} />
          </>
        )}
      </main>
    </div>
  )
}
