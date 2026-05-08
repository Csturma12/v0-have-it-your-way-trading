import { NextRequest, NextResponse } from 'next/server'

/**
 * Finnhub Earnings Calendar endpoint.
 * Used as fallback when UW is rate-limited or down.
 *
 * GET /api/finnhub/earnings?from=2024-01-01&to=2024-01-07&symbol=AAPL
 */

const FINNHUB_KEY = process.env.FINNHUB_API_KEY

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const symbol = searchParams.get('symbol')?.toUpperCase()

  if (!FINNHUB_KEY) {
    return NextResponse.json(
      { error: 'FINNHUB_API_KEY not configured' },
      { status: 503 }
    )
  }

  // Build URL - symbol is optional (market-wide if omitted)
  let url = `https://finnhub.io/api/v1/calendar/earnings?token=${FINNHUB_KEY}`
  if (from) url += `&from=${from}`
  if (to) url += `&to=${to}`
  if (symbol) url += `&symbol=${symbol}`

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Finnhub returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({
      earningsCalendar: data.earningsCalendar || [],
      source: 'finnhub',
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error('[Finnhub Earnings] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar' },
      { status: 500 }
    )
  }
}
