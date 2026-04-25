'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { List, Plus, X, Zap, Upload, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

export interface TickerData {
  ticker: string
  current_price: number
  rsi_14?: number
  ema_9?: number
  ema_21?: number
  ema_50?: number
  vwap?: number
  atr_14?: number
  volume?: number
  avg_volume_20?: number
  trend?: string
  above_vwap?: boolean
  support?: number[]
  resistance?: number[]
}

export interface WatchlistPayload {
  timeframe: string
  market_session: string
  account_context: {
    paper_trading: boolean
    buying_power: number
    max_risk_per_trade_pct: number
    max_position_value: number
  }
  tickers: TickerData[]
}

interface WatchlistInputProps {
  onAnalyze: (payload: WatchlistPayload) => void
  isLoading: boolean
}

const POPULAR_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD']

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
const SESSIONS = ['pre', 'regular', 'after']

const SAMPLE_PAYLOAD: WatchlistPayload = {
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
      current_price: 242.10,
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
      ticker: 'MSFT',
      current_price: 415.30,
      rsi_14: 55.2,
      ema_9: 413.8,
      ema_21: 410.5,
      ema_50: 402.1,
      vwap: 412.9,
      atr_14: 5.3,
      volume: 22100000,
      avg_volume_20: 20800000,
      trend: 'neutral',
      above_vwap: true,
      support: [410.0, 405.0],
      resistance: [418.0, 424.0],
    },
    {
      ticker: 'META',
      current_price: 505.70,
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

export function WatchlistInput({ onAnalyze, isLoading }: WatchlistInputProps) {
  const [mode, setMode] = useState<'builder' | 'json'>('builder')
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Builder state
  const [tickers, setTickers] = useState<TickerData[]>([])
  const [newTicker, setNewTicker] = useState('')
  const [timeframe, setTimeframe] = useState('15m')
  const [session, setSession] = useState('regular')
  const [buyingPower, setBuyingPower] = useState('10000')
  const [maxRisk, setMaxRisk] = useState('1')
  const [maxPos, setMaxPos] = useState('1000')
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── JSON mode ──────────────────────────────────────────────────────────────
  const handleJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setJsonError(null)
    try {
      const parsed = JSON.parse(jsonText)
      const tList = parsed.tickers ?? parsed.watchlist
      if (!Array.isArray(tList) || tList.length === 0) {
        setJsonError('JSON must contain a "tickers" array with at least one entry.')
        return
      }
      onAnalyze({
        timeframe: parsed.timeframe ?? '15m',
        market_session: parsed.market_session ?? 'regular',
        account_context: parsed.account_context ?? {
          paper_trading: true,
          buying_power: 10000,
          max_risk_per_trade_pct: 1,
          max_position_value: 1000,
        },
        tickers: tList,
      })
    } catch {
      setJsonError('Invalid JSON. Please check your formatting and try again.')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setJsonText(ev.target?.result as string)
      setJsonError(null)
    }
    reader.readAsText(file)
  }

  const loadSampleJson = () => {
    setJsonText(JSON.stringify(SAMPLE_PAYLOAD, null, 2))
    setJsonError(null)
  }

  // ── Builder mode ───────────────────────────────────────────────────────────
  const addTicker = (ticker: string) => {
    const t = ticker.toUpperCase().trim()
    if (!t || tickers.some((x) => x.ticker === t)) return
    setTickers((prev) => [...prev, { ticker: t, current_price: 0 }])
    setNewTicker('')
    setExpandedTicker(t)
  }

  const removeTicker = (ticker: string) => {
    setTickers((prev) => prev.filter((x) => x.ticker !== ticker))
    if (expandedTicker === ticker) setExpandedTicker(null)
  }

  const updateTicker = (ticker: string, field: keyof TickerData, value: string) => {
    setTickers((prev) =>
      prev.map((x) => {
        if (x.ticker !== ticker) return x
        if (field === 'above_vwap') return { ...x, above_vwap: value === 'true' }
        if (field === 'trend') return { ...x, trend: value }
        if (field === 'support' || field === 'resistance') {
          const nums = value.split(',').map(Number).filter((n) => !isNaN(n))
          return { ...x, [field]: nums }
        }
        const num = parseFloat(value)
        return { ...x, [field]: isNaN(num) ? undefined : num }
      })
    )
  }

  const handleBuilderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tickers.length === 0) return
    onAnalyze({
      timeframe,
      market_session: session,
      account_context: {
        paper_trading: true,
        buying_power: parseFloat(buyingPower) || 10000,
        max_risk_per_trade_pct: parseFloat(maxRisk) || 1,
        max_position_value: parseFloat(maxPos) || 1000,
      },
      tickers,
    })
  }

  const loadSampleBuilder = () => {
    setTickers(SAMPLE_PAYLOAD.tickers)
    setTimeframe(SAMPLE_PAYLOAD.timeframe)
    setSession(SAMPLE_PAYLOAD.market_session)
    setBuyingPower(String(SAMPLE_PAYLOAD.account_context.buying_power))
    setMaxRisk(String(SAMPLE_PAYLOAD.account_context.max_risk_per_trade_pct))
    setMaxPos(String(SAMPLE_PAYLOAD.account_context.max_position_value))
  }

  const numericFields: { key: keyof TickerData; label: string; placeholder: string }[] = [
    { key: 'current_price', label: 'Price', placeholder: '185.42' },
    { key: 'rsi_14', label: 'RSI 14', placeholder: '61.3' },
    { key: 'ema_9', label: 'EMA 9', placeholder: '184.8' },
    { key: 'ema_21', label: 'EMA 21', placeholder: '183.9' },
    { key: 'ema_50', label: 'EMA 50', placeholder: '181.7' },
    { key: 'vwap', label: 'VWAP', placeholder: '184.6' },
    { key: 'atr_14', label: 'ATR 14', placeholder: '2.15' },
    { key: 'volume', label: 'Volume', placeholder: '74200000' },
    { key: 'avg_volume_20', label: 'Avg Vol 20', placeholder: '61500000' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Watchlist Input
        </CardTitle>
        <CardDescription>
          Paste JSON or use the builder. The AI analyzes all tickers and returns the top 3-10 ranked signals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setMode('builder')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'builder'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Builder
          </button>
          <button
            type="button"
            onClick={() => setMode('json')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'json'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Paste JSON
          </button>
        </div>

        {/* ── JSON Mode ─────────────────────────────────────────────────────── */}
        {mode === 'json' && (
          <form onSubmit={handleJsonSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={loadSampleJson} className="flex-1">
                <Zap className="w-3 h-3 mr-1" />
                Load Sample
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="w-3 h-3 mr-1" />
                Upload JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <textarea
              className="w-full h-72 p-3 text-xs font-mono bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={'{\n  "timeframe": "15m",\n  "tickers": [...]\n}'}
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setJsonError(null) }}
              spellCheck={false}
            />

            {jsonError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{jsonError}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !jsonText.trim()}
            >
              {isLoading ? (
                <><Spinner className="mr-2" />Analyzing...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Generate Ranked Signals</>
              )}
            </Button>
          </form>
        )}

        {/* ── Builder Mode ──────────────────────────────────────────────────── */}
        {mode === 'builder' && (
          <form onSubmit={handleBuilderSubmit} className="space-y-5">
            {/* Context row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md"
                >
                  {TIMEFRAMES.map((tf) => <option key={tf}>{tf}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Session</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md"
                >
                  {SESSIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Buying Power ($)</label>
                <Input
                  type="number"
                  value={buyingPower}
                  onChange={(e) => setBuyingPower(e.target.value)}
                  placeholder="10000"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Max Risk %</label>
                <Input
                  type="number"
                  value={maxRisk}
                  onChange={(e) => setMaxRisk(e.target.value)}
                  placeholder="1"
                  step="0.1"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Popular tickers */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick add</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TICKERS.map((t) => {
                  const added = tickers.some((x) => x.ticker === t)
                  return (
                    <Button
                      key={t}
                      type="button"
                      variant={added ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => !added && addTicker(t)}
                      disabled={added}
                    >
                      {t}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Custom ticker input */}
            <div className="flex gap-2">
              <Input
                placeholder="Custom ticker..."
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTicker(newTicker) } }}
                className="uppercase text-sm"
              />
              <Button type="button" variant="outline" onClick={() => addTicker(newTicker)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Ticker list */}
            {tickers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {tickers.length} ticker{tickers.length !== 1 ? 's' : ''} added
                  </p>
                  <button type="button" onClick={() => setTickers([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                    Clear all
                  </button>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {tickers.map((item) => {
                    const isExpanded = expandedTicker === item.ticker
                    return (
                      <div key={item.ticker} className="bg-muted/40 border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">
                            {item.ticker}
                          </Badge>
                          {item.current_price > 0 && (
                            <span className="text-xs text-muted-foreground">${item.current_price}</span>
                          )}
                          {item.trend && (
                            <span className={`text-xs font-medium ${
                              item.trend === 'bullish' ? 'text-emerald-600' :
                              item.trend === 'bearish' ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {item.trend}
                            </span>
                          )}
                          <div className="flex-1" />
                          <button
                            type="button"
                            onClick={() => setExpandedTicker(isExpanded ? null : item.ticker)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTicker(item.ticker)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-3 border-t border-border">
                            <div className="grid grid-cols-2 gap-2 pt-3">
                              {numericFields.map(({ key, label, placeholder }) => (
                                <div key={key} className="space-y-1">
                                  <label className="text-xs text-muted-foreground">{label}</label>
                                  <Input
                                    type="number"
                                    placeholder={placeholder}
                                    value={item[key] as number ?? ''}
                                    onChange={(e) => updateTicker(item.ticker, key, e.target.value)}
                                    className="h-7 text-xs"
                                    step="any"
                                  />
                                </div>
                              ))}
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Trend</label>
                                <select
                                  value={item.trend ?? ''}
                                  onChange={(e) => updateTicker(item.ticker, 'trend', e.target.value)}
                                  className="w-full h-7 px-2 text-xs bg-background border border-input rounded-md"
                                >
                                  <option value="">—</option>
                                  <option value="bullish">bullish</option>
                                  <option value="bearish">bearish</option>
                                  <option value="neutral">neutral</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Above VWAP</label>
                                <select
                                  value={item.above_vwap === undefined ? '' : String(item.above_vwap)}
                                  onChange={(e) => updateTicker(item.ticker, 'above_vwap', e.target.value)}
                                  className="w-full h-7 px-2 text-xs bg-background border border-input rounded-md"
                                >
                                  <option value="">—</option>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Support (comma-separated)</label>
                                <Input
                                  placeholder="183.5, 181.8"
                                  value={item.support?.join(', ') ?? ''}
                                  onChange={(e) => updateTicker(item.ticker, 'support', e.target.value)}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Resistance (comma-separated)</label>
                                <Input
                                  placeholder="186.2, 188.9"
                                  value={item.resistance?.join(', ') ?? ''}
                                  onChange={(e) => updateTicker(item.ticker, 'resistance', e.target.value)}
                                  className="h-7 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tickers.length === 0 && (
              <Button type="button" variant="outline" className="w-full" onClick={loadSampleBuilder}>
                <Zap className="w-4 h-4 mr-2" />
                Load Sample Watchlist
              </Button>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || tickers.length === 0}
            >
              {isLoading ? (
                <><Spinner className="mr-2" />Analyzing {tickers.length} ticker{tickers.length !== 1 ? 's' : ''}...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Generate Ranked Signals</>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
