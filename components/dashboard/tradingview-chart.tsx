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

// Which categories render on the main price chart vs the sub-chart pane
const OVERLAY_CATEGORIES: IndicatorCategory[] = ['overlay']
const SUBCHART_CATEGORIES: IndicatorCategory[] = ['oscillator', 'volume', 'volatility', 'trend']
import { TrendingUp, Maximize2, Loader2, Settings2, X, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { ChartSubPane, type Bar as SubPaneBar } from './chart-sub-pane'

interface ChartProps {
  ticker: string
  onChangeTicker?: (ticker: string) => void
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

// ── Indicator Categories ─────────────────────────────────────────────────────
type IndicatorCategory = 'overlay' | 'oscillator' | 'volume' | 'volatility' | 'trend'

interface IndicatorDef {
  id: string
  label: string
  color: string
  category: IndicatorCategory
  description?: string
}

const INDICATORS: IndicatorDef[] = [
  // ─── OVERLAY (on price chart) ───
  { id: 'sma9',    label: 'SMA 9',      color: '#f97316', category: 'overlay' },
  { id: 'sma20',   label: 'SMA 20',     color: '#eab308', category: 'overlay' },
  { id: 'sma50',   label: 'SMA 50',     color: '#84cc16', category: 'overlay' },
  { id: 'sma100',  label: 'SMA 100',    color: '#22c55e', category: 'overlay' },
  { id: 'sma200',  label: 'SMA 200',    color: '#14b8a6', category: 'overlay' },
  { id: 'ema9',    label: 'EMA 9',      color: '#f59e0b', category: 'overlay' },
  { id: 'ema12',   label: 'EMA 12',     color: '#fbbf24', category: 'overlay' },
  { id: 'ema21',   label: 'EMA 21',     color: '#3b82f6', category: 'overlay' },
  { id: 'ema26',   label: 'EMA 26',     color: '#60a5fa', category: 'overlay' },
  { id: 'ema50',   label: 'EMA 50',     color: '#a855f7', category: 'overlay' },
  { id: 'ema100',  label: 'EMA 100',    color: '#c084fc', category: 'overlay' },
  { id: 'ema200',  label: 'EMA 200',    color: '#e879f9', category: 'overlay' },
  { id: 'wma20',   label: 'WMA 20',     color: '#06b6d4', category: 'overlay' },
  { id: 'hma20',   label: 'HMA 20',     color: '#0ea5e9', category: 'overlay' },
  { id: 'vwap',    label: 'VWAP',       color: '#22c55e', category: 'overlay' },
  { id: 'vwma20',  label: 'VWMA 20',    color: '#10b981', category: 'overlay' },
  { id: 'bb',      label: 'Bollinger Bands (20,2)', color: '#64748b', category: 'overlay' },
  { id: 'kc',      label: 'Keltner Channel', color: '#8b5cf6', category: 'overlay' },
  { id: 'dc',      label: 'Donchian Channel (20)', color: '#ec4899', category: 'overlay' },
  { id: 'env',     label: 'Envelope (20, 2.5%)', color: '#f472b6', category: 'overlay' },
  { id: 'psar',    label: 'Parabolic SAR', color: '#fcd34d', category: 'overlay' },
  { id: 'supertrend', label: 'SuperTrend', color: '#22d3ee', category: 'overlay' },
  { id: 'ichimoku', label: 'Ichimoku Cloud', color: '#f43f5e', category: 'overlay' },
  { id: 'pivot',   label: 'Pivot Points', color: '#a78bfa', category: 'overlay' },
  { id: 'fib',     label: 'Fib Retracement', color: '#fb923c', category: 'overlay' },
  
  // ─── OSCILLATORS (separate pane) ───
  { id: 'rsi',     label: 'RSI (14)',   color: '#a855f7', category: 'oscillator' },
  { id: 'stoch',   label: 'Stochastic (14,3,3)', color: '#3b82f6', category: 'oscillator' },
  { id: 'stochrsi', label: 'Stoch RSI', color: '#8b5cf6', category: 'oscillator' },
  { id: 'macd',    label: 'MACD (12,26,9)', color: '#22c55e', category: 'oscillator' },
  { id: 'cci',     label: 'CCI (20)',   color: '#f59e0b', category: 'oscillator' },
  { id: 'williams', label: 'Williams %R', color: '#ec4899', category: 'oscillator' },
  { id: 'roc',     label: 'ROC (12)',   color: '#06b6d4', category: 'oscillator' },
  { id: 'momentum', label: 'Momentum (10)', color: '#14b8a6', category: 'oscillator' },
  { id: 'trix',    label: 'TRIX (15)',  color: '#f97316', category: 'oscillator' },
  { id: 'uo',      label: 'Ultimate Oscillator', color: '#84cc16', category: 'oscillator' },
  { id: 'ao',      label: 'Awesome Oscillator', color: '#22c55e', category: 'oscillator' },
  { id: 'dpo',     label: 'DPO (20)',   color: '#0ea5e9', category: 'oscillator' },

  // ─── VOLUME ───
  { id: 'obv',     label: 'OBV',        color: '#3b82f6', category: 'volume' },
  { id: 'mfi',     label: 'MFI (14)',   color: '#22c55e', category: 'volume' },
  { id: 'cmf',     label: 'CMF (20)',   color: '#f59e0b', category: 'volume' },
  { id: 'ad',      label: 'A/D Line',   color: '#a855f7', category: 'volume' },
  { id: 'vpt',     label: 'Volume Price Trend', color: '#ec4899', category: 'volume' },
  { id: 'eom',     label: 'Ease of Movement', color: '#14b8a6', category: 'volume' },
  { id: 'fi',      label: 'Force Index', color: '#f97316', category: 'volume' },
  { id: 'nvi',     label: 'NVI',        color: '#84cc16', category: 'volume' },
  { id: 'pvi',     label: 'PVI',        color: '#06b6d4', category: 'volume' },
  
  // ─── VOLATILITY ───
  { id: 'atr',     label: 'ATR (14)',   color: '#f59e0b', category: 'volatility' },
  { id: 'natr',    label: 'NATR (14)',  color: '#fbbf24', category: 'volatility' },
  { id: 'tr',      label: 'True Range', color: '#f97316', category: 'volatility' },
  { id: 'stddev',  label: 'Std Dev (20)', color: '#a855f7', category: 'volatility' },
  { id: 'hv',      label: 'Historical Volatility', color: '#8b5cf6', category: 'volatility' },
  { id: 'chaikin', label: 'Chaikin Volatility', color: '#ec4899', category: 'volatility' },
  
  // ─── TREND ───
  { id: 'adx',     label: 'ADX (14)',   color: '#22c55e', category: 'trend' },
  { id: 'dmi',     label: 'DMI (+DI/-DI)', color: '#3b82f6', category: 'trend' },
  { id: 'aroon',   label: 'Aroon (25)', color: '#f59e0b', category: 'trend' },
  { id: 'aroonosc', label: 'Aroon Oscillator', color: '#fbbf24', category: 'trend' },
  { id: 'vi',      label: 'Vortex Indicator', color: '#a855f7', category: 'trend' },
  { id: 'mass',    label: 'Mass Index', color: '#ec4899', category: 'trend' },
  { id: 'tsi',     label: 'TSI',        color: '#14b8a6', category: 'trend' },
  { id: 'know',    label: 'Know Sure Thing', color: '#06b6d4', category: 'trend' },
]

const CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  overlay: 'Overlays',
  oscillator: 'Oscillators',
  volume: 'Volume',
  volatility: 'Volatility',
  trend: 'Trend',
}

interface Bar {
  time: number | string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ══════════════════════════════════════════════════════════════════════════════
// INDICATOR CALCULATION FUNCTIONS
// ═════�����������═══════════════════════��════════════════════════════════════════════════

function calcSMA(data: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    const slice = data.slice(i - period + 1, i + 1)
    result.push(slice.reduce((a, b) => a + b, 0) / period)
  }
  return result
}

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let ema = data[0]
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN) }
    else if (i === period - 1) {
      ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
      result.push(ema)
    } else {
      ema = data[i] * k + ema * (1 - k)
      result.push(ema)
    }
  }
  return result
}

function calcWMA(data: number[], period: number): number[] {
  const result: number[] = []
  const denom = (period * (period + 1)) / 2
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - period + 1 + j] * (j + 1)
    }
    result.push(sum / denom)
  }
  return result
}

function calcHMA(data: number[], period: number): number[] {
  const halfWMA = calcWMA(data, Math.floor(period / 2))
  const fullWMA = calcWMA(data, period)
  const diff = halfWMA.map((h, i) => 2 * h - fullWMA[i])
  return calcWMA(diff.filter(d => !isNaN(d)), Math.floor(Math.sqrt(period)))
}

function calcVWAP(bars: Bar[]): number[] {
  let cumPV = 0, cumVol = 0
  return bars.map((b) => {
    const typical = (b.high + b.low + b.close) / 3
    cumPV += typical * b.volume
    cumVol += b.volume
    return cumVol ? cumPV / cumVol : typical
  })
}

function calcVWMA(bars: Bar[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    let sumPV = 0, sumV = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumPV += bars[j].close * bars[j].volume
      sumV += bars[j].volume
    }
    result.push(sumV ? sumPV / sumV : bars[i].close)
  }
  return result
}

function calcBB(closes: number[], period = 20, mult = 2): { upper: number[]; mid: number[]; lower: number[] } {
  const upper: number[] = [], mid: number[] = [], lower: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(NaN); mid.push(NaN); lower.push(NaN) }
    else {
      const slice = closes.slice(i - period + 1, i + 1)
      const avg = slice.reduce((a, b) => a + b, 0) / period
      const std = Math.sqrt(slice.reduce((a, b) => a + (b - avg) ** 2, 0) / period)
      mid.push(avg); upper.push(avg + mult * std); lower.push(avg - mult * std)
    }
  }
  return { upper, mid, lower }
}

function calcKeltner(bars: Bar[], emaPeriod = 20, atrPeriod = 10, mult = 2): { upper: number[]; mid: number[]; lower: number[] } {
  const closes = bars.map(b => b.close)
  const mid = calcEMA(closes, emaPeriod)
  const atr = calcATR(bars, atrPeriod)
  const upper = mid.map((m, i) => m + mult * atr[i])
  const lower = mid.map((m, i) => m - mult * atr[i])
  return { upper, mid, lower }
}

function calcDonchian(bars: Bar[], period = 20): { upper: number[]; mid: number[]; lower: number[] } {
  const upper: number[] = [], mid: number[] = [], lower: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { upper.push(NaN); mid.push(NaN); lower.push(NaN) }
    else {
      const slice = bars.slice(i - period + 1, i + 1)
      const h = Math.max(...slice.map(b => b.high))
      const l = Math.min(...slice.map(b => b.low))
      upper.push(h); lower.push(l); mid.push((h + l) / 2)
    }
  }
  return { upper, mid, lower }
}

function calcEnvelope(closes: number[], period = 20, pct = 2.5): { upper: number[]; mid: number[]; lower: number[] } {
  const mid = calcSMA(closes, period)
  const upper = mid.map(m => m * (1 + pct / 100))
  const lower = mid.map(m => m * (1 - pct / 100))
  return { upper, mid, lower }
}

function calcParabolicSAR(bars: Bar[], af0 = 0.02, afMax = 0.2): number[] {
  const result: number[] = [NaN]
  if (bars.length < 2) return result
  
  let trend = bars[1].close > bars[0].close ? 1 : -1
  let sar = trend === 1 ? bars[0].low : bars[0].high
  let ep = trend === 1 ? bars[0].high : bars[0].low
  let af = af0
  
  for (let i = 1; i < bars.length; i++) {
    const prevSar = sar
    sar = prevSar + af * (ep - prevSar)
    
    if (trend === 1) {
      sar = Math.min(sar, bars[i-1].low, i > 1 ? bars[i-2].low : bars[i-1].low)
      if (bars[i].low < sar) {
        trend = -1; sar = ep; ep = bars[i].low; af = af0
      } else if (bars[i].high > ep) {
        ep = bars[i].high; af = Math.min(af + af0, afMax)
      }
    } else {
      sar = Math.max(sar, bars[i-1].high, i > 1 ? bars[i-2].high : bars[i-1].high)
      if (bars[i].high > sar) {
        trend = 1; sar = ep; ep = bars[i].high; af = af0
      } else if (bars[i].low < ep) {
        ep = bars[i].low; af = Math.min(af + af0, afMax)
      }
    }
    result.push(sar)
  }
  return result
}

function calcSuperTrend(bars: Bar[], period = 10, mult = 3): { line: number[]; direction: number[] } {
  const atr = calcATR(bars, period)
  const line: number[] = [], direction: number[] = []
  let upperBand = 0, lowerBand = 0, superTrend = 0, dir = 1
  
  for (let i = 0; i < bars.length; i++) {
    if (i < period) { line.push(NaN); direction.push(1); continue }
    
    const hl2 = (bars[i].high + bars[i].low) / 2
    const newUpper = hl2 + mult * atr[i]
    const newLower = hl2 - mult * atr[i]
    
    upperBand = (newUpper < upperBand || bars[i-1].close > upperBand) ? newUpper : upperBand
    lowerBand = (newLower > lowerBand || bars[i-1].close < lowerBand) ? newLower : lowerBand
    
    if (superTrend === upperBand && bars[i].close <= upperBand) { dir = -1 }
    else if (superTrend === lowerBand && bars[i].close >= lowerBand) { dir = 1 }
    
    superTrend = dir === 1 ? lowerBand : upperBand
    line.push(superTrend)
    direction.push(dir)
  }
  return { line, direction }
}

function calcIchimoku(bars: Bar[]): {
  tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[]; chikou: number[]
} {
  const tenkan: number[] = [], kijun: number[] = [], senkouA: number[] = [], senkouB: number[] = [], chikou: number[] = []
  
  const donchianMid = (slice: Bar[]) => {
    const h = Math.max(...slice.map(b => b.high))
    const l = Math.min(...slice.map(b => b.low))
    return (h + l) / 2
  }
  
  for (let i = 0; i < bars.length; i++) {
    tenkan.push(i >= 8 ? donchianMid(bars.slice(i - 8, i + 1)) : NaN)
    kijun.push(i >= 25 ? donchianMid(bars.slice(i - 25, i + 1)) : NaN)
    senkouA.push(!isNaN(tenkan[i]) && !isNaN(kijun[i]) ? (tenkan[i] + kijun[i]) / 2 : NaN)
    senkouB.push(i >= 51 ? donchianMid(bars.slice(i - 51, i + 1)) : NaN)
    chikou.push(bars[i].close)
  }
  return { tenkan, kijun, senkouA, senkouB, chikou }
}

function calcPivotPoints(bars: Bar[]): { pivot: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
  if (bars.length < 2) return null
  const prev = bars[bars.length - 2]
  const pivot = (prev.high + prev.low + prev.close) / 3
  const r1 = 2 * pivot - prev.low
  const s1 = 2 * pivot - prev.high
  const r2 = pivot + (prev.high - prev.low)
  const s2 = pivot - (prev.high - prev.low)
  const r3 = prev.high + 2 * (pivot - prev.low)
  const s3 = prev.low - 2 * (prev.high - pivot)
  return { pivot, r1, r2, r3, s1, s2, s3 }
}

function calcFibRetracement(bars: Bar[]): { levels: { pct: number; price: number }[] } | null {
  if (bars.length < 10) return null
  const high = Math.max(...bars.map(b => b.high))
  const low = Math.min(...bars.map(b => b.low))
  const diff = high - low
  const fibs = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
  return { levels: fibs.map(pct => ({ pct, price: high - diff * pct })) }
}

function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = []
  let gainSum = 0, lossSum = 0
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(NaN); continue }
    
    const change = closes[i] - closes[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    
    if (i < period) {
      gainSum += gain; lossSum += loss
      result.push(NaN)
    } else if (i === period) {
      gainSum += gain; lossSum += loss
      const avgGain = gainSum / period
      const avgLoss = lossSum / period
      result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
    } else {
      const prevAvgGain = (result[i-1] === 100) ? 0 : (100 - result[i-1]) > 0 ? (100 / (100 - result[i-1]) - 1) : 0
      const prevAvgLoss = result[i-1] === 0 ? 0 : (100 / result[i-1] - 1) > 0 ? 1 / (100 / result[i-1] - 1) : 0
      const avgGain = (prevAvgGain * (period - 1) + gain) / period
      const avgLoss = (prevAvgLoss * (period - 1) + loss) / period
      result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
    }
  }
  return result
}

function calcStochastic(bars: Bar[], kPeriod = 14, dPeriod = 3, smooth = 3): { k: number[]; d: number[] } {
  const rawK: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < kPeriod - 1) { rawK.push(NaN); continue }
    const slice = bars.slice(i - kPeriod + 1, i + 1)
    const high = Math.max(...slice.map(b => b.high))
    const low = Math.min(...slice.map(b => b.low))
    rawK.push(high === low ? 50 : ((bars[i].close - low) / (high - low)) * 100)
  }
  const k = calcSMA(rawK, smooth)
  const d = calcSMA(k, dPeriod)
  return { k, d }
}

function calcStochRSI(closes: number[], rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3): { k: number[]; d: number[] } {
  const rsi = calcRSI(closes, rsiPeriod)
  const stochRSI: number[] = []
  
  for (let i = 0; i < rsi.length; i++) {
    if (i < stochPeriod - 1 + rsiPeriod) { stochRSI.push(NaN); continue }
    const slice = rsi.slice(i - stochPeriod + 1, i + 1).filter(v => !isNaN(v))
    if (slice.length < stochPeriod) { stochRSI.push(NaN); continue }
    const high = Math.max(...slice)
    const low = Math.min(...slice)
    stochRSI.push(high === low ? 50 : ((rsi[i] - low) / (high - low)) * 100)
  }
  
  const k = calcSMA(stochRSI, kSmooth)
  const d = calcSMA(k, dSmooth)
  return { k, d }
}

function calcMACD(closes: number[], fast = 12, slow = 26, signal = 9): { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)
  const macdLine = emaFast.map((f, i) => f - emaSlow[i])
  const signalLine = calcEMA(macdLine.filter(v => !isNaN(v)), signal)
  
  // Pad signal line to match length
  const padded: number[] = new Array(closes.length - signalLine.length).fill(NaN).concat(signalLine)
  const histogram = macdLine.map((m, i) => m - padded[i])
  
  return { macd: macdLine, signal: padded, histogram }
}

function calcCCI(bars: Bar[], period = 20): number[] {
  const result: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    const slice = bars.slice(i - period + 1, i + 1)
    const typicals = slice.map(b => (b.high + b.low + b.close) / 3)
    const sma = typicals.reduce((a, b) => a + b, 0) / period
    const meanDev = typicals.reduce((a, b) => a + Math.abs(b - sma), 0) / period
    result.push(meanDev === 0 ? 0 : (typicals[typicals.length - 1] - sma) / (0.015 * meanDev))
  }
  return result
}

function calcWilliamsR(bars: Bar[], period = 14): number[] {
  const result: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    const slice = bars.slice(i - period + 1, i + 1)
    const high = Math.max(...slice.map(b => b.high))
    const low = Math.min(...slice.map(b => b.low))
    result.push(high === low ? -50 : ((high - bars[i].close) / (high - low)) * -100)
  }
  return result
}

function calcROC(closes: number[], period = 12): number[] {
  return closes.map((c, i) => i < period ? NaN : ((c - closes[i - period]) / closes[i - period]) * 100)
}

function calcMomentum(closes: number[], period = 10): number[] {
  return closes.map((c, i) => i < period ? NaN : c - closes[i - period])
}

function calcTRIX(closes: number[], period = 15): number[] {
  const ema1 = calcEMA(closes, period)
  const ema2 = calcEMA(ema1.filter(v => !isNaN(v)), period)
  const ema3 = calcEMA(ema2.filter(v => !isNaN(v)), period)
  return ema3.map((v, i) => i === 0 ? NaN : ((v - ema3[i-1]) / ema3[i-1]) * 100)
}

function calcUltimateOscillator(bars: Bar[], p1 = 7, p2 = 14, p3 = 28): number[] {
  const result: number[] = []
  const bp: number[] = [], tr: number[] = []
  
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) { bp.push(0); tr.push(0); result.push(NaN); continue }
    const b = bars[i]
    const prevClose = bars[i-1].close
    bp.push(b.close - Math.min(b.low, prevClose))
    tr.push(Math.max(b.high, prevClose) - Math.min(b.low, prevClose))
    
    if (i < p3) { result.push(NaN); continue }
    
    const avg1 = bp.slice(-p1).reduce((a,b) => a+b, 0) / tr.slice(-p1).reduce((a,b) => a+b, 0)
    const avg2 = bp.slice(-p2).reduce((a,b) => a+b, 0) / tr.slice(-p2).reduce((a,b) => a+b, 0)
    const avg3 = bp.slice(-p3).reduce((a,b) => a+b, 0) / tr.slice(-p3).reduce((a,b) => a+b, 0)
    result.push(100 * (4 * avg1 + 2 * avg2 + avg3) / 7)
  }
  return result
}

function calcAwesomeOscillator(bars: Bar[]): number[] {
  const midpoints = bars.map(b => (b.high + b.low) / 2)
  const sma5 = calcSMA(midpoints, 5)
  const sma34 = calcSMA(midpoints, 34)
  return sma5.map((s5, i) => s5 - sma34[i])
}

function calcDPO(closes: number[], period = 20): number[] {
  const shift = Math.floor(period / 2) + 1
  const sma = calcSMA(closes, period)
  return closes.map((c, i) => i < period + shift - 1 ? NaN : c - sma[i - shift])
}

function calcOBV(bars: Bar[]): number[] {
  let obv = 0
  return bars.map((b, i) => {
    if (i === 0) return 0
    if (b.close > bars[i-1].close) obv += b.volume
    else if (b.close < bars[i-1].close) obv -= b.volume
    return obv
  })
}

function calcMFI(bars: Bar[], period = 14): number[] {
  const result: number[] = []
  const typicals = bars.map(b => (b.high + b.low + b.close) / 3)
  const mf = bars.map((b, i) => typicals[i] * b.volume)
  
  for (let i = 0; i < bars.length; i++) {
    if (i < period) { result.push(NaN); continue }
    let posMF = 0, negMF = 0
    for (let j = i - period + 1; j <= i; j++) {
      if (typicals[j] > typicals[j-1]) posMF += mf[j]
      else if (typicals[j] < typicals[j-1]) negMF += mf[j]
    }
    result.push(negMF === 0 ? 100 : 100 - 100 / (1 + posMF / negMF))
  }
  return result
}

function calcCMF(bars: Bar[], period = 20): number[] {
  const result: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    const slice = bars.slice(i - period + 1, i + 1)
    let mfvSum = 0, volSum = 0
    slice.forEach(b => {
      const mfm = b.high === b.low ? 0 : ((b.close - b.low) - (b.high - b.close)) / (b.high - b.low)
      mfvSum += mfm * b.volume
      volSum += b.volume
    })
    result.push(volSum === 0 ? 0 : mfvSum / volSum)
  }
  return result
}

function calcAD(bars: Bar[]): number[] {
  let ad = 0
  return bars.map(b => {
    const mfm = b.high === b.low ? 0 : ((b.close - b.low) - (b.high - b.close)) / (b.high - b.low)
    ad += mfm * b.volume
    return ad
  })
}

function calcVPT(bars: Bar[]): number[] {
  let vpt = 0
  return bars.map((b, i) => {
    if (i === 0) return 0
    vpt += b.volume * ((b.close - bars[i-1].close) / bars[i-1].close)
    return vpt
  })
}

function calcEOM(bars: Bar[], period = 14): number[] {
  const raw = bars.map((b, i) => {
    if (i === 0) return NaN
    const dm = ((b.high + b.low) / 2) - ((bars[i-1].high + bars[i-1].low) / 2)
    const br = (b.volume / 1e6) / (b.high - b.low || 1)
    return dm / br
  })
  return calcSMA(raw, period)
}

function calcForceIndex(bars: Bar[], period = 13): number[] {
  const fi = bars.map((b, i) => i === 0 ? 0 : (b.close - bars[i-1].close) * b.volume)
  return calcEMA(fi, period)
}

function calcATR(bars: Bar[], period = 14): number[] {
  const tr = bars.map((b, i) => {
    if (i === 0) return b.high - b.low
    const prev = bars[i - 1]
    return Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close))
  })
  return calcEMA(tr, period)
}

function calcNATR(bars: Bar[], period = 14): number[] {
  const atr = calcATR(bars, period)
  return atr.map((a, i) => (a / bars[i].close) * 100)
}

function calcTrueRange(bars: Bar[]): number[] {
  return bars.map((b, i) => {
    if (i === 0) return b.high - b.low
    const prev = bars[i - 1]
    return Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close))
  })
}

function calcStdDev(closes: number[], period = 20): number[] {
  const result: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    const slice = closes.slice(i - period + 1, i + 1)
    const avg = slice.reduce((a, b) => a + b, 0) / period
    result.push(Math.sqrt(slice.reduce((a, b) => a + (b - avg) ** 2, 0) / period))
  }
  return result
}

function calcHistoricalVolatility(closes: number[], period = 20): number[] {
  const returns = closes.map((c, i) => i === 0 ? NaN : Math.log(c / closes[i-1]))
  const std = calcStdDev(returns.filter(r => !isNaN(r)), period)
  return new Array(closes.length - std.length).fill(NaN).concat(std.map(s => s * Math.sqrt(252) * 100))
}

function calcADX(bars: Bar[], period = 14): { adx: number[]; pdi: number[]; ndi: number[] } {
  const tr: number[] = [], pdm: number[] = [], ndm: number[] = []
  
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) { tr.push(0); pdm.push(0); ndm.push(0); continue }
    const b = bars[i], prev = bars[i-1]
    tr.push(Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close)))
    const upMove = b.high - prev.high
    const downMove = prev.low - b.low
    pdm.push(upMove > downMove && upMove > 0 ? upMove : 0)
    ndm.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }
  
  const atr = calcEMA(tr, period)
  const smoothPDM = calcEMA(pdm, period)
  const smoothNDM = calcEMA(ndm, period)
  
  const pdi = smoothPDM.map((p, i) => atr[i] ? (p / atr[i]) * 100 : 0)
  const ndi = smoothNDM.map((n, i) => atr[i] ? (n / atr[i]) * 100 : 0)
  const dx = pdi.map((p, i) => (p + ndi[i]) ? Math.abs(p - ndi[i]) / (p + ndi[i]) * 100 : 0)
  const adx = calcEMA(dx, period)
  
  return { adx, pdi, ndi }
}

function calcAroon(bars: Bar[], period = 25): { up: number[]; down: number[] } {
  const up: number[] = [], down: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period) { up.push(NaN); down.push(NaN); continue }
    const slice = bars.slice(i - period, i + 1)
    let highIdx = 0, lowIdx = 0
    slice.forEach((b, j) => {
      if (b.high >= slice[highIdx].high) highIdx = j
      if (b.low <= slice[lowIdx].low) lowIdx = j
    })
    up.push(((period - (period - highIdx)) / period) * 100)
    down.push(((period - (period - lowIdx)) / period) * 100)
  }
  return { up, down }
}

function calcAroonOsc(bars: Bar[], period = 25): number[] {
  const { up, down } = calcAroon(bars, period)
  return up.map((u, i) => u - down[i])
}

function calcVortex(bars: Bar[], period = 14): { vip: number[]; vim: number[] } {
  const vmPlus: number[] = [], vmMinus: number[] = [], tr: number[] = []
  
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) { vmPlus.push(0); vmMinus.push(0); tr.push(0); continue }
    vmPlus.push(Math.abs(bars[i].high - bars[i-1].low))
    vmMinus.push(Math.abs(bars[i].low - bars[i-1].high))
    tr.push(Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i-1].close), Math.abs(bars[i].low - bars[i-1].close)))
  }
  
  const vip: number[] = [], vim: number[] = []
  for (let i = 0; i < bars.length; i++) {
    if (i < period) { vip.push(NaN); vim.push(NaN); continue }
    const sumVMP = vmPlus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    const sumVMM = vmMinus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    const sumTR = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    vip.push(sumTR ? sumVMP / sumTR : 0)
    vim.push(sumTR ? sumVMM / sumTR : 0)
  }
  return { vip, vim }
}

type LineSeries_t = ISeriesApi<'Line'>
type HistoSeries_t = ISeriesApi<'Histogram'>
type AreaSeries_t = ISeriesApi<'Area'>

export function TradingViewChart({ ticker, onChangeTicker }: ChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const indicatorRefs = useRef<Record<string, (LineSeries_t | HistoSeries_t | AreaSeries_t)[]>>({})
  const barsRef = useRef<SubPaneBar[]>([])

  const [range, setRange] = useState('1D')
  const [chartReady, setChartReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showIndicators, setShowIndicators] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<IndicatorCategory>>(new Set(['overlay']))
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set(['ema21', 'rsi', 'macd']))
  const [quote, setQuote] = useState<{ last: number; change: number; changePct: number } | null>(null)
  const [loadedBars, setLoadedBars] = useState<SubPaneBar[]>([])
  const [tickerInput, setTickerInput] = useState('')
  const [tickerSearchActive, setTickerSearchActive] = useState(false)
  const tickerInputRef = useRef<HTMLInputElement>(null)

  // Sub-chart indicator IDs that are active (each gets its own pane)
  const activeSubIds = INDICATORS.filter(
    i => SUBCHART_CATEGORIES.includes(i.category) && activeIndicators.has(i.id)
  ).map(i => i.id)

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const { width, height } = container.getBoundingClientRect()

    const chart = createChart(container, {
      width: width || 400,
      height: height || 300,
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
      timeScale: { borderColor: '#222', timeVisible: true, secondsVisible: false },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#dc2626',
      borderUpColor: '#22c55e', borderDownColor: '#dc2626',
      wickUpColor: '#22c55e', wickDownColor: '#dc2626',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#22c55e', priceFormat: { type: 'volume' }, priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    chartRef.current = chart
    candleRef.current = candleSeries
    volumeRef.current = volumeSeries
    setChartReady(true)

    // Use ResizeObserver to handle dynamic sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect
        if (w > 0 && h > 0 && chartRef.current) {
          chartRef.current.resize(w, h)
        }
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
      indicatorRefs.current = {}
      setChartReady(false)
    }
  }, [])

  const clearIndicators = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return
    Object.values(indicatorRefs.current).flat().forEach(s => { try { chart.removeSeries(s) } catch {} })
    indicatorRefs.current = {}
  }, [])

  const drawIndicators = useCallback((bars: Bar[], active: Set<string>) => {
    const chart = chartRef.current
    if (!chart || bars.length === 0) return
    clearIndicators()

    const closes = bars.map(b => b.close)
    const times = bars.map(b => b.time)

    const toLineData = (values: number[]): LineData[] =>
      values.map((v, i) => ({ time: times[i] as UTCTimestamp, value: v })).filter(d => !isNaN(d.value))

    // Only overlay indicators go on the main chart
    const addLine = (color: string, lineWidth: 1 | 2 | 3 = 1, dashed = false) =>
      chart.addSeries(LineSeries, { color, lineWidth, lineStyle: dashed ? 2 : 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })

    const store = (id: string, s: LineSeries_t | HistoSeries_t | AreaSeries_t) => {
      if (!indicatorRefs.current[id]) indicatorRefs.current[id] = []
      indicatorRefs.current[id].push(s)
    }

    // ─── OVERLAY INDICATORS (main chart only) ───
    if (active.has('sma9'))   { const s = addLine('#f97316', 1); s.setData(toLineData(calcSMA(closes, 9)));   store('sma9', s) }
    if (active.has('sma20'))  { const s = addLine('#eab308', 1); s.setData(toLineData(calcSMA(closes, 20)));  store('sma20', s) }
    if (active.has('sma50'))  { const s = addLine('#84cc16', 1); s.setData(toLineData(calcSMA(closes, 50)));  store('sma50', s) }
    if (active.has('sma100')) { const s = addLine('#22c55e', 2); s.setData(toLineData(calcSMA(closes, 100))); store('sma100', s) }
    if (active.has('sma200')) { const s = addLine('#14b8a6', 2); s.setData(toLineData(calcSMA(closes, 200))); store('sma200', s) }
    if (active.has('ema9'))   { const s = addLine('#f59e0b', 1); s.setData(toLineData(calcEMA(closes, 9)));   store('ema9', s) }
    if (active.has('ema12'))  { const s = addLine('#fbbf24', 1); s.setData(toLineData(calcEMA(closes, 12)));  store('ema12', s) }
    if (active.has('ema21'))  { const s = addLine('#3b82f6', 1); s.setData(toLineData(calcEMA(closes, 21)));  store('ema21', s) }
    if (active.has('ema26'))  { const s = addLine('#60a5fa', 1); s.setData(toLineData(calcEMA(closes, 26)));  store('ema26', s) }
    if (active.has('ema50'))  { const s = addLine('#a855f7', 2); s.setData(toLineData(calcEMA(closes, 50)));  store('ema50', s) }
    if (active.has('ema100')) { const s = addLine('#c084fc', 2); s.setData(toLineData(calcEMA(closes, 100))); store('ema100', s) }
    if (active.has('ema200')) { const s = addLine('#e879f9', 2); s.setData(toLineData(calcEMA(closes, 200))); store('ema200', s) }
    if (active.has('wma20'))  { const s = addLine('#06b6d4', 1); s.setData(toLineData(calcWMA(closes, 20)));  store('wma20', s) }
    if (active.has('hma20'))  { const s = addLine('#0ea5e9', 1); s.setData(toLineData(calcHMA(closes, 20)));  store('hma20', s) }
    if (active.has('vwap'))   { const s = addLine('#22c55e', 1, true); s.setData(toLineData(calcVWAP(bars))); store('vwap', s) }
    if (active.has('vwma20')) { const s = addLine('#10b981', 1); s.setData(toLineData(calcVWMA(bars, 20)));   store('vwma20', s) }
    
    if (active.has('bb')) {
      const { upper, mid, lower } = calcBB(closes)
      const sU = addLine('#64748b', 1, true); sU.setData(toLineData(upper)); store('bb', sU)
      const sM = addLine('#64748b', 1);       sM.setData(toLineData(mid));   store('bb', sM)
      const sL = addLine('#64748b', 1, true); sL.setData(toLineData(lower)); store('bb', sL)
    }
    if (active.has('kc')) {
      const { upper, mid, lower } = calcKeltner(bars)
      const sU = addLine('#8b5cf6', 1, true); sU.setData(toLineData(upper)); store('kc', sU)
      const sM = addLine('#8b5cf6', 1);       sM.setData(toLineData(mid));   store('kc', sM)
      const sL = addLine('#8b5cf6', 1, true); sL.setData(toLineData(lower)); store('kc', sL)
    }
    if (active.has('dc')) {
      const { upper, mid, lower } = calcDonchian(bars)
      const sU = addLine('#ec4899', 1);       sU.setData(toLineData(upper)); store('dc', sU)
      const sM = addLine('#ec4899', 1, true); sM.setData(toLineData(mid));   store('dc', sM)
      const sL = addLine('#ec4899', 1);       sL.setData(toLineData(lower)); store('dc', sL)
    }
    if (active.has('env')) {
      const { upper, mid, lower } = calcEnvelope(closes)
      const sU = addLine('#f472b6', 1, true); sU.setData(toLineData(upper)); store('env', sU)
      const sM = addLine('#f472b6', 1);       sM.setData(toLineData(mid));   store('env', sM)
      const sL = addLine('#f472b6', 1, true); sL.setData(toLineData(lower)); store('env', sL)
    }
    if (active.has('psar')) {
      const s = chart.addSeries(LineSeries, { color: '#fcd34d', lineWidth: 0, pointMarkersVisible: true, pointMarkersRadius: 2, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false })
      s.setData(toLineData(calcParabolicSAR(bars))); store('psar', s)
    }
    if (active.has('supertrend')) {
      const { line, direction } = calcSuperTrend(bars)
      const upData   = line.map((v, i) => ({ time: times[i] as UTCTimestamp, value: direction[i] === 1  ? v : NaN })).filter(d => !isNaN(d.value))
      const downData = line.map((v, i) => ({ time: times[i] as UTCTimestamp, value: direction[i] === -1 ? v : NaN })).filter(d => !isNaN(d.value))
      const sUp = addLine('#22c55e', 2); sUp.setData(upData);   store('supertrend', sUp)
      const sDn = addLine('#dc2626', 2); sDn.setData(downData); store('supertrend', sDn)
    }
    if (active.has('ichimoku')) {
      const { tenkan, kijun, senkouA, senkouB } = calcIchimoku(bars)
      const sT = addLine('#2563eb', 1); sT.setData(toLineData(tenkan));  store('ichimoku', sT)
      const sK = addLine('#dc2626', 1); sK.setData(toLineData(kijun));   store('ichimoku', sK)
      const sA = addLine('#22c55e', 1); sA.setData(toLineData(senkouA)); store('ichimoku', sA)
      const sB = addLine('#ec4899', 1); sB.setData(toLineData(senkouB)); store('ichimoku', sB)
    }
    if (active.has('pivot')) {
      const pp = calcPivotPoints(bars)
      if (pp) {
        const addH = (val: number, color: string) => {
          const s = addLine(color, 1, true)
          s.setData([{ time: times[0] as UTCTimestamp, value: val }, { time: times[times.length - 1] as UTCTimestamp, value: val }])
          store('pivot', s)
        }
        addH(pp.pivot, '#a78bfa')
        addH(pp.r1, '#4ade80'); addH(pp.r2, '#22c55e'); addH(pp.r3, '#16a34a')
        addH(pp.s1, '#f87171'); addH(pp.s2, '#dc2626'); addH(pp.s3, '#b91c1c')
      }
    }
    if (active.has('fib')) {
      const fib = calcFibRetracement(bars)
      if (fib) {
        fib.levels.forEach(({ price }) => {
          const s = addLine('#fb923c', 1, true)
          s.setData([{ time: times[0] as UTCTimestamp, value: price }, { time: times[times.length - 1] as UTCTimestamp, value: price }])
          store('fib', s)
        })
      }
    }
    // Sub-chart indicators (oscillators, volume, volatility, trend) are handled
    // by ChartSubPane components rendered in JSX below — nothing to do here.

  }, [clearIndicators])

  const lastBarsRef = useRef<Bar[]>([])

  // Fetch bars whenever ticker or range changes (after chart is ready)
  useEffect(() => {
    if (!chartReady) return
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
        if (data.error) { setError(data.error); candleSeries.setData([]); volumeSeries.setData([]); return }
        const bars: Bar[] = data.bars || []
        if (bars.length === 0) { setError('No data for this range'); candleSeries.setData([]); volumeSeries.setData([]); return }

        const candles: CandlestickData[] = bars.map((b) => ({ time: b.time as CandlestickData['time'], open: b.open, high: b.high, low: b.low, close: b.close }))
        const volumes: HistogramData[] = bars.map((b) => ({ time: b.time as HistogramData['time'], value: b.volume, color: b.close >= b.open ? 'rgba(34,197,94,0.35)' : 'rgba(220,38,38,0.35)' }))

        candleSeries.setData(candles)
        volumeSeries.setData(volumes)
        chart.timeScale().fitContent()

        lastBarsRef.current = bars
        barsRef.current = bars
        setLoadedBars([...bars])
        drawIndicators(bars, activeIndicators)
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load chart data') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, range, chartReady])

  // Redraw indicators when active set changes
  useEffect(() => {
    if (lastBarsRef.current.length > 0) drawIndicators(lastBarsRef.current, activeIndicators)
  }, [activeIndicators, drawIndicators])

  // Fetch live quote
  useEffect(() => {
    let cancelled = false
    fetch(`/api/polygon/quote?ticker=${ticker}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled && !data.error) setQuote({ last: data.last, change: data.change, changePct: data.changePct }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [ticker])

  const toggleIndicator = (id: string) => {
    setActiveIndicators((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const toggleCategory = (cat: IndicatorCategory) => {
    setExpandedCategories(prev => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next })
  }

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    document.fullscreenElement !== wrapperRef.current ? wrapperRef.current.requestFullscreen?.() : document.exitFullscreen?.()
  }

  const isUp = quote ? quote.change >= 0 : true
  const grouped = INDICATORS.reduce((acc, ind) => { (acc[ind.category] ||= []).push(ind); return acc }, {} as Record<IndicatorCategory, IndicatorDef[]>)

  return (
    <div ref={wrapperRef} className="flex flex-col h-full bg-[#0a0a0a]">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/60 flex-shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <TrendingUp className="w-3.5 h-3.5 text-theme-green flex-shrink-0" />

          {/* Inline ticker search */}
          {tickerSearchActive ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const val = tickerInput.trim().toUpperCase()
                if (val && onChangeTicker) onChangeTicker(val)
                setTickerSearchActive(false)
                setTickerInput('')
              }}
              className="flex items-center gap-1"
            >
              <input
                ref={tickerInputRef}
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value.toUpperCase())}
                onBlur={() => { setTickerSearchActive(false); setTickerInput('') }}
                onKeyDown={e => e.key === 'Escape' && (setTickerSearchActive(false), setTickerInput(''))}
                placeholder={ticker}
                autoFocus
                className="w-20 px-1.5 py-0.5 bg-white/10 border border-theme-green/60 rounded text-sm font-mono font-bold tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-theme-green"
              />
            </form>
          ) : (
            <button
              onClick={() => { setTickerSearchActive(true); setTickerInput('') }}
              className="flex items-center gap-1 font-mono font-bold text-sm tracking-wider hover:text-theme-green transition-colors group"
              title="Click to change ticker"
            >
              {ticker}
              <Search className="w-3 h-3 text-muted-foreground/50 group-hover:text-theme-green transition-colors" />
            </button>
          )}

          {quote && (
            <>
              <span className="font-mono text-sm tabular-nums">${quote.last.toFixed(2)}</span>
              <span className={`font-mono text-xs tabular-nums ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}{quote.changePct.toFixed(2)}%)
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-wrap">
          <div className="flex items-center gap-0.5 border-r border-border/50 pr-2 mr-1">
            <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mr-1">Intraday</span>
            {TIMEFRAMES.slice(0, 4).map((tf) => (
              <button key={tf.value} onClick={() => setRange(tf.value)}
                className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded transition-colors ${
                  range === tf.value ? 'bg-theme-green/20 text-green-400 border border-green-500/40' : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                }`}>{tf.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 border-r border-border/50 pr-2 mr-1">
            <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mr-1">Range</span>
            {TIMEFRAMES.slice(4).map((tf) => (
              <button key={tf.value} onClick={() => setRange(tf.value)}
                className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded transition-colors ${
                  range === tf.value ? 'bg-theme-green/20 text-green-400 border border-green-500/40' : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                }`}>{tf.label}</button>
            ))}
          </div>

          <button onClick={() => setShowIndicators((v) => !v)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
              showIndicators ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'text-muted-foreground border-transparent hover:bg-white/5 hover:text-foreground'
            }`}>
            <Settings2 className="w-3 h-3" />
            Indicators
            {activeIndicators.size > 0 && <span className="ml-0.5 bg-blue-500/30 text-blue-300 text-[9px] px-1 rounded-full">{activeIndicators.size}</span>}
          </button>

          <div className="w-px h-3.5 bg-border mx-1" />
          <button onClick={toggleFullscreen} className="p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded">
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Indicator Picker ── */}
      {showIndicators && (
        <div className="border-b border-border bg-card/40 flex-shrink-0 max-h-[300px] overflow-y-auto">
          <div className="px-3 py-2 space-y-2">
            {(Object.keys(grouped) as IndicatorCategory[]).map((cat) => (
              <div key={cat} className="border border-border/30 rounded-lg overflow-hidden">
                <button onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-3 py-1.5 bg-card/50 hover:bg-card/80 transition-colors">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABELS[cat]} ({grouped[cat].filter(i => activeIndicators.has(i.id)).length}/{grouped[cat].length})
                  </span>
                  {expandedCategories.has(cat) ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </button>
                {expandedCategories.has(cat) && (
                  <div className="px-2 py-1.5 flex flex-wrap gap-1">
                    {grouped[cat].map((ind) => {
                      const active = activeIndicators.has(ind.id)
                      return (
                        <button key={ind.id} onClick={() => toggleIndicator(ind.id)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold transition-all ${
                            active ? 'bg-card border-border/60 text-foreground' : 'bg-transparent border-border/20 text-muted-foreground hover:border-border/50'
                          }`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? ind.color : '#555' }} />
                          {ind.label}
                          {active && <X className="w-2.5 h-2.5 text-muted-foreground" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <button onClick={() => setActiveIndicators(new Set())} className="text-[9px] font-mono text-muted-foreground hover:text-red-400 transition-colors">
                Clear all indicators
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main chart container — shrinks to give room to sub-panes ── */}
      <div className="relative flex-1 min-h-0">
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

      {/* ── Per-indicator sub-panes — scrollable area so multiple oscillators
           don't blow out the chart widget height ── */}
      {loadedBars.length > 0 && activeSubIds.length > 0 && (
        <div className="overflow-y-auto flex-shrink-0" style={{ maxHeight: '55%' }}>
          {activeSubIds.map(id => {
            const ind = INDICATORS.find(i => i.id === id)!
            const times = loadedBars.map(b => b.time as UTCTimestamp)
            return (
              <ChartSubPane
                key={id}
                indicatorId={id}
                label={ind.label}
                color={ind.color}
                bars={loadedBars as SubPaneBar[]}
                times={times}
                mainChartRef={chartRef}
                onRemove={(rmId) => toggleIndicator(rmId)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
