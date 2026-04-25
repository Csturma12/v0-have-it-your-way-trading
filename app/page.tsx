'use client'

import { useState } from 'react'
import { WatchlistInput, type WatchlistItem } from '@/components/watchlist-input'
import { SignalsList } from '@/components/signals-list'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, AlertTriangle, Zap } from 'lucide-react'

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
  rank: number | null
}

export default function HomePage() {
  const [signals, setSignals] = useState<TradingSignal[]>([])
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (watchlist: WatchlistItem[]) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze-watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze watchlist')
      }

      setSignals(result.signals || [])
      setSummary(result.summary || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSignals([])
      setSummary('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-balance">Stock Signal Generator</h1>
                <p className="text-sm text-muted-foreground">AI-powered watchlist analysis</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Paper Trading Only
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Input Section - 2 cols */}
            <div className="lg:col-span-2">
              <WatchlistInput onAnalyze={handleAnalyze} isLoading={isLoading} />
            </div>

            {/* Results Section - 3 cols */}
            <div className="lg:col-span-3 space-y-4">
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {signals.length > 0 && <SignalsList signals={signals} summary={summary} />}

              {signals.length === 0 && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 border border-dashed border-border rounded-lg">
                  <Zap className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No Signals Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Add tickers to your watchlist and click &ldquo;Generate Ranked Signals&rdquo; to get AI-powered trading analysis
                  </p>
                  <div className="mt-6 text-xs text-muted-foreground space-y-1">
                    <p>Quality filters applied:</p>
                    <ul className="list-disc list-inside">
                      <li>Confidence &ge; 60%</li>
                      <li>Risk/Reward &ge; 2:1</li>
                      <li>BUY or SELL only (NO TRADE explained when relevant)</li>
                    </ul>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 border border-border rounded-lg bg-muted/20">
                  <div className="animate-pulse space-y-4 w-full">
                    <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
                    <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-20 bg-muted rounded" />
                      <div className="h-20 bg-muted rounded" />
                      <div className="h-20 bg-muted rounded" />
                    </div>
                    <div className="h-32 bg-muted rounded" />
                    <div className="h-32 bg-muted rounded" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-12 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center text-balance">
              <strong>Disclaimer:</strong> This tool is for paper trading and educational purposes only.
              Trading signals are generated by AI and should not be considered financial advice.
              Always do your own research before making any trading decisions.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
