'use client'

import Link from 'next/link'
import { useState } from 'react'
import { StockInput } from '@/components/stock-input'
import { SignalCard } from '@/components/signal-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'
import { ThemesAndSectors } from '@/components/themes-and-sectors'

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

export default function HomePage() {
  const [signal, setSignal] = useState<TradingSignal | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (data: {
    ticker: string
    price: string
    open: string
    high: string
    low: string
    change: string
    volume: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze')
      }

      setSignal(result.signal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSignal(null)
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
                <h1 className="text-xl font-bold">Stock Signal Generator</h1>
                <p className="text-sm text-muted-foreground">AI-powered trading analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/watchlist">
                <Button variant="outline" size="sm" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Watchlist
                </Button>
              </Link>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Paper Trading Only
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Input Section */}
            <div>
              <StockInput onAnalyze={handleAnalyze} isLoading={isLoading} />
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {signal && <SignalCard signal={signal} />}

              {!signal && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 border border-dashed border-border rounded-lg">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No Signal Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter stock data to generate a trading signal
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 border border-border rounded-lg bg-muted/20">
                  <div className="animate-pulse space-y-4 w-full">
                    <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
                    <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
                    <div className="h-24 bg-muted rounded w-full" />
                    <div className="h-16 bg-muted rounded w-full" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground text-center">
              <strong className="text-foreground/60">Disclaimer:</strong> This tool is for paper trading and educational purposes only.
              Trading signals are generated by AI and should not be considered financial advice.
              Always do your own research before making any trading decisions.
            </p>
          </div>
        </div>

        {/* Themes & Sectors Section */}
        <div className="max-w-7xl mx-auto mt-16 pb-16">
          <ThemesAndSectors
            onSelectTheme={(tickers) => {
              console.log('[v0] Theme tickers selected:', tickers)
            }}
          />
        </div>
        </div>
      </main>
    </div>
  )
}
