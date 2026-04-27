import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.TRADIER_API_KEY
const BASE_URL = 'https://sandbox.tradier.com/v1'

// Mock options chain for demo
const MOCK_CHAIN = {
  calls: [
    { strike: 180, bid: 12.50, ask: 12.80, last: 12.65, volume: 15420, oi: 42500, iv: 32.5, delta: 0.72, gamma: 0.024, theta: -0.18, vega: 0.42 },
    { strike: 185, bid: 8.90, ask: 9.20, last: 9.05, volume: 28350, oi: 68200, iv: 30.8, delta: 0.58, gamma: 0.032, theta: -0.22, vega: 0.48 },
    { strike: 190, bid: 5.80, ask: 6.10, last: 5.95, volume: 45200, oi: 125000, iv: 29.2, delta: 0.45, gamma: 0.038, theta: -0.25, vega: 0.52 },
    { strike: 195, bid: 3.40, ask: 3.70, last: 3.55, volume: 32100, oi: 98500, iv: 28.5, delta: 0.32, gamma: 0.035, theta: -0.21, vega: 0.45 },
    { strike: 200, bid: 1.80, ask: 2.10, last: 1.95, volume: 18500, oi: 72000, iv: 28.1, delta: 0.22, gamma: 0.028, theta: -0.16, vega: 0.38 },
  ],
  puts: [
    { strike: 180, bid: 2.20, ask: 2.50, last: 2.35, volume: 12800, oi: 38500, iv: 31.2, delta: -0.28, gamma: 0.024, theta: -0.15, vega: 0.40 },
    { strike: 185, bid: 4.10, ask: 4.40, last: 4.25, volume: 22400, oi: 55200, iv: 30.5, delta: -0.42, gamma: 0.032, theta: -0.20, vega: 0.46 },
    { strike: 190, bid: 6.80, ask: 7.10, last: 6.95, volume: 38500, oi: 92000, iv: 29.8, delta: -0.55, gamma: 0.038, theta: -0.24, vega: 0.50 },
    { strike: 195, bid: 10.20, ask: 10.50, last: 10.35, volume: 25600, oi: 78500, iv: 29.2, delta: -0.68, gamma: 0.035, theta: -0.22, vega: 0.47 },
    { strike: 200, bid: 14.50, ask: 14.80, last: 14.65, volume: 15200, oi: 52000, iv: 28.8, delta: -0.78, gamma: 0.028, theta: -0.18, vega: 0.42 },
  ],
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const expiration = searchParams.get('expiration') // YYYY-MM-DD
  const greeks = searchParams.get('greeks') !== 'false' // Include Greeks by default

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  let source = 'mock'
  let expirations: string[] = []
  let chain = MOCK_CHAIN
  let underlyingPrice = 189.50

  if (API_KEY) {
    try {
      // First get available expirations
      const expRes = await fetch(`${BASE_URL}/markets/options/expirations?symbol=${symbol.toUpperCase()}`, {
        headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
        next: { revalidate: 3600 },
      })

      if (expRes.ok) {
        const expData = await expRes.json()
        expirations = expData.expirations?.date || []

        // Get quote for underlying price
        const quoteRes = await fetch(`${BASE_URL}/markets/quotes?symbols=${symbol.toUpperCase()}`, {
          headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
          next: { revalidate: 30 },
        })
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json()
          underlyingPrice = quoteData.quotes?.quote?.last || 0
        }

        // Get options chain for selected or first expiration
        const selectedExp = expiration || expirations[0]
        if (selectedExp) {
          const chainUrl = greeks
            ? `${BASE_URL}/markets/options/chains?symbol=${symbol.toUpperCase()}&expiration=${selectedExp}&greeks=true`
            : `${BASE_URL}/markets/options/chains?symbol=${symbol.toUpperCase()}&expiration=${selectedExp}`

          const chainRes = await fetch(chainUrl, {
            headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
            next: { revalidate: 60 },
          })

          if (chainRes.ok) {
            const chainData = await chainRes.json()
            const options = chainData.options?.option || []

            const calls = options
              .filter((o: any) => o.option_type === 'call')
              .map((o: any) => ({
                strike: o.strike,
                bid: o.bid || 0,
                ask: o.ask || 0,
                last: o.last || 0,
                volume: o.volume || 0,
                oi: o.open_interest || 0,
                iv: o.greeks?.mid_iv ? o.greeks.mid_iv * 100 : 0,
                delta: o.greeks?.delta || 0,
                gamma: o.greeks?.gamma || 0,
                theta: o.greeks?.theta || 0,
                vega: o.greeks?.vega || 0,
              }))
              .sort((a: any, b: any) => a.strike - b.strike)

            const puts = options
              .filter((o: any) => o.option_type === 'put')
              .map((o: any) => ({
                strike: o.strike,
                bid: o.bid || 0,
                ask: o.ask || 0,
                last: o.last || 0,
                volume: o.volume || 0,
                oi: o.open_interest || 0,
                iv: o.greeks?.mid_iv ? o.greeks.mid_iv * 100 : 0,
                delta: o.greeks?.delta || 0,
                gamma: o.greeks?.gamma || 0,
                theta: o.greeks?.theta || 0,
                vega: o.greeks?.vega || 0,
              }))
              .sort((a: any, b: any) => a.strike - b.strike)

            chain = { calls, puts }
            source = 'tradier'
          }
        }
      }
    } catch (err) {
      console.error('[Tradier] Options chain error:', err)
    }
  }

  // Generate mock expirations if needed
  if (expirations.length === 0) {
    const today = new Date()
    expirations = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + (i + 1) * 7)
      return d.toISOString().split('T')[0]
    })
  }

  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    underlyingPrice,
    expirations,
    selectedExpiration: expiration || expirations[0],
    chain,
    source,
    timestamp: Date.now(),
  })
}
