'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from 'lightweight-charts'
import { TrendingUp, Maximize2, Loader2 } from 'lucide-react'

interface ChartProps {
  ticker: string
}

const RANGES = [
  { label: '1D', value: '1D' },
  { label: '5D', value: '5D' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
]

interface Bar {
  time: number | string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function TradingViewChart({ ticker }: ChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const [range, setRange] = useState('3M')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<{
    last: number
    change: number
    changePct: number
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
        vertLines: { color: 'rgba(34, 34, 34, 0.5)' },
        horzLines: { color: 'rgba(34, 34, 34, 0.5)' },
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
      upColor: '#22c55e',
      downColor: '#dc2626',
      borderUpColor: '#22c55e',
      borderDownColor: '#dc2626',
      wickUpColor: '#22c55e',
      wickDownColor: '#dc2626',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#22c55e',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    return () => {
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [])

  // Fetch bars whenever ticker or range changes
  useEffect(() => {
    let cancelled = false
    const candleSeries = candleSeriesRef.current
    const volumeSeries = volumeSeriesRef.current
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
          setError('No data available for this range')
          candleSeries.setData([])
          volumeSeries.setData([])
          return
        }

        const candles: CandlestickData[] = bars.map((b) => ({
          time: (typeof b.time === 'number'
            ? (b.time as UTCTimestamp)
            : b.time) as CandlestickData['time'],
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }))

        const volumes: HistogramData[] = bars.map((b) => ({
          time: (typeof b.time === 'number'
            ? (b.time as UTCTimestamp)
            : b.time) as HistogramData['time'],
          value: b.volume,
          color: b.close >= b.open ? 'rgba(34, 197, 94, 0.4)' : 'rgba(220, 38, 38, 0.4)',
        }))

        candleSeries.setData(candles)
        volumeSeries.setData(volumes)
        chart.timeScale().fitContent()
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load chart data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [ticker, range])

  // Fetch live quote
  useEffect(() => {
    let cancelled = false
    fetch(`/api/polygon/quote?ticker=${ticker}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data.error) return
        setQuote({
          last: data.last,
          change: data.change,
          changePct: data.changePct,
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [ticker])

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (document.fullscreenElement !== wrapperRef.current) {
      wrapperRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const isUp = quote ? quote.change >= 0 : true

  return (
    <div ref={wrapperRef} className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <TrendingUp className="w-4 h-4 text-theme-green" />
          <span className="font-mono font-bold text-sm tracking-wider">{ticker}</span>
          {quote && (
            <>
              <span className="font-mono text-sm tabular-nums">
                ${quote.last.toFixed(2)}
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  isUp ? 'text-theme-green' : 'text-theme-red'
                }`}
              >
                {isUp ? '+' : ''}
                {quote.change.toFixed(2)} ({isUp ? '+' : ''}
                {quote.changePct.toFixed(2)}%)
              </span>
            </>
          )}
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
            Polygon
          </span>
        </div>

        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2 py-1 text-[10px] font-mono font-semibold rounded transition-colors ${
                range === r.value
                  ? 'bg-theme-green/20 text-theme-green border border-theme-green/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
              }`}
            >
              {r.label}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-2" />
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-1 min-h-0 relative">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-theme-green" />
              <span className="text-xs font-mono text-muted-foreground">
                Loading {ticker}...
              </span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-mono text-theme-red">{error}</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Check POLYGON_API_KEY or try a different range
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
