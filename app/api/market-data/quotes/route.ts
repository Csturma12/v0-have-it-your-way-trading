import { NextRequest, NextResponse } from 'next/server'

/**
 * Unified quotes endpoint.
 *
 * Priority: Tradier (real-time) -> Polygon (free tier, 15-min delayed)
 *
 * Alpha Vantage removed — rate limits too tight, and we have better sources.
 * Finnhub quotes are also delayed on free tier, so skipped.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const source = searchParams.get('source') || 'tradier' // tradier (default), polygon

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  const ticker = symbol.toUpperCase()

  try {
    // Try Tradier first — real-time quotes, no delay
    if (source === 'tradier' || source === 'auto') {
      const tradierKey = process.env.TRADIER_API_KEY
      if (tradierKey) {
        try {
          // Use production endpoint for real-time. Sandbox is delayed.
          const baseUrl = process.env.TRADIER_ENV === 'sandbox'
            ? 'https://sandbox.tradier.com'
            : 'https://api.tradier.com'
          const res = await fetch(
            `${baseUrl}/v1/markets/quotes?symbols=${ticker}`,
            {
              headers: {
                Authorization: `Bearer ${tradierKey}`,
                Accept: 'application/json',
              },
              next: { revalidate: 5 }, // 5s cache for real-time
            }
          )
          if (res.ok) {
            const data = await res.json()
            const quote = data.quotes?.quote || {}
            return NextResponse.json({
              symbol: ticker,
              quote: {
                last: quote.last,
                open: quote.open,
                high: quote.high,
                low: quote.low,
                prevClose: quote.prevclose,
                change: quote.change,
                changePercent: quote.change_percentage,
                bid: quote.bid,
                bidSize: quote.bidsize,
                ask: quote.ask,
                askSize: quote.asksize,
                volume: quote.volume,
                avgVolume: quote.average_volume,
                week52High: quote.week_52_high,
                week52Low: quote.week_52_low,
              },
              source: 'tradier',
              realtime: true,
              timestamp: new Date().toISOString(),
            })
          }
        } catch (e) {
          console.error('[v0] Tradier quote error:', e)
        }
      }
    }

    // Fallback to Polygon (free tier = 15-min delay, but reliable)
    if (source === 'polygon' || source === 'auto') {
      const polygonKey = process.env.POLYGON_API_KEY
      if (polygonKey) {
        try {
          // Use previous close endpoint which is always available on free tier
          const res = await fetch(
            `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${polygonKey}`,
            { next: { revalidate: 60 } }
          )
          if (res.ok) {
            const data = await res.json()
            const bar = data.results?.[0] || {}
            return NextResponse.json({
              symbol: ticker,
              quote: {
                last: bar.c,
                open: bar.o,
                high: bar.h,
                low: bar.l,
                volume: bar.v,
                vwap: bar.vw,
              },
              source: 'polygon',
              realtime: false,
              delayed: true,
              timestamp: new Date().toISOString(),
            })
          }
        } catch (e) {
          console.error('[v0] Polygon quote error:', e)
        }
      }
    }

    return NextResponse.json(
      { error: 'No market data sources available. Check TRADIER_API_KEY or POLYGON_API_KEY.' },
      { status: 503 }
    )
  } catch (error) {
    console.error('[v0] Quotes endpoint error:', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}
