'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TrendingUp, AlertTriangle, ChevronRight, Activity, Target, Shield } from 'lucide-react'

interface Signal {
  rank: number
  ticker: string
  action: 'BUY' | 'SELL' | 'NO TRADE'
  setup: string
  confidence: number
  entry: number | null
  stop: number | null
  target: number | null
  risk_reward: number | null
  reason: string
  invalid_if: string
  risk_notes?: string[]
}

interface WatchlistResponse {
  scanner_summary: {
    market_bias: string
    best_opportunity: string
    risk_level: string
    notes: string
  }
  signals: Signal[]
  total_analyzed: number
  signals_returned: number
}

export default function WatchlistAnalyzerPage() {
  const [watchlistJson, setWatchlistJson] = useState('')
  const [result, setResult] = useState<WatchlistResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      let watchlist
      try {
        watchlist = JSON.parse(watchlistJson)
      } catch {
        throw new Error('Invalid JSON format')
      }

      if (!Array.isArray(watchlist)) {
        throw new Error('Watchlist must be an array of stock objects')
      }

      if (watchlist.length === 0) {
        throw new Error('Watchlist cannot be empty')
      }

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(watchlist),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze watchlist')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskLevelColor = (level: string) => {
    const lower = level.toLowerCase()
    if (lower.includes('low')) return 'bg-green-500/10 text-green-600 border-green-500/20'
    if (lower.includes('high') || lower.includes('extreme'))
      return 'bg-red-500/10 text-red-600 border-red-500/20'
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  }

  const getActionColor = (action: string) => {
    if (action === 'BUY') return 'bg-green-500/10 text-green-600 border-green-500/20'
    if (action === 'SELL') return 'bg-red-500/10 text-red-600 border-red-500/20'
    return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'from-green-400 to-green-600'
    if (confidence >= 0.7) return 'from-blue-400 to-blue-600'
    if (confidence >= 0.6) return 'from-yellow-400 to-yellow-600'
    return 'from-gray-400 to-gray-600'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Watchlist Analyzer</h1>
                <p className="text-sm text-muted-foreground">Ranked trading signals from your watchlist</p>
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
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Input Section */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Watchlist Input</h2>
                  <p className="text-xs text-muted-foreground mt-1">Paste JSON array of stocks</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    value={watchlistJson}
                    onChange={(e) => setWatchlistJson(e.target.value)}
                    placeholder={`[
  {
    "ticker": "AAPL",
    "price": 150.25,
    "open": 149.50,
    "high": 151.00,
    "low": 149.25,
    "change": 0.5,
    "volume": 45000000
  },
  ...
]`}
                    className="w-full h-48 p-3 text-xs bg-muted border border-border rounded-lg font-mono resize-none"
                  />

                  <Button
                    onClick={handleAnalyze}
                    disabled={isLoading || !watchlistJson.trim()}
                    className="w-full"
                  >
                    {isLoading ? 'Analyzing...' : 'Analyze Watchlist'}
                  </Button>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-2 space-y-6">
              {!result && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 border border-dashed border-border rounded-lg">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No Results Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Paste your watchlist JSON to generate signals
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border border-border rounded-lg animate-pulse">
                      <div className="h-8 bg-muted rounded w-1/4 mb-3" />
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {result && (
                <>
                  {/* Scanner Summary */}
                  <Card className="border-border">
                    <CardHeader className="bg-muted/50 border-b border-border">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Market Overview</h3>
                          <Badge
                            variant="outline"
                            className={getRiskLevelColor(result.scanner_summary.risk_level)}
                          >
                            {result.scanner_summary.risk_level}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Analyzed {result.total_analyzed} stocks • {result.signals_returned} signals qualified
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Market Bias</p>
                        <p className="text-sm font-medium capitalize">{result.scanner_summary.market_bias}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Best Opportunity</p>
                        <p className="text-sm font-medium">{result.scanner_summary.best_opportunity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Summary Notes</p>
                        <p className="text-sm">{result.scanner_summary.notes}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Signals */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Ranked Signals</h3>
                    {result.signals.length === 0 ? (
                      <div className="p-6 border border-dashed border-border rounded-lg text-center text-muted-foreground">
                        No qualifying signals met the quality threshold (RR ≥ 2.0, Confidence ≥ 0.6)
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {result.signals.map((signal) => (
                          <Card key={`${signal.rank}-${signal.ticker}`} className="border-border overflow-hidden">
                            <CardContent className="p-0">
                              <div className="flex items-start gap-4 p-4 border-b border-border">
                                {/* Rank */}
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary font-bold rounded-lg text-sm">
                                    #{signal.rank}
                                  </div>
                                </div>

                                {/* Main Info */}
                                <div className="flex-grow">
                                  <div className="flex items-center gap-3 mb-2">
                                    <p className="text-lg font-bold">{signal.ticker}</p>
                                    <Badge
                                      variant="outline"
                                      className={getActionColor(signal.action)}
                                    >
                                      {signal.action}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {signal.setup}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{signal.reason}</p>
                                </div>

                                {/* Risk/Reward */}
                                {signal.risk_reward && (
                                  <div className="flex-shrink-0 text-right">
                                    <div className="text-xs text-muted-foreground mb-1">Risk/Reward</div>
                                    <p className="text-lg font-bold text-green-600">
                                      {signal.risk_reward.toFixed(2)}:1
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Metrics */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 border-b border-border text-xs">
                                <div>
                                  <p className="text-muted-foreground mb-1">Confidence</p>
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 flex-grow bg-gradient-to-r rounded ${getConfidenceColor(signal.confidence)}`} />
                                    <span className="font-mono font-bold">{(signal.confidence * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Entry</p>
                                  <p className="font-mono font-bold">
                                    {signal.entry ? `$${signal.entry.toFixed(2)}` : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Stop Loss</p>
                                  <p className="font-mono font-bold">
                                    {signal.stop ? `$${signal.stop.toFixed(2)}` : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Target</p>
                                  <p className="font-mono font-bold">
                                    {signal.target ? `$${signal.target.toFixed(2)}` : '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Trade Details */}
                              <div className="p-4 space-y-3 text-xs">
                                <div>
                                  <p className="text-muted-foreground mb-1 flex items-center gap-2">
                                    <Target className="w-3 h-3" />
                                    Invalid If
                                  </p>
                                  <p className="text-foreground">{signal.invalid_if}</p>
                                </div>

                                {signal.risk_notes && signal.risk_notes.length > 0 && (
                                  <div>
                                    <p className="text-muted-foreground mb-1 flex items-center gap-2">
                                      <Shield className="w-3 h-3" />
                                      Risk Notes
                                    </p>
                                    <ul className="space-y-1">
                                      {signal.risk_notes.map((note, idx) => (
                                        <li key={idx} className="flex gap-2">
                                          <span className="text-muted-foreground">•</span>
                                          <span>{note}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-12 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Disclaimer:</strong> This tool is for paper trading and educational purposes only.
              Trading signals are generated by AI and should not be considered financial advice.
              Always do your own research before making any trading decisions. Quality filters apply: Risk/Reward ≥ 2.0, Confidence ≥ 0.6.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
