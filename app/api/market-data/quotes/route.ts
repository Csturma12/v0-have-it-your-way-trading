import { NextRequest, NextResponse } from 'next/server'

// Unified quotes endpoint - tries multiple data sources (Polygon → Tradier → Alpha Vantage)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const source = searchParams.get('source') || 'polygon' // polygon, tradier, alpha_vantage

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  try {
    // Try Polygon first (most reliable)
    if (source === 'polygon' || !source) {
      const polygonKey = process.env.POLYGON_API_KEY
      if (polygonKey) {
        try {
          const res = await fetch(
            `https://api.polygon.io/v3/quotes/latest?ticker=${symbol.toUpperCase()}&apiKey=${polygonKey}`,
            { next: { revalidate: 30 } }
          )
          if (res.ok) {
            const data = await res.json()
            return NextResponse.json({
              symbol,
              quote: data.results,
              source: 'polygon',
              timestamp: new Date().toISOString(),
            })
          }
        } catch (e) {
          console.error('[v0] Polygon quote error:', e)
        }
      }
    }

    // Fallback to Tradier
    if (source === 'tradier' || (source !== 'alpha_vantage' && !source)) {
      const tradierKey = process.env.TRADIER_API_KEY
      if (tradierKey) {
        try {
          const res = await fetch(
            `https://sandbox.tradier.com/v1/markets/quotes?symbols=${symbol.toUpperCase()}`,
            {
              headers: {
                Authorization: `Bearer ${tradierKey}`,
                Accept: 'application/json',
              },
              next: { revalidate: 30 },
            }
          )
          if (res.ok) {
            const data = await res.json()
            const quote = data.quotes?.quote || {}
            return NextResponse.json({
              symbol,
              quote: {
                last: quote.last,
                change: quote.change,
                changePercent: quote.change_percent,
                bid: quote.bid,
                ask: quote.ask,
                volume: quote.volume,
                timestamp: quote.trade_date,
              },
              source: 'tradier',
              timestamp: new Date().toISOString(),
            })
          }
        } catch (e) {
          console.error('[v0] Tradier quote error:', e)
        }
      }
    }

    // Last resort: Alpha Vantage (5 req/min limit)
    if (source === 'alpha_vantage' || !source) {
      const avKey = process.env.ALPHA_VANTAGE_API_KEY
      if (avKey) {
        try {
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol.toUpperCase()}&apikey=${avKey}`,
            { next: { revalidate: 60 } }
          )
          if (res.ok) {
            const data = await res.json()
            const quote = data['Global Quote'] || {}
            return NextResponse.json({
              symbol,
              quote: {
                last: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: parseFloat(quote['10. change percent']),
                volume: parseInt(quote['06. volume']),
                timestamp: quote['07. latest trading day'],
              },
              source: 'alpha_vantage',
              timestamp: new Date().toISOString(),
            })
          }
        } catch (e) {
          console.error('[v0] Alpha Vantage quote error:', e)
        }
      }
    }

    return NextResponse.json(
      { error: 'No market data sources available' },
      { status: 503 }
    )
  } catch (error) {
    console.error('[v0] Quotes endpoint error:', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}
