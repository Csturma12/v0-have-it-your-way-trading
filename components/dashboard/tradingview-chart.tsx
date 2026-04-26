'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts'
import { TrendingUp, Maximize2, Loader2, Settings2, X } from 'lucide-react'

interface ChartProps {
  ticker: string
}

// ── Timeframes ──────────────────────────────────────────────────────────────
const TIMEFRAMES = [
  { label: '5m',  value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H',  value: '1H' },
  { label: '4H',  value: '4H' },
  { label: '1D',  value: '1D' },
  { label: '5D',  value: '5D' },
  { label: '1M',  value: '1M' },
  { label: '3M',  value: '3M' },
  { label: '6M',  value: '6M' },
  { label: '1Y',  value: '1Y' },
  { label: '5Y',  value: '5Y' },
]

// ── Indicator definitions ────────────────────────────────────────────────────
const INDICATORS = [
  { id: 'ema9',  label: 'EMA 9',  color: '#f59e0b' },
  { id: 'ema21', label: 'EMA 21', color: '#3b82f6' },
  { id: 'ema50', label: 'EMA 50', color: '#a855f7' },
  { id: 'vwap',  label: 'VWAP',   color: '#22c55e' },
  { id: 'bb',    label: 'Bollinger Bands', color: '#64748b' },
] as const

type IndicatorId = typeof INDICATORS[number]['id']

interface Bar {
  time: number | string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ── Math helpers ─────────────────────────────────────────────────────────────
function calcEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let ema = closes[0]
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
    } else if (i === period - 1) {
      ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
      result.push(ema)
    } else {
      ema = closes[i] * k + ema * (1 - k)
      result.push(ema)
    }
  }
  return result
}

function calcVWAP(bars: Bar[]): number[] {
  let cumPV = 0, cumVol = 0
  return bars.map((b) => {
    const typical = (b.high + b.low + (typeof b.close === 'number' ? b.close : 0)) / 3
    const vol = b.volume
    cumPV += typical * vol
    cumVol += vol
    return cumVol ? cumPV / cumVol : typical
  })
}

function calcBB(closes: number[], period = 20, mult = 2): { upper: number[]; mid: number[]; lower: number[] } {
  const upper: number[] = [], mid: number[] = [], lower: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN); mid.push(NaN); lower.push(NaN)
    } else {
      const slice = closes.slice(i - period + 1, i + 1)
      const avg = slice.reduce((a, b) => a + b, 0) / period
      const std = Math.sqrt(slice.reduce((a, b) => a + (b - avg) ** 2, 0) / period)
      mid.push(avg)
      upper.push(avg + mult * std)
      lower.push(avg - mult * std)
    }
  }
  return { upper, mid, lower }
}

type LineSeries_t = ISeriesApi<'Line'>

export function TradingViewChart({ ticker }: ChartProps) {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<IChartApi | null>(null)
  const candleRef     = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef     = useRef<ISeriesApi<'Histogram'> | null>(null)
  const indicatorRefs = useRef<Partial<Record<string, LineSeries_t | LineSeries_t[]>>>({})

  const [range, setRange]           = useState('1D')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [showIndicators, setShowIndicators] = useState(false)
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(
    new Set(['ema9', 'ema21'])
  )
  const [quote, setQuote] = useState<{
    last: number; change: number; changePct: number
  } | null>(null)

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#a3a3a3',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#222' },
      timeScale: {
        borderColor: '#222',
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:        '#22c55e',
      downColor:      '#dc2626',
      borderUpColor:  '#22c55e',
      borderDownColor:'#dc2626',
      wickUpColor:    '#22c55e',
      wickDownColor:  '#dc2626',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#22c55e',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartRef.current   = chart
    candleRef.current  = candleSeries
    volumeRef.current  = volumeSeries

    return () => {
      chart.remove()
      chartRef.current  = null
      candleRef.current = null
      volumeRef.current = null
      indicatorRefs.current = {}
    }
  }, [])

  // Remove all indicator series
  const clearIndicators = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return
    Object.values(indicatorRefs.current).forEach((s) => {
      if (!s) return
      if (Array.isArray(s)) s.forEach((line) => { try { chart.removeSeries(line) } catch {} })
      else { try { chart.removeSeries(s) } catch {} }
    })
    indicatorRefs.current = {}
  }, [])

  // Draw indicators on top of existing candle data
  const drawIndicators = useCallback((bars: Bar[], active: Set<IndicatorId>) => {
    const chart = chartRef.current
    if (!chart || bars.length === 0) return
    clearIndicators()

    const closes = bars.map((b) => b.close)
    const times  = bars.map((b) => b.time)

    const toLineData = (values: number[]): LineData[] =>
      values
        .map((v, i) => ({ time: times[i] as UTCTimestamp, value: v }))
        .filter((d) => !isNaN(d.value))

    const addLine = (color: string, lineWidth: 1 | 2 | 3 = 1, dashed = false) =>
      chart.addSeries(LineSeries, {
        color,
        lineWidth,
        lineStyle: dashed ? 2 : 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })

    if (active.has('ema9')) {
      const s = addLine('#f59e0b', 1)
      s.setData(toLineData(calcEMA(closes, 9)))
      indicatorRefs.current['ema9'] = s
    }
    if (active.has('ema21')) {
      const s = addLine('#3b82f6', 1)
      s.setData(toLineData(calcEMA(closes, 21)))
      indicatorRefs.current['ema21'] = s
    }
    if (active.has('ema50')) {
      const s = addLine('#a855f7', 2)
      s.setData(toLineData(calcEMA(closes, 50)))
      indicatorRefs.current['ema50'] = s
    }
    if (active.has('vwap')) {
      const s = addLine('#22c55e', 1, true)
      s.setData(toLineData(calcVWAP(bars)))
      indicatorRefs.current['vwap'] = s
    }
    if (active.has('bb')) {
      const { upper, mid, lower } = calcBB(closes)
      const sUpper = addLine('#64748b', 1, true)
      const sMid   = addLine('#64748b', 1)
      const sLower = addLine('#64748b', 1, true)
      sUpper.setData(toLineData(upper))
      sMid.setData(toLineData(mid))
      sLower.setData(toLineData(lower))
      indicatorRefs.current['bb'] = [sUpper, sMid, sLower]
    }
  }, [clearIndicators])

  // Store last fetched bars so we can redraw indicators without re-fetching
  const lastBarsRef = useRef<Bar[]>([])

  // Fetch bars whenever ticker or range changes
  useEffect(() => {
    let cancelled = false
    const candleSeries = candleRef.current
    const volumeSeries = volumeRef.current
    const chart = chartRef.current
    if (!candleSeries || !volumeSeries || !chart) return

    setLoading(true)
    setError(null)

    fetch(`/api/polygon/bars?ticker=${ticker}&range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          candleSeries.setData([])
          volumeSeries.setData([])
          return
        }
        const bars: Bar[] = data.bars || []
        if (bars.length === 0) {
          setError('No data for this range')
          candleSeries.setData([])
          volumeSeries.setData([])
          return
        }

        const candles: CandlestickData[] = bars.map((b) => ({
          time: b.time as CandlestickData['time'],
          open: b.open, high: b.high, low: b.low, close: b.close,
        }))
        const volumes: HistogramData[] = bars.map((b) => ({
          time: b.time as HistogramData['time'],
          value: b.volume,
          color: b.close >= b.open ? 'rgba(34,197,94,0.35)' : 'rgba(220,38,38,0.35)',
        }))

        candleSeries.setData(candles)
        volumeSeries.setData(volumes)
        chart.timeScale().fitContent()

        lastBarsRef.current = bars
        drawIndicators(bars, activeIndicators)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load chart data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, range])

  // Redraw indicators when active set changes (without re-fetching)
  useEffect(() => {
    if (lastBarsRef.current.length > 0) {
      drawIndicators(lastBarsRef.current, activeIndicators)
    }
  }, [activeIndicators, drawIndicators])

  // Fetch live quote
  useEffect(() => {
    let cancelled = false
    fetch(`/api/polygon/quote?ticker=${ticker}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data.error) return
        setQuote({ last: data.last, change: data.change, changePct: data.changePct })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [ticker])

  const toggleIndicator = (id: IndicatorId) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    document.fullscreenElement !== wrapperRef.current
      ? wrapperRef.current.requestFullscreen?.()
      : document.exitFullscreen?.()
  }

  const isUp = quote ? quote.change >= 0 : true

  return (
    <div ref={wrapperRef} className="flex flex-col h-full bg-[#0a0a0a]">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/60 flex-shrink-0 gap-2 flex-wrap">
        {/* Left: ticker + quote */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <TrendingUp className="w-3.5 h-3.5 text-theme-green flex-shrink-0" />
          <span className="font-mono font-bold text-sm tracking-wider">{ticker}</span>
          {quote && (
            <>
              <span className="font-mono text-sm tabular-nums">${quote.last.toFixed(2)}</span>
              <span className={`font-mono text-xs tabular-nums ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}{quote.changePct.toFixed(2)}%)
              </span>
            </>
          )}
        </div>

        {/* Right: timeframes + indicators + fullscreen */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Timeframe buttons grouped by category */}
          <div className="flex items-center gap-0.5 border-r border-border/50 pr-2 mr-1">
            <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mr-1">Intraday</span>
            {TIMEFRAMES.slice(0, 4).map((tf) => (
              <button key={tf.value} onClick={() => setRange(tf.value)}
                className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded transition-colors ${
                  range === tf.value
                    ? 'bg-theme-green/20 text-green-400 border border-green-500/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                }`}>{tf.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 border-r border-border/50 pr-2 mr-1">
            <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mr-1">Range</span>
            {TIMEFRAMES.slice(4).map((tf) => (
              <button key={tf.value} onClick={() => setRange(tf.value)}
                className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded transition-colors ${
                  range === tf.value
                    ? 'bg-theme-green/20 text-green-400 border border-green-500/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                }`}>{tf.label}</button>
            ))}
          </div>

          {/* Indicators toggle */}
          <button onClick={() => setShowIndicators((v) => !v)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
              showIndicators
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'text-muted-foreground border-transparent hover:bg-white/5 hover:text-foreground'
            }`}>
            <Settings2 className="w-3 h-3" />
            Indicators
            {activeIndicators.size > 0 && (
              <span className="ml-0.5 bg-blue-500/30 text-blue-300 text-[9px] px-1 rounded-full">
                {activeIndicators.size}
              </span>
            )}
          </button>

          <div className="w-px h-3.5 bg-border mx-1" />
          <button onClick={toggleFullscreen}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded">
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Indicator picker ── */}
      {showIndicators && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-card/40 flex-shrink-0 flex-wrap">
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mr-1">
            Overlays:
          </span>
          {INDICATORS.map((ind) => {
            const active = activeIndicators.has(ind.id)
            return (
              <button key={ind.id} onClick={() => toggleIndicator(ind.id)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold transition-all ${
                  active
                    ? 'bg-card border-border/60 text-foreground'
                    : 'bg-transparent border-border/20 text-muted-foreground hover:border-border/50'
                }`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? ind.color : '#555' }} />
                {ind.label}
                {active && <X className="w-2.5 h-2.5 text-muted-foreground" />}
              </button>
            )
          })}
          <button onClick={() => setActiveIndicators(new Set())}
            className="ml-auto text-[9px] font-mono text-muted-foreground hover:text-red-400 transition-colors">
            Clear all
          </button>
        </div>
      )}

      {/* ── Chart container ── */}
      <div className="flex-1 min-h-0 relative">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-theme-green" />
              <span className="text-[11px] font-mono text-muted-foreground">Loading {ticker} {range}...</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-1">
              <p className="text-sm font-mono text-red-400">{error}</p>
              <p className="text-xs font-mono text-muted-foreground">Check POLYGON_API_KEY or try a different timeframe</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Active indicator legend ── */}
      {activeIndicators.size > 0 && !showIndicators && (
        <div className="flex items-center gap-3 px-3 py-1 border-t border-border/30 bg-card/30 flex-shrink-0 flex-wrap">
          {INDICATORS.filter((i) => activeIndicators.has(i.id)).map((ind) => (
            <div key={ind.id} className="flex items-center gap-1">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: ind.color }} />
              <span className="text-[9px] font-mono text-muted-foreground">{ind.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
