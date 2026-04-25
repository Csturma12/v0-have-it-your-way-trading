'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SignalsList, type TradingSignal, type ScannerSummary } from '@/components/signals-list'
import { AlertCircle, FileJson } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface AnalysisResult {
  scanner_summary: ScannerSummary
  signals: TradingSignal[]
  total_analyzed: number
}

const EXAMPLE_PAYLOAD = {
  timeframe: '15m',
  market_session: 'regular',
  account_context: {
    paper_trading: true,
    buying_power: 10000,
    max_risk_per_trade_pct: 1,
    max_position_value: 1000,
  },
  tickers: [
    {
      ticker: 'AAPL',
      current_price: 185.42,
      rsi_14: 61.3,
      ema_9: 184.8,
      ema_21: 183.9,
      ema_50: 181.7,
      vwap: 184.6,
      atr_14: 2.15,
      volume: 74200000,
      avg_volume_20: 61500000,
      trend: 'bullish',
      above_vwap: true,
      support: [183.5, 181.8],
      resistance: [186.2, 188.9],
    },
    {
      ticker: 'NVDA',
      current_price: 912.5,
      rsi_14: 68.7,
      ema_9: 905.2,
      ema_21: 893.4,
      ema_50: 862.1,
      vwap: 908.3,
      atr_14: 18.4,
      volume: 47800000,
      avg_volume_20: 38200000,
      trend: 'bullish',
      above_vwap: true,
      support: [895.0, 880.5],
      resistance: [925.0, 940.0],
    },
    {
      ticker: 'TSLA',
      current_price: 242.1,
      rsi_14: 72.5,
      ema_9: 238.4,
      ema_21: 229.8,
      ema_50: 215.6,
      vwap: 240.2,
      atr_14: 8.9,
      volume: 98500000,
      avg_volume_20: 81300000,
      trend: 'bullish',
      above_vwap: true,
      support: [235.0, 228.5],
      resistance: [248.0, 255.0],
    },
    {
      ticker: 'META',
      current_price: 505.7,
      rsi_14: 48.1,
      ema_9: 508.2,
      ema_21: 511.4,
      ema_50: 498.7,
      vwap: 507.3,
      atr_14: 9.2,
      volume: 18300000,
      avg_volume_20: 17900000,
      trend: 'bearish',
      above_vwap: false,
      support: [498.0, 492.5],
      resistance: [510.0, 518.0],
    },
  ],
}

export function WatchlistAnalyzer() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!input.trim()) {
      setError('Please paste watchlist JSON data')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const parsed = JSON.parse(input)
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze watchlist')
      }

      setResult(data)
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON. Please check your formatting and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const loadExample = () => {
    setInput(JSON.stringify(EXAMPLE_PAYLOAD, null, 2))
    setError(null)
  }

  return (
    <div className="w-full space-y-6">
      {/* Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Watchlist JSON</label>
          <Button variant="ghost" size="sm" onClick={loadExample} disabled={isLoading} className="text-xs gap-1.5">
            <FileJson className="w-3.5 h-3.5" />
            Load Example
          </Button>
        </div>
        <Textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null) }}
          placeholder={'{\n  "timeframe": "15m",\n  "tickers": [...]\n}'}
          className="font-mono text-xs h-64 resize-none"
          spellCheck={false}
        />

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={isLoading || !input.trim()}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <><Spinner className="mr-2" />Analyzing...</>
          ) : (
            'Analyze Watchlist'
          )}
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-28 bg-muted rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      )}

      {/* Results */}
      {!isLoading && result && (
        <SignalsList signals={result.signals} scanner_summary={result.scanner_summary} />
      )}

      {/* Empty state */}
      {!isLoading && !result && !error && (
        <div className="flex flex-col items-center justify-center min-h-[260px] p-8 text-center border border-dashed border-border rounded-xl bg-muted/20">
          <FileJson className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-medium text-foreground">Paste Watchlist JSON</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs text-balance">
            Include technical indicators (RSI, EMA, VWAP, ATR) and support/resistance for best results.
          </p>
          <Button variant="outline" size="sm" onClick={loadExample} className="mt-4">
            Load Example Data
          </Button>
        </div>
      )}
    </div>
  )
}
