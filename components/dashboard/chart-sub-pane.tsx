'use client'

/**
 * ChartSubPane — renders ONE indicator in its own labeled pane
 * (mirrors the Webull layout where each oscillator gets a separate row)
 * Users can drag the top border to resize, or collapse/expand the pane.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { X, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react'

export interface Bar {
  time: number | string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const MIN_HEIGHT = 60
const MAX_HEIGHT = 400
const DEFAULT_HEIGHT = 120

interface SubPaneProps {
  indicatorId: string
  label: string
  color: string
  bars: Bar[]
  times: UTCTimestamp[]
  mainChartRef: React.MutableRefObject<IChartApi | null>
  onRemove: (id: string) => void
  currentValue?: string
  defaultHeight?: number
}

// ── Shared calc helpers ──────────────────────────────────────────────────────

function calcSMA(data: number[], period: number): number[] {
  return data.map((_, i) => {
    if (i < period - 1) return NaN
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  })
}

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let ema = 0
  data.forEach((v, i) => {
    if (i < period - 1) { result.push(NaN) }
    else if (i === period - 1) {
      ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
      result.push(ema)
    } else {
      ema = v * k + ema * (1 - k)
      result.push(ema)
    }
  })
  return result
}

function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = []
  let gainSum = 0, lossSum = 0
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(NaN); continue }
    const change = closes[i] - closes[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    if (i < period) { gainSum += gain; lossSum += loss; result.push(NaN) }
    else if (i === period) {
      gainSum += gain; lossSum += loss
      const ag = gainSum / period, al = lossSum / period
      result.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al))
    } else {
      const prevRsi = result[i - 1]
      const prevAvgLoss = prevRsi >= 100 ? 0 : (100 / prevRsi - 1) > 0 ? 1 / (100 / prevRsi - 1) : 0
      const prevAvgGain = prevRsi <= 0 ? 0 : (100 - prevRsi) > 0 ? (100 / (100 - prevRsi) - 1) : 0
      const ag = (prevAvgGain * (period - 1) + gain) / period
      const al = (prevAvgLoss * (period - 1) + loss) / period
      result.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al))
    }
  }
  return result
}

function calcMACD(closes: number[], fast = 12, slow = 26, sig = 9) {
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)
  const macdLine = emaFast.map((f, i) => f - emaSlow[i])
  const validMacd = macdLine.filter(v => !isNaN(v))
  const sigLine = calcEMA(validMacd, sig)
  const padded = new Array(closes.length - sigLine.length).fill(NaN).concat(sigLine)
  const hist = macdLine.map((m, i) => m - padded[i])
  return { macd: macdLine, signal: padded, histogram: hist }
}

function calcATR(bars: Bar[], period = 14): number[] {
  const tr = bars.map((b, i) => {
    if (i === 0) return b.high - b.low
    const p = bars[i - 1]
    return Math.max(b.high - b.low, Math.abs(b.high - p.close), Math.abs(b.low - p.close))
  })
  return calcEMA(tr, period)
}

function calcStochastic(bars: Bar[], kPeriod = 14, dPeriod = 3, smooth = 3) {
  const rawK: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < kPeriod - 1) { rawK.push(NaN); continue }
    const slice = bars.slice(i - kPeriod + 1, i + 1)
    const hi = Math.max(...slice.map(b => b.high))
    const lo = Math.min(...slice.map(b => b.low))
    rawK.push(hi === lo ? 50 : ((bars[i].close - lo) / (hi - lo)) * 100)
  }
  const k = calcSMA(rawK, smooth)
  const d = calcSMA(k, dPeriod)
  return { k, d }
}

function calcCCI(bars: Bar[], period = 20): number[] {
  return bars.map((b, i) => {
    if (i < period - 1) return NaN
    const slice = bars.slice(i - period + 1, i + 1)
    const typicals = slice.map(s => (s.high + s.low + s.close) / 3)
    const avg = typicals.reduce((a, b) => a + b, 0) / period
    const meanDev = typicals.reduce((a, b) => a + Math.abs(b - avg), 0) / period
    return meanDev === 0 ? 0 : (typicals[typicals.length - 1] - avg) / (0.015 * meanDev)
  })
}

function calcWilliamsR(bars: Bar[], period = 14): number[] {
  return bars.map((b, i) => {
    if (i < period - 1) return NaN
    const slice = bars.slice(i - period + 1, i + 1)
    const hi = Math.max(...slice.map(s => s.high))
    const lo = Math.min(...slice.map(s => s.low))
    return hi === lo ? -50 : ((hi - b.close) / (hi - lo)) * -100
  })
}

function calcADX(bars: Bar[], period = 14) {
  const tr: number[] = [], pdm: number[] = [], ndm: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) { tr.push(0); pdm.push(0); ndm.push(0); continue }
    const b = bars[i], prev = bars[i - 1]
    tr.push(Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close)))
    const up = b.high - prev.high, dn = prev.low - b.low
    pdm.push(up > dn && up > 0 ? up : 0)
    ndm.push(dn > up && dn > 0 ? dn : 0)
  }
  const atr = calcEMA(tr, period)
  const pdi = calcEMA(pdm, period).map((p, i) => atr[i] ? (p / atr[i]) * 100 : 0)
  const ndi = calcEMA(ndm, period).map((n, i) => atr[i] ? (n / atr[i]) * 100 : 0)
  const dx = pdi.map((p, i) => (p + ndi[i]) ? Math.abs(p - ndi[i]) / (p + ndi[i]) * 100 : 0)
  return { adx: calcEMA(dx, period), pdi, ndi }
}

function calcOBV(bars: Bar[]): number[] {
  let obv = 0
  return bars.map((b, i) => {
    if (i === 0) return 0
    if (b.close > bars[i - 1].close) obv += b.volume
    else if (b.close < bars[i - 1].close) obv -= b.volume
    return obv
  })
}

function calcMFI(bars: Bar[], period = 14): number[] {
  const typicals = bars.map(b => (b.high + b.low + b.close) / 3)
  const mf = bars.map((b, i) => typicals[i] * b.volume)
  return bars.map((_, i) => {
    if (i < period) return NaN
    let posMF = 0, negMF = 0
    for (let j = i - period + 1; j <= i; j++) {
      if (typicals[j] > typicals[j - 1]) posMF += mf[j]
      else if (typicals[j] < typicals[j - 1]) negMF += mf[j]
    }
    return negMF === 0 ? 100 : 100 - 100 / (1 + posMF / negMF)
  })
}

function calcROC(closes: number[], period = 12): number[] {
  return closes.map((c, i) => i < period ? NaN : ((c - closes[i - period]) / closes[i - period]) * 100)
}

function calcMomentum(closes: number[], period = 10): number[] {
  return closes.map((c, i) => i < period ? NaN : c - closes[i - period])
}

// ── Indicator data builder ───────────────────────────────────────────────────

type SeriesData = { type: 'line'; data: number[]; color: string; dashed?: boolean } |
                 { type: 'histogram'; data: number[]; colorFn: (v: number) => string }

function buildSeriesData(id: string, bars: Bar[]): SeriesData[] {
  const closes = bars.map(b => b.close)

  switch (id) {
    case 'rsi': return [{ type: 'line', data: calcRSI(closes), color: '#a855f7' }]
    case 'macd': {
      const { macd, signal, histogram } = calcMACD(closes)
      return [
        { type: 'histogram', data: histogram, colorFn: v => v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(220,38,38,0.7)' },
        { type: 'line', data: macd, color: '#22c55e' },
        { type: 'line', data: signal, color: '#f59e0b' },
      ]
    }
    case 'stoch': {
      const { k, d } = calcStochastic(bars)
      return [{ type: 'line', data: k, color: '#3b82f6' }, { type: 'line', data: d, color: '#f59e0b' }]
    }
    case 'stochrsi': {
      const rsi = calcRSI(closes)
      // Simple StochRSI approximation
      const stoch = rsi.map((r, i) => {
        if (i < 14) return NaN
        const slice = rsi.slice(i - 13, i + 1).filter(v => !isNaN(v))
        const hi = Math.max(...slice), lo = Math.min(...slice)
        return hi === lo ? 50 : ((r - lo) / (hi - lo)) * 100
      })
      const k = calcSMA(stoch, 3), d = calcSMA(k, 3)
      return [{ type: 'line', data: k, color: '#8b5cf6' }, { type: 'line', data: d, color: '#ec4899' }]
    }
    case 'cci': return [{ type: 'line', data: calcCCI(bars), color: '#f59e0b' }]
    case 'williams': return [{ type: 'line', data: calcWilliamsR(bars), color: '#ec4899' }]
    case 'roc': return [{ type: 'line', data: calcROC(closes), color: '#06b6d4' }]
    case 'momentum': return [{ type: 'line', data: calcMomentum(closes), color: '#14b8a6' }]
    case 'mfi': return [{ type: 'line', data: calcMFI(bars), color: '#22c55e' }]
    case 'obv': return [{ type: 'line', data: calcOBV(bars), color: '#3b82f6' }]
    case 'adx': {
      const { adx, pdi, ndi } = calcADX(bars)
      return [
        { type: 'line', data: adx, color: '#22c55e' },
        { type: 'line', data: pdi, color: '#60a5fa' },
        { type: 'line', data: ndi, color: '#f87171' },
      ]
    }
    case 'dmi': {
      const { pdi, ndi } = calcADX(bars)
      return [{ type: 'line', data: pdi, color: '#22c55e' }, { type: 'line', data: ndi, color: '#dc2626' }]
    }
    case 'atr': return [{ type: 'line', data: calcATR(bars), color: '#f59e0b' }]
    default: return []
  }
}

// ── SubPane component ─────────────────────────────────────────────────────────

export function ChartSubPane({ indicatorId, label, color, bars, times, mainChartRef, onRemove, defaultHeight = DEFAULT_HEIGHT }: SubPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [paneHeight, setPaneHeight] = useState(defaultHeight)
  const [collapsed, setCollapsed] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const dragStartH = useRef<number>(defaultHeight)

  // Drag-to-resize: user drags the top grip bar to change height
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartH.current = paneHeight

    const onMouseMove = (ev: MouseEvent) => {
      if (dragStartY.current === null) return
      const delta = ev.clientY - dragStartY.current
      const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta))
      setPaneHeight(newH)
    }
    const onMouseUp = () => {
      dragStartY.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [paneHeight])

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#6b7280',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1f2937', textColor: '#6b7280' },
      timeScale: { borderColor: '#1f2937', visible: false },
      autoSize: true,
      handleScroll: false,
      handleScale: false,
    })

    chartRef.current = chart

    const seriesList = buildSeriesData(indicatorId, bars)
    seriesList.forEach(s => {
      if (s.type === 'line') {
        const series = chart.addSeries(LineSeries, {
          color: s.color,
          lineWidth: 1,
          lineStyle: s.dashed ? 2 : 0,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
        })
        series.setData(
          s.data.map((v, i) => ({ time: times[i], value: v })).filter(d => !isNaN(d.value))
        )
      } else {
        const series = chart.addSeries(HistogramSeries, {
          priceLineVisible: false,
          lastValueVisible: false,
        })
        series.setData(
          s.data.map((v, i) => ({
            time: times[i],
            value: v,
            color: s.colorFn(v),
          })).filter(d => !isNaN(d.value))
        )
      }
    })

    chart.timeScale().fitContent()

    // Sync scroll/zoom with main chart
    const main = mainChartRef.current
    if (main) {
      main.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) chart.timeScale().setVisibleLogicalRange(range)
      })
    }

    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [indicatorId, bars, times, mainChartRef])

  // Compute last value display
  const lastVal = (() => {
    const closes = bars.map(b => b.close)
    if (indicatorId === 'rsi') {
      const v = calcRSI(closes).filter(v => !isNaN(v))
      return v.length ? v[v.length - 1].toFixed(2) : ''
    }
    if (indicatorId === 'macd') {
      const { macd, signal } = calcMACD(closes)
      const m = macd.filter(v => !isNaN(v)), s = signal.filter(v => !isNaN(v))
      return m.length ? `${m[m.length - 1].toFixed(4)}  Sig ${s[s.length - 1]?.toFixed(4) ?? ''}` : ''
    }
    if (indicatorId === 'adx') {
      const { adx } = calcADX(bars)
      const v = adx.filter(v => !isNaN(v))
      return v.length ? v[v.length - 1].toFixed(2) : ''
    }
    if (indicatorId === 'atr') {
      const v = calcATR(bars).filter(v => !isNaN(v))
      return v.length ? v[v.length - 1].toFixed(4) : ''
    }
    return ''
  })()

  const chartAreaHeight = paneHeight - 22 // subtract label row height

  return (
    <div
      className="flex-shrink-0 border-t border-[#1f2937] bg-[#0a0a0a] flex flex-col"
      style={{ height: collapsed ? 26 : paneHeight }}
    >
      {/* Drag-to-resize grip — only visible when expanded */}
      {!collapsed && (
        <div
          onMouseDown={onDragStart}
          className="h-2 w-full flex items-center justify-center cursor-ns-resize flex-shrink-0 hover:bg-white/5 group"
          title="Drag to resize pane"
        >
          <GripHorizontal className="w-4 h-2 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors" />
        </div>
      )}

      {/* Label row */}
      <div className="flex items-center gap-2 px-3 py-0.5 bg-[#0f1117] border-b border-[#1f2937] flex-shrink-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-mono font-semibold text-foreground">{label}</span>
        {lastVal && !collapsed && (
          <span className="text-[10px] font-mono text-muted-foreground ml-1">{lastVal}</span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title={collapsed ? 'Expand pane' : 'Collapse pane'}
          >
            {collapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onRemove(indicatorId)}
            className="p-0.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Remove indicator"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Chart area — fills remaining height, hidden when collapsed */}
      {!collapsed && (
        <div ref={containerRef} className="w-full flex-1 min-h-0" />
      )}
    </div>
  )
}
