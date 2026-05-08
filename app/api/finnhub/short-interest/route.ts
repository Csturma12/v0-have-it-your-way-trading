import { NextRequest, NextResponse } from 'next/server'

/**
 * Finnhub Short Interest endpoint.
 * Used as fallback when UW is rate-limited or down.
 *
 * GET /api/finnhub/short-interest?symbol=AAPL
 */

const FINNHUB_KEY = process.env.FINNHUB_API_KEY

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  if (!FINNHUB_KEY) {
    return NextResponse.json(
      { error: 'FINNHUB_API_KEY not configured' },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/short-interest?symbol=${symbol}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: `Finnhub returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    
    // Finnhub returns array of short interest snapshots
    // Transform to match UW shape (most recent first)
    const latest = data.data?.[0]
    
    if (!latest) {
      return NextResponse.json({
        data: [],
        source: 'finnhub',
        timestamp: Date.now(),
      })
    }

    // Map Finnhub fields to UW-like shape
    const mapped = {
      short_interest: latest.shortInterest,
      short_percent_of_float: latest.shortPercentFloat, // Finnhub gives 0-100 scale
      days_to_cover: null, // Finnhub doesn't provide this
      date: latest.date,
      // Finnhub doesn't provide these fields, but we include nulls for compatibility
      fee: null,
      rebate: null,
      shares_available: null,
      shares_on_loan: null,
      utilization: null,
    }

    return NextResponse.json({
      data: [mapped],
      source: 'finnhub',
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error('[Finnhub Short Interest] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch short interest' },
      { status: 500 }
    )
  }
}
