import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY
const BASE_URL = 'https://www.alphavantage.co/query'

// Mock data for when API is unavailable
const MOCK_INDICATORS = {
  RSI: { value: 58.4, signal: 'neutral', overbought: false, oversold: false },
  MACD: { macd: 2.34, signal: 1.89, histogram: 0.45, crossover: 'bullish' },
  BBANDS: { upper: 195.50, middle: 189.20, lower: 182.90, bandwidth: 6.67, percentB: 0.72 },
  SMA: { sma20: 187.50, sma50: 182.30, sma200: 175.80, trend: 'bullish' },
  EMA: { ema12: 188.90, ema26: 185.40, trend: 'bullish' },
  ADX: { value: 28.5, trend: 'strong' },
  STOCH: { slowK: 72.3, slowD: 68.9, signal: 'neutral' },
  ATR: { value: 3.45, volatility: 'moderate' },
}

async function fetchIndicator(symbol: string, indicator: string, params: Record<string, string> = {}) {
  if (!API_KEY) return null

  const urlParams = new URLSearchParams({
    function: indicator,
    symbol: symbol.toUpperCase(),
    apikey: API_KEY,
    ...params,
  })

  try {
    const res = await fetch(`${BASE_URL}?${urlParams}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const indicators = searchParams.get('indicators')?.split(',') || ['RSI', 'MACD', 'BBANDS', 'SMA', 'EMA']

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  const results: Record<string, any> = {}
  let source = 'mock'

  if (API_KEY) {
    // Fetch indicators in parallel (respecting rate limits - max 5/min)
    const indicatorPromises = indicators.slice(0, 5).map(async (ind) => {
      const i = ind.toUpperCase()
      let data = null

      switch (i) {
        case 'RSI':
          data = await fetchIndicator(symbol, 'RSI', { interval: 'daily', time_period: '14', series_type: 'close' })
          if (data?.['Technical Analysis: RSI']) {
            const values = Object.values(data['Technical Analysis: RSI']) as any[]
            const latest = values[0]?.RSI ? parseFloat(values[0].RSI) : null
            if (latest !== null) {
              results.RSI = {
                value: latest,
                signal: latest > 70 ? 'overbought' : latest < 30 ? 'oversold' : 'neutral',
                overbought: latest > 70,
                oversold: latest < 30,
              }
              source = 'alpha_vantage'
            }
          }
          break

        case 'MACD':
          data = await fetchIndicator(symbol, 'MACD', { interval: 'daily', series_type: 'close' })
          if (data?.['Technical Analysis: MACD']) {
            const values = Object.values(data['Technical Analysis: MACD']) as any[]
            const latest = values[0]
            const prev = values[1]
            if (latest) {
              const macd = parseFloat(latest.MACD)
              const signal = parseFloat(latest.MACD_Signal)
              const hist = parseFloat(latest.MACD_Hist)
              const prevHist = prev ? parseFloat(prev.MACD_Hist) : 0
              results.MACD = {
                macd,
                signal,
                histogram: hist,
                crossover: hist > 0 && prevHist <= 0 ? 'bullish' : hist < 0 && prevHist >= 0 ? 'bearish' : 'none',
              }
              source = 'alpha_vantage'
            }
          }
          break

        case 'BBANDS':
          data = await fetchIndicator(symbol, 'BBANDS', { interval: 'daily', time_period: '20', series_type: 'close' })
          if (data?.['Technical Analysis: BBANDS']) {
            const values = Object.values(data['Technical Analysis: BBANDS']) as any[]
            const latest = values[0]
            if (latest) {
              const upper = parseFloat(latest['Real Upper Band'])
              const middle = parseFloat(latest['Real Middle Band'])
              const lower = parseFloat(latest['Real Lower Band'])
              results.BBANDS = {
                upper,
                middle,
                lower,
                bandwidth: ((upper - lower) / middle) * 100,
                percentB: middle > 0 ? (middle - lower) / (upper - lower) : 0.5,
              }
              source = 'alpha_vantage'
            }
          }
          break

        case 'SMA':
          const [sma20, sma50, sma200] = await Promise.all([
            fetchIndicator(symbol, 'SMA', { interval: 'daily', time_period: '20', series_type: 'close' }),
            fetchIndicator(symbol, 'SMA', { interval: 'daily', time_period: '50', series_type: 'close' }),
            fetchIndicator(symbol, 'SMA', { interval: 'daily', time_period: '200', series_type: 'close' }),
          ])
          const sma20Val = sma20?.['Technical Analysis: SMA'] ? parseFloat(Object.values(sma20['Technical Analysis: SMA'])[0] as any) : null
          const sma50Val = sma50?.['Technical Analysis: SMA'] ? parseFloat(Object.values(sma50['Technical Analysis: SMA'])[0] as any) : null
          const sma200Val = sma200?.['Technical Analysis: SMA'] ? parseFloat(Object.values(sma200['Technical Analysis: SMA'])[0] as any) : null
          if (sma20Val && sma50Val && sma200Val) {
            results.SMA = {
              sma20: sma20Val,
              sma50: sma50Val,
              sma200: sma200Val,
              trend: sma20Val > sma50Val && sma50Val > sma200Val ? 'bullish' : sma20Val < sma50Val && sma50Val < sma200Val ? 'bearish' : 'mixed',
            }
            source = 'alpha_vantage'
          }
          break

        case 'EMA':
          const [ema12, ema26] = await Promise.all([
            fetchIndicator(symbol, 'EMA', { interval: 'daily', time_period: '12', series_type: 'close' }),
            fetchIndicator(symbol, 'EMA', { interval: 'daily', time_period: '26', series_type: 'close' }),
          ])
          const ema12Val = ema12?.['Technical Analysis: EMA'] ? parseFloat(Object.values(ema12['Technical Analysis: EMA'])[0] as any) : null
          const ema26Val = ema26?.['Technical Analysis: EMA'] ? parseFloat(Object.values(ema26['Technical Analysis: EMA'])[0] as any) : null
          if (ema12Val && ema26Val) {
            results.EMA = {
              ema12: ema12Val,
              ema26: ema26Val,
              trend: ema12Val > ema26Val ? 'bullish' : 'bearish',
            }
            source = 'alpha_vantage'
          }
          break

        case 'ADX':
          data = await fetchIndicator(symbol, 'ADX', { interval: 'daily', time_period: '14' })
          if (data?.['Technical Analysis: ADX']) {
            const values = Object.values(data['Technical Analysis: ADX']) as any[]
            const latest = parseFloat(values[0]?.ADX)
            if (latest) {
              results.ADX = {
                value: latest,
                trend: latest > 25 ? 'strong' : latest > 20 ? 'moderate' : 'weak',
              }
              source = 'alpha_vantage'
            }
          }
          break

        case 'STOCH':
          data = await fetchIndicator(symbol, 'STOCH', { interval: 'daily' })
          if (data?.['Technical Analysis: STOCH']) {
            const values = Object.values(data['Technical Analysis: STOCH']) as any[]
            const latest = values[0]
            if (latest) {
              const slowK = parseFloat(latest.SlowK)
              const slowD = parseFloat(latest.SlowD)
              results.STOCH = {
                slowK,
                slowD,
                signal: slowK > 80 ? 'overbought' : slowK < 20 ? 'oversold' : 'neutral',
              }
              source = 'alpha_vantage'
            }
          }
          break

        case 'ATR':
          data = await fetchIndicator(symbol, 'ATR', { interval: 'daily', time_period: '14' })
          if (data?.['Technical Analysis: ATR']) {
            const values = Object.values(data['Technical Analysis: ATR']) as any[]
            const latest = parseFloat(values[0]?.ATR)
            if (latest) {
              results.ATR = {
                value: latest,
                volatility: latest > 5 ? 'high' : latest > 2 ? 'moderate' : 'low',
              }
              source = 'alpha_vantage'
            }
          }
          break
      }
    })

    await Promise.all(indicatorPromises)
  }

  // Fill in any missing indicators with mock data
  for (const ind of indicators) {
    const key = ind.toUpperCase()
    if (!results[key] && MOCK_INDICATORS[key as keyof typeof MOCK_INDICATORS]) {
      results[key] = MOCK_INDICATORS[key as keyof typeof MOCK_INDICATORS]
    }
  }

  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    indicators: results,
    source,
    timestamp: Date.now(),
  })
}
