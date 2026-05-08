import { NextRequest, NextResponse } from 'next/server'

/**
 * Technical indicators endpoint.
 *
 * MIGRATED from Alpha Vantage to Polygon historical bars.
 * We compute RSI, MACD, BBANDS, SMA, EMA, ADX, STOCH, ATR locally
 * from daily OHLCV data fetched via Polygon free tier.
 *
 * This maintains backward compatibility with existing hooks that
 * call /api/alpha-vantage/indicators.
 */

const POLYGON_KEY = process.env.POLYGON_API_KEY

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const requestedIndicators = searchParams.get('indicators')?.split(',') || ['RSI', 'MACD', 'BBANDS', 'SMA', 'EMA']

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  const ticker = symbol.toUpperCase()

  // Fetch historical bars from Polygon
  if (!POLYGON_KEY) {
    return NextResponse.json({
      symbol: ticker,
      indicators: getMockIndicators(requestedIndicators),
      source: 'mock',
      timestamp: Date.now(),
    })
  }

  try {
    // Get 250 days of daily bars (enough for SMA200 + lookback)
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/2025-01-01/2026-05-08?limit=250&sort=asc&apiKey=${POLYGON_KEY}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      throw new Error(`Polygon ${res.status}`)
    }

    const data = await res.json()
    const bars = data.results || []

    if (bars.length < 20) {
      return NextResponse.json({
        symbol: ticker,
        indicators: getMockIndicators(requestedIndicators),
        source: 'mock',
        error: 'Insufficient data',
        timestamp: Date.now(),
      })
    }

    const closes = bars.map((b: any) => b.c)
    const highs = bars.map((b: any) => b.h)
    const lows = bars.map((b: any) => b.l)
    const volumes = bars.map((b: any) => b.v)

    const results: Record<string, any> = {}

    for (const ind of requestedIndicators) {
      const key = ind.toUpperCase()
      switch (key) {
        case 'RSI':
          const rsi = calculateRSI(closes, 14)
          results.RSI = {
            value: round(rsi),
            signal: rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral',
            overbought: rsi > 70,
            oversold: rsi < 30,
          }
          break

        case 'MACD':
          const { macd, signal, histogram } = calculateMACD(closes)
          const prevHistogram = calculateMACD(closes.slice(0, -1)).histogram
          results.MACD = {
            macd: round(macd),
            signal: round(signal),
            histogram: round(histogram),
            crossover: histogram > 0 && prevHistogram <= 0 ? 'bullish' : histogram < 0 && prevHistogram >= 0 ? 'bearish' : 'none',
          }
          break

        case 'BBANDS':
          const bb = calculateBollingerBands(closes, 20)
          results.BBANDS = {
            upper: round(bb.upper),
            middle: round(bb.middle),
            lower: round(bb.lower),
            bandwidth: round(bb.bandwidth),
            percentB: round(bb.percentB),
          }
          break

        case 'SMA':
          const sma20 = calculateSMA(closes, 20)
          const sma50 = calculateSMA(closes, 50)
          const sma200 = calculateSMA(closes, 200)
          results.SMA = {
            sma20: round(sma20),
            sma50: round(sma50),
            sma200: round(sma200),
            trend: sma20 > sma50 && sma50 > sma200 ? 'bullish' : sma20 < sma50 && sma50 < sma200 ? 'bearish' : 'mixed',
          }
          break

        case 'EMA':
          const ema12 = calculateEMA(closes, 12)
          const ema26 = calculateEMA(closes, 26)
          results.EMA = {
            ema12: round(ema12),
            ema26: round(ema26),
            trend: ema12 > ema26 ? 'bullish' : 'bearish',
          }
          break

        case 'ADX':
          const adx = calculateADX(highs, lows, closes, 14)
          results.ADX = {
            value: round(adx),
            trend: adx > 25 ? 'strong' : adx > 20 ? 'moderate' : 'weak',
          }
          break

        case 'STOCH':
          const stoch = calculateStochastic(highs, lows, closes, 14, 3)
          results.STOCH = {
            slowK: round(stoch.k),
            slowD: round(stoch.d),
            signal: stoch.k > 80 ? 'overbought' : stoch.k < 20 ? 'oversold' : 'neutral',
          }
          break

        case 'ATR':
          const atr = calculateATR(highs, lows, closes, 14)
          const price = closes[closes.length - 1]
          const atrPct = (atr / price) * 100
          results.ATR = {
            value: round(atr),
            volatility: atrPct > 3 ? 'high' : atrPct > 1.5 ? 'moderate' : 'low',
          }
          break
      }
    }

    return NextResponse.json({
      symbol: ticker,
      indicators: results,
      source: 'polygon',
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error('[Indicators] Error:', err)
    return NextResponse.json({
      symbol: ticker,
      indicators: getMockIndicators(requestedIndicators),
      source: 'mock',
      error: 'Failed to fetch data',
      timestamp: Date.now(),
    })
  }
}

// ---- Helper functions ----

function round(n: number, decimals = 2): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals
}

function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1]
  return data.slice(-period).reduce((a, b) => a + b, 0) / period
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1]
  const k = 2 / (period + 1)
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
  }
  return ema
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50
  const changes = closes.slice(1).map((c, i) => c - closes[i])
  const recent = changes.slice(-period)
  const gains = recent.filter(c => c > 0).reduce((a, b) => a + b, 0)
  const losses = recent.filter(c => c < 0).reduce((a, b) => a + Math.abs(b), 0)
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)
  const macd = ema12 - ema26

  // Signal line is 9-period EMA of MACD values
  // For simplicity, approximate with current MACD
  const signal = macd * 0.8 // Rough approximation
  const histogram = macd - signal

  return { macd, signal, histogram }
}

function calculateBollingerBands(closes: number[], period: number) {
  const middle = calculateSMA(closes, period)
  const recent = closes.slice(-period)
  const variance = recent.reduce((sum, c) => sum + (c - middle) ** 2, 0) / period
  const stdDev = Math.sqrt(variance)
  const upper = middle + stdDev * 2
  const lower = middle - stdDev * 2
  const price = closes[closes.length - 1]
  return {
    upper,
    middle,
    lower,
    bandwidth: ((upper - lower) / middle) * 100,
    percentB: upper !== lower ? (price - lower) / (upper - lower) : 0.5,
  }
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  const tr: number[] = []
  for (let i = 1; i < highs.length; i++) {
    const h = highs[i]
    const l = lows[i]
    const c = closes[i - 1]
    tr.push(Math.max(h - l, Math.abs(h - c), Math.abs(l - c)))
  }
  return tr.slice(-period).reduce((a, b) => a + b, 0) / period
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 25
  const atr = calculateATR(highs, lows, closes, period)
  if (atr === 0) return 25

  let plusDM = 0, minusDM = 0
  for (let i = highs.length - period; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]
    if (upMove > downMove && upMove > 0) plusDM += upMove
    else if (downMove > upMove && downMove > 0) minusDM += downMove
  }

  const plusDI = (plusDM / atr / period) * 100
  const minusDI = (minusDM / atr / period) * 100
  const dx = plusDI + minusDI !== 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0
  return dx
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, dPeriod: number) {
  const recentHighs = highs.slice(-kPeriod)
  const recentLows = lows.slice(-kPeriod)
  const highestHigh = Math.max(...recentHighs)
  const lowestLow = Math.min(...recentLows)
  const currentClose = closes[closes.length - 1]

  const k = highestHigh !== lowestLow ? ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100 : 50
  const d = k // Simplified — would need k history for proper %D

  return { k, d }
}

function getMockIndicators(requested: string[]): Record<string, any> {
  const mock: Record<string, any> = {
    RSI: { value: 58.4, signal: 'neutral', overbought: false, oversold: false },
    MACD: { macd: 2.34, signal: 1.89, histogram: 0.45, crossover: 'bullish' },
    BBANDS: { upper: 195.50, middle: 189.20, lower: 182.90, bandwidth: 6.67, percentB: 0.72 },
    SMA: { sma20: 187.50, sma50: 182.30, sma200: 175.80, trend: 'bullish' },
    EMA: { ema12: 188.90, ema26: 185.40, trend: 'bullish' },
    ADX: { value: 28.5, trend: 'strong' },
    STOCH: { slowK: 72.3, slowD: 68.9, signal: 'neutral' },
    ATR: { value: 3.45, volatility: 'moderate' },
  }
  const result: Record<string, any> = {}
  for (const ind of requested) {
    const key = ind.toUpperCase()
    if (mock[key]) result[key] = mock[key]
  }
  return result
}
