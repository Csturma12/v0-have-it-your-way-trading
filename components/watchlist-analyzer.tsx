'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SignalsList, type TradingSignal, type ScannerSummary } from '@/components/signals-list'
import {
  AlertCircle,
  FileJson,
  Clock,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  Timer,
  Search,
  Plus,
  X,
} from 'lucide-react'
import { TickerAutocomplete } from '@/components/ui/ticker-autocomplete'
import { Spinner } from '@/components/ui/spinner'

interface AnalysisResult {
  scanner_summary: ScannerSummary
  signals: TradingSignal[]
  total_analyzed: number
}

const SCAN_INTERVALS = [
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
]

// US Market hours: 9:30 AM - 4:00 PM EST
function isMarketOpen(): boolean {
  const now = new Date()
  const estOffset = -5
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const est = new Date(utc + 3600000 * estOffset)

  const day = est.getDay()
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const timeInMinutes = hours * 60 + minutes

  if (day === 0 || day === 6) return false
  return timeInMinutes >= 570 && timeInMinutes < 960
}

function getMarketStatus(): { open: boolean; message: string; nextEvent: string } {
  const now = new Date()
  const estOffset = -5
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const est = new Date(utc + 3600000 * estOffset)

  const day = est.getDay()
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const timeInMinutes = hours * 60 + minutes

  if (day === 0 || day === 6) {
    return { open: false, message: 'Weekend', nextEvent: 'Opens Monday 9:30 AM EST' }
  }
  if (timeInMinutes < 570) {
    const minsUntil = 570 - timeInMinutes
    return {
      open: false,
      message: 'Pre-Market',
      nextEvent: `Opens in ${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`,
    }
  }
  if (timeInMinutes >= 960) {
    return { open: false, message: 'Closed', nextEvent: 'Opens tomorrow 9:30 AM EST' }
  }
  const minsUntil = 960 - timeInMinutes
  return {
    open: true,
    message: 'Open',
    nextEvent: `Closes in ${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`,
  }
}

// Backend validation logic
function validateSignal(signal: TradingSignal): boolean {
  if (!['BUY', 'SELL', 'NO TRADE'].includes(signal.action)) return false
  if (signal.action === 'NO TRADE') return true
  if (signal.confidence < 0.65) return false
  if (!signal.risk_reward || signal.risk_reward < 2) return false
  if (!signal.entry || !signal.stop || !signal.target) return false
  if (signal.action === 'BUY') {
    if (signal.stop >= signal.entry) return false
    if (signal.target <= signal.entry) return false
  }
  if (signal.action === 'SELL') {
    if (signal.stop <= signal.entry) return false
    if (signal.target >= signal.entry) return false
  }
  return true
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
  const [quickTickers, setQuickTickers] = useState<string[]>([])
  const [tickerSearch, setTickerSearch] = useState('')

  // Scanner state
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [scanInterval, setScanInterval] = useState('5')
  const [marketHoursOnly, setMarketHoursOnly] = useState(true)
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null)
  const [nextScanTime, setNextScanTime] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState('')
  const [scanCount, setScanCount] = useState(0)
  const [marketStatus, setMarketStatus] = useState(getMarketStatus())

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Add ticker to quick list
  const addQuickTicker = (symbol: string) => {
    const upper = symbol.toUpperCase()
    if (!quickTickers.includes(upper)) {
      setQuickTickers([...quickTickers, upper])
    }
    setTickerSearch('')
  }

  // Remove ticker from quick list
  const removeQuickTicker = (symbol: string) => {
    setQuickTickers(quickTickers.filter(t => t !== symbol))
  }

  // Generate payload from quick tickers and run analysis
  const runQuickAnalysis = async () => {
    if (quickTickers.length === 0) return
    
    const payload = {
      timeframe: '15m',
      market_session: 'regular',
      account_context: {
        paper_trading: true,
        buying_power: 10000,
        max_risk_per_trade_pct: 1,
        max_position_value: 1000,
      },
      tickers: quickTickers.map(ticker => ({
        ticker,
        current_price: 100, // Will be fetched by backend
        rsi_14: 50,
        ema_9: 100,
        ema_21: 100,
        ema_50: 100,
        vwap: 100,
        atr_14: 2,
        volume: 1000000,
        avg_volume_20: 1000000,
        trend: 'neutral',
        above_vwap: true,
        support: [],
        resistance: [],
      }))
    }
    setInput(JSON.stringify(payload, null, 2))
    // Auto-run the scan
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to analyze')
      const validatedSignals = data.signals.filter(validateSignal)
      setResult({ ...data, signals: validatedSignals })
      setLastScanTime(new Date())
      setScanCount((prev) => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const runScan = useCallback(async () => {
    if (!input.trim()) return

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

      // Apply backend validation
      const validatedSignals = data.signals.filter(validateSignal)

      setResult({
        ...data,
        signals: validatedSignals,
      })
      setLastScanTime(new Date())
      setScanCount((prev) => prev + 1)
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
  }, [input])

  // Update market status every minute
  useEffect(() => {
    const update = () => setMarketStatus(getMarketStatus())
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  // Handle scheduled scanning
  useEffect(() => {
    if (!scannerEnabled || !input.trim()) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setNextScanTime(null)
      setCountdown('')
      return
    }

    const intervalMs = parseInt(scanInterval) * 60 * 1000

    const scheduleNext = () => {
      setNextScanTime(new Date(Date.now() + intervalMs))
    }

    const executeScan = () => {
      if (marketHoursOnly && !isMarketOpen()) {
        scheduleNext()
        return
      }
      runScan()
      scheduleNext()
    }

    executeScan()

    timerRef.current = setInterval(executeScan, intervalMs)
    countdownRef.current = setInterval(() => {
      if (nextScanTime) {
        const remaining = nextScanTime.getTime() - Date.now()
        if (remaining > 0) {
          const mins = Math.floor(remaining / 60000)
          const secs = Math.floor((remaining % 60000) / 1000)
          setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
        }
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [scannerEnabled, scanInterval, marketHoursOnly, input, runScan, nextScanTime])

  const loadExample = () => {
    setInput(JSON.stringify(EXAMPLE_PAYLOAD, null, 2))
    setError(null)
  }

  return (
    <div className="w-full space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Input & Scanner */}
        <div className="space-y-4">
          {/* Watchlist Input */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Watchlist JSON</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadExample}
                  disabled={isLoading}
                  className="text-xs gap-1.5 h-7"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  Example
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setError(null)
                }}
                placeholder={'{\n  "timeframe": "15m",\n  "tickers": [...]\n}'}
                className="font-mono text-xs h-40 resize-none"
                spellCheck={false}
              />

              {error && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                  <AlertCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <Button
                onClick={runScan}
                disabled={isLoading || !input.trim()}
                className="w-full"
                variant={scannerEnabled ? 'outline' : 'default'}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Now'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Scanner Controls */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  <CardTitle className="text-base">Auto-Scanner</CardTitle>
                </div>
                <Switch
                  checked={scannerEnabled}
                  onCheckedChange={setScannerEnabled}
                  disabled={!input.trim()}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Market Status */}
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                <div className="flex items-center gap-2">
                  {marketStatus.open ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <Clock className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span
                    className={
                      marketStatus.open ? 'text-green-600 font-medium' : 'text-muted-foreground'
                    }
                  >
                    Market {marketStatus.message}
                  </span>
                </div>
                <span className="text-muted-foreground">{marketStatus.nextEvent}</span>
              </div>

              {/* Interval Selection */}
              <div className="flex items-center gap-2">
                <span className="text-xs flex-shrink-0">Scan every:</span>
                <Select
                  value={scanInterval}
                  onValueChange={setScanInterval}
                  disabled={!scannerEnabled}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCAN_INTERVALS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Market Hours Toggle */}
              <div className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                <div>
                  <p className="text-xs font-medium text-amber-700">Market Hours Only</p>
                  <p className="text-[10px] text-amber-600">9:30 AM - 4:00 PM EST</p>
                </div>
                <Switch
                  checked={marketHoursOnly}
                  onCheckedChange={setMarketHoursOnly}
                  disabled={!scannerEnabled}
                />
              </div>

              {/* Scanner Status */}
              {scannerEnabled && (
                <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
                      }`}
                    />
                    <div className="text-xs">
                      <p className="font-medium">{isLoading ? 'Scanning...' : 'Active'}</p>
                      <p className="text-muted-foreground">{scanCount} scans</p>
                    </div>
                  </div>
                  {nextScanTime && !isLoading && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Next in</p>
                      <p className="text-base font-mono font-bold text-primary">{countdown}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              {scannerEnabled && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runScan}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Scan Now
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setScannerEnabled(false)}>
                    <Pause className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {!scannerEnabled && input.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerEnabled(true)}
                  className="w-full"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start Auto-Scanner
                </Button>
              )}

              {lastScanTime && (
                <p className="text-[10px] text-center text-muted-foreground">
                  Last scan:{' '}
                  {lastScanTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2">
          {/* Loading skeleton */}
          {isLoading && !result && (
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
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center border border-dashed border-border rounded-xl bg-muted/20">
              <FileJson className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-medium text-foreground">Paste Watchlist JSON</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs text-balance">
                Include technical indicators (RSI, EMA, VWAP, ATR) and support/resistance for best
                results.
              </p>
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                <p>Validation filters:</p>
                <ul className="list-disc list-inside text-left">
                  <li>Confidence &ge; 65%</li>
                  <li>Risk/Reward &ge; 2:1</li>
                  <li>Valid entry, stop, target levels</li>
                </ul>
              </div>
              <Button variant="outline" size="sm" onClick={loadExample} className="mt-4">
                Load Example Data
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
