import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Popular tickers to scan for technical signals
const SCAN_TICKERS = [
  'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'AVGO', 'NFLX',
  'SPY', 'QQQ', 'IWM', 'DIA', 'ARKK',
  'JPM', 'BAC', 'GS', 'MS', 'V', 'MA',
  'XOM', 'CVX', 'COP', 'SLB',
  'LLY', 'UNH', 'JNJ', 'PFE', 'MRNA',
  'PLTR', 'SNOW', 'CRM', 'NOW', 'PANW',
]

export interface TechnicalSignal {
  id: string
  ticker: string
  signal: 'bullish' | 'bearish' | 'neutral'
  type: 'macd_cross' | 'rsi_oversold' | 'rsi_overbought' | 'golden_cross' | 'death_cross' | 'volume_spike' | 'breakout' | 'breakdown'
  title: string
  detail: string
  strength: number // 0-100
  timestamp: number
  price?: number
  indicators?: {
    rsi?: number
    macd?: number
    macdSignal?: number
    macdHist?: number
    sma20?: number
    sma50?: number
    sma200?: number
    volumeRatio?: number
  }
}

async function fetchBars(ticker: string, apiKey: string): Promise<any[]> {
  const res = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/2024-01-01/2026-06-03?limit=100&sort=desc&apiKey=${apiKey}`,
    { signal: AbortSignal.timeout(8000), cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []).reverse() // oldest to newest
}

function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gains = 0, losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1]
    if (delta > 0) gains += delta
    else losses -= delta
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return []
  const k = 2 / (period + 1)
  const emas: number[] = []
  let sum = 0
  for (let i = 0; i < period; i++) sum += closes[i]
  emas.push(sum / period)
  for (let i = period; i < closes.length; i++) {
    emas.push(closes[i] * k + emas[emas.length - 1] * (1 - k))
  }
  return emas
}

function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } | null {
  if (closes.length < 35) return null
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)
  if (ema12.length === 0 || ema26.length === 0) return null
  
  const macdLine: number[] = []
  const offset = 26 - 12
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(ema12[i + offset] - ema26[i])
  }
  
  const signalLine = calculateEMA(macdLine, 9)
  if (signalLine.length === 0) return null
  
  const macd = macdLine[macdLine.length - 1]
  const signal = signalLine[signalLine.length - 1]
  return { macd, signal, histogram: macd - signal }
}

function calculateSMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1]
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period
}

async function scanTicker(ticker: string, apiKey: string): Promise<TechnicalSignal[]> {
  const signals: TechnicalSignal[] = []
  const bars = await fetchBars(ticker, apiKey)
  if (bars.length < 35) return signals

  const closes = bars.map((b: any) => b.c)
  const volumes = bars.map((b: any) => b.v)
  const highs = bars.map((b: any) => b.h)
  const lows = bars.map((b: any) => b.l)
  const currentPrice = closes[closes.length - 1]
  const prevClose = closes[closes.length - 2]
  
  const rsi = calculateRSI(closes)
  const macdData = calculateMACD(closes)
  const prevMacdData = calculateMACD(closes.slice(0, -1))
  const sma20 = calculateSMA(closes, 20)
  const sma50 = calculateSMA(closes, 50)
  const sma200 = calculateSMA(closes, 200)
  const prevSma50 = calculateSMA(closes.slice(0, -1), 50)
  const prevSma200 = calculateSMA(closes.slice(0, -1), 200)
  const avgVolume = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20
  const volumeRatio = volumes[volumes.length - 1] / avgVolume
  
  const now = Date.now()
  
  // MACD Bullish Crossover: MACD line crosses above signal line
  if (macdData && prevMacdData) {
    if (prevMacdData.macd <= prevMacdData.signal && macdData.macd > macdData.signal) {
      signals.push({
        id: `${ticker}-macd-bull-${now}`,
        ticker,
        signal: 'bullish',
        type: 'macd_cross',
        title: `MACD Bullish Crossover`,
        detail: `MACD line crossed above signal line. MACD: ${macdData.macd.toFixed(3)}, Signal: ${macdData.signal.toFixed(3)}`,
        strength: Math.min(100, 60 + Math.abs(macdData.histogram) * 10),
        timestamp: now,
        price: currentPrice,
        indicators: { macd: macdData.macd, macdSignal: macdData.signal, macdHist: macdData.histogram, rsi }
      })
    }
    // MACD Bearish Crossover
    if (prevMacdData.macd >= prevMacdData.signal && macdData.macd < macdData.signal) {
      signals.push({
        id: `${ticker}-macd-bear-${now}`,
        ticker,
        signal: 'bearish',
        type: 'macd_cross',
        title: `MACD Bearish Crossover`,
        detail: `MACD line crossed below signal line. MACD: ${macdData.macd.toFixed(3)}, Signal: ${macdData.signal.toFixed(3)}`,
        strength: Math.min(100, 60 + Math.abs(macdData.histogram) * 10),
        timestamp: now,
        price: currentPrice,
        indicators: { macd: macdData.macd, macdSignal: macdData.signal, macdHist: macdData.histogram, rsi }
      })
    }
  }
  
  // RSI Oversold bounce (RSI crosses above 30)
  const prevRsi = calculateRSI(closes.slice(0, -1))
  if (prevRsi <= 30 && rsi > 30) {
    signals.push({
      id: `${ticker}-rsi-oversold-${now}`,
      ticker,
      signal: 'bullish',
      type: 'rsi_oversold',
      title: `RSI Oversold Bounce`,
      detail: `RSI crossed above 30 from oversold territory. RSI: ${rsi.toFixed(1)}`,
      strength: Math.min(100, 70 + (30 - prevRsi) * 2),
      timestamp: now,
      price: currentPrice,
      indicators: { rsi, sma20, sma50, volumeRatio }
    })
  }
  
  // RSI Overbought reversal (RSI crosses below 70)
  if (prevRsi >= 70 && rsi < 70) {
    signals.push({
      id: `${ticker}-rsi-overbought-${now}`,
      ticker,
      signal: 'bearish',
      type: 'rsi_overbought',
      title: `RSI Overbought Reversal`,
      detail: `RSI crossed below 70 from overbought territory. RSI: ${rsi.toFixed(1)}`,
      strength: Math.min(100, 70 + (prevRsi - 70) * 2),
      timestamp: now,
      price: currentPrice,
      indicators: { rsi, sma20, sma50, volumeRatio }
    })
  }
  
  // Golden Cross (50 SMA crosses above 200 SMA)
  if (prevSma50 <= prevSma200 && sma50 > sma200) {
    signals.push({
      id: `${ticker}-golden-cross-${now}`,
      ticker,
      signal: 'bullish',
      type: 'golden_cross',
      title: `Golden Cross`,
      detail: `50-day SMA crossed above 200-day SMA. Major bullish trend signal.`,
      strength: 90,
      timestamp: now,
      price: currentPrice,
      indicators: { rsi, sma50, sma200, volumeRatio }
    })
  }
  
  // Death Cross (50 SMA crosses below 200 SMA)
  if (prevSma50 >= prevSma200 && sma50 < sma200) {
    signals.push({
      id: `${ticker}-death-cross-${now}`,
      ticker,
      signal: 'bearish',
      type: 'death_cross',
      title: `Death Cross`,
      detail: `50-day SMA crossed below 200-day SMA. Major bearish trend signal.`,
      strength: 90,
      timestamp: now,
      price: currentPrice,
      indicators: { rsi, sma50, sma200, volumeRatio }
    })
  }
  
  // Volume Spike with price move
  if (volumeRatio > 2.5) {
    const priceChange = ((currentPrice - prevClose) / prevClose) * 100
    if (Math.abs(priceChange) > 2) {
      signals.push({
        id: `${ticker}-volume-spike-${now}`,
        ticker,
        signal: priceChange > 0 ? 'bullish' : 'bearish',
        type: 'volume_spike',
        title: `Volume Spike`,
        detail: `${volumeRatio.toFixed(1)}x average volume with ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}% price move`,
        strength: Math.min(100, 50 + volumeRatio * 10),
        timestamp: now,
        price: currentPrice,
        indicators: { rsi, volumeRatio, sma20, sma50 }
      })
    }
  }
  
  // Breakout above 20-day high with volume
  const high20 = Math.max(...highs.slice(-21, -1))
  if (currentPrice > high20 && volumeRatio > 1.5) {
    signals.push({
      id: `${ticker}-breakout-${now}`,
      ticker,
      signal: 'bullish',
      type: 'breakout',
      title: `20-Day Breakout`,
      detail: `Price broke above 20-day high of $${high20.toFixed(2)} with ${volumeRatio.toFixed(1)}x volume`,
      strength: Math.min(100, 65 + volumeRatio * 10),
      timestamp: now,
      price: currentPrice,
      indicators: { rsi, volumeRatio, sma20, sma50 }
    })
  }
  
  // Breakdown below 20-day low with volume
  const low20 = Math.min(...lows.slice(-21, -1))
  if (currentPrice < low20 && volumeRatio > 1.5) {
    signals.push({
      id: `${ticker}-breakdown-${now}`,
      ticker,
      signal: 'bearish',
      type: 'breakdown',
      title: `20-Day Breakdown`,
      detail: `Price broke below 20-day low of $${low20.toFixed(2)} with ${volumeRatio.toFixed(1)}x volume`,
      strength: Math.min(100, 65 + volumeRatio * 10),
      timestamp: now,
      price: currentPrice,
      indicators: { rsi, volumeRatio, sma20, sma50 }
    })
  }
  
  return signals
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.POLYGON_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'POLYGON_API_KEY not set', signals: [] }, { status: 200 })
  }

  const typeFilter = req.nextUrl.searchParams.get('type') // e.g., 'macd_cross', 'rsi_oversold'
  const signalFilter = req.nextUrl.searchParams.get('signal') // 'bullish', 'bearish'
  
  const allSignals: TechnicalSignal[] = []
  
  // Scan tickers in batches of 5 to avoid rate limits
  for (let i = 0; i < SCAN_TICKERS.length; i += 5) {
    const batch = SCAN_TICKERS.slice(i, i + 5)
    const results = await Promise.all(batch.map(t => scanTicker(t, apiKey)))
    allSignals.push(...results.flat())
  }
  
  // Apply filters
  let filtered = allSignals
  if (typeFilter) {
    filtered = filtered.filter(s => s.type === typeFilter)
  }
  if (signalFilter) {
    filtered = filtered.filter(s => s.signal === signalFilter)
  }
  
  // Sort by strength descending
  filtered.sort((a, b) => b.strength - a.strength)
  
  return NextResponse.json({
    signals: filtered.slice(0, 50),
    scannedTickers: SCAN_TICKERS.length,
    timestamp: Date.now(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300' }
  })
}
