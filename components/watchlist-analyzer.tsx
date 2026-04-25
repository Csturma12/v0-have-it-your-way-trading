'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SignalCard } from '@/components/signal-card'
import { AlertCircle, Upload } from 'lucide-react'

interface TradingSignal {
  ticker: string
  action: 'BUY' | 'SELL' | 'NO TRADE'
  setup: 'BREAKOUT' | 'PULLBACK' | 'REVERSAL' | 'MOMENTUM' | 'NO SETUP'
  confidence: number
  entry: number | null
  stop: number | null
  target: number | null
  risk_reward: number | null
  reason: string
  invalid_if: string
}

interface AnalysisResult {
  scanner_summary: {
    market_bias: string
    best_opportunity: string
    risk_level: string
    notes: string
  }
  signals: TradingSignal[]
  total_analyzed: number
  total_returned: number
  tradable_signals: number
  no_trade_signals: number
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
      const data = JSON.parse(input)
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: data.tickers || data,
          max_results: 10,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze watchlist')
      }

      setResult(result)
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your watchlist data.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const loadExample = () => {
    const exampleData = {
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
      ],
    }
    setInput(JSON.stringify(exampleData, null, 2))
    setError(null)
  }

  return (
    <div className="w-full space-y-6">
      {/* Input Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Watchlist Data (JSON)</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your watchlist JSON here..."
            className="font-mono text-xs h-64"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAnalyze} disabled={isLoading || !input.trim()} className="flex-1">
            {isLoading ? 'Analyzing...' : 'Analyze Watchlist'}
          </Button>
          <Button variant="outline" onClick={loadExample} disabled={isLoading}>
            Load Example
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Market Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Market Bias</p>
              <p className="text-lg font-semibold text-blue-700 capitalize">
                {result.scanner_summary.market_bias}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Best Opportunity</p>
              <p className="text-sm font-semibold text-green-700">{result.scanner_summary.best_opportunity}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Risk Level</p>
              <p className="text-lg font-semibold text-orange-700 capitalize">
                {result.scanner_summary.risk_level}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Scanner Notes</p>
              <p className="text-sm text-purple-700">{result.scanner_summary.notes}</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg border border-border">
            <div>
              <p className="text-xs text-muted-foreground">Total Analyzed</p>
              <p className="text-lg font-semibold">{result.total_analyzed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Signals Returned</p>
              <p className="text-lg font-semibold">{result.total_returned}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tradable</p>
              <Badge
                variant="default"
                className="bg-green-500/20 text-green-700 border-green-500/30 mt-1"
              >
                {result.tradable_signals}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">No Trade</p>
              <Badge
                variant="default"
                className="bg-gray-500/20 text-gray-700 border-gray-500/30 mt-1"
              >
                {result.no_trade_signals}
              </Badge>
            </div>
          </div>

          {/* Ranked Signals */}
          {result.signals.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Ranked Trading Signals ({result.signals.length})
              </h3>
              <div className="grid gap-3">
                {result.signals.map((signal, idx) => (
                  <div key={`${signal.ticker}-${idx}`} className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/30 rounded-l" />
                    <SignalCard signal={signal} rank={idx + 1} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">No tradable signals found in watchlist.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !error && !isLoading && (
        <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-muted-foreground mb-1">Paste Watchlist Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Include technical indicators and market data for each ticker
          </p>
          <Button variant="outline" onClick={loadExample} size="sm">
            Load Example Data
          </Button>
        </div>
      )}
    </div>
  )
}
