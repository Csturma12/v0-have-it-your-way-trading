import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker')

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker required' }, { status: 400 })
  }

  const apiKey = process.env.POLYGON_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 })
  }

  try {
    // Fetch last 60 days of daily data for technical calculations
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/2024-01-01/2026-04-30?limit=100&sort=desc&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    )

    if (!res.ok) throw new Error('Polygon API error')
    const data = await res.json()

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ error: 'No data' }, { status: 404 })
    }

    const bars = data.results.reverse() // oldest to newest
    const closes = bars.map((b: any) => b.c)
    const volumes = bars.map((b: any) => b.v)
    const highs = bars.map((b: any) => b.h)
    const lows = bars.map((b: any) => b.l)

    // Calculate technicals
    const rsi = calculateRSI(closes, 14)
    const sma20 = calculateSMA(closes, 20)
    const sma50 = calculateSMA(closes, 50)
    const sma200 = calculateSMA(closes, 200)
    const momentum5d = closes[closes.length - 1] - closes[Math.max(0, closes.length - 5)]
    const momentum20d = closes[closes.length - 1] - closes[Math.max(0, closes.length - 20)]
    const avgVolume = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20
    const currentVolume = volumes[volumes.length - 1]
    const volumeRatio = currentVolume / avgVolume

    return NextResponse.json(
      {
        ticker,
        rsi: parseFloat(rsi.toFixed(2)),
        sma20: parseFloat(sma20.toFixed(2)),
        sma50: parseFloat(sma50.toFixed(2)),
        sma200: parseFloat(sma200.toFixed(2)),
        momentum5d: parseFloat(momentum5d.toFixed(2)),
        momentum20d: parseFloat(momentum20d.toFixed(2)),
        avgVolume: parseFloat(avgVolume.toFixed(0)),
        currentVolume: parseFloat(currentVolume.toFixed(0)),
        volumeRatio: parseFloat(volumeRatio.toFixed(2)),
        adx: calculateADX(highs, lows, closes, 14),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } }
    )
  } catch (err) {
    console.error('[v0] Technicals fetch failed:', err)
    return NextResponse.json(
      { error: 'Failed to fetch technicals', ticker },
      { status: 500 }
    )
  }
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50
  let gains = 0,
    losses = 0
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

function calculateSMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1]
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period
}

function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number {
  if (highs.length < period) return 25
  
  const tr: number[] = []
  for (let i = 1; i < highs.length; i++) {
    const h = highs[i]
    const l = lows[i]
    const c = closes[i - 1]
    tr.push(Math.max(h - l, Math.abs(h - c), Math.abs(l - c)))
  }

  const atr = tr.slice(-period).reduce((a, b) => a + b, 0) / period

  let plusDM = 0,
    minusDM = 0
  for (let i = highs.length - period; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]

    if (upMove > downMove && upMove > 0) plusDM += upMove
    else if (downMove > upMove && downMove > 0) minusDM += downMove
  }

  const plusDI = (plusDM / atr / period) * 100
  const minusDI = (minusDM / atr / period) * 100
  const di = Math.abs(plusDI - minusDI) / (plusDI + minusDI)
  const adx = 25 + di * 50
  return Math.min(100, Math.max(0, adx))
}
