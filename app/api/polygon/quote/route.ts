import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'POLYGON_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // Previous close + current snapshot
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${apiKey}`

    const res = await fetch(url, { next: { revalidate: 15 } })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Polygon API error: ${res.status}`, details: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    const t = data.ticker

    if (!t) {
      return NextResponse.json({ ticker, message: 'No quote available' })
    }

    const last = t.lastTrade?.p ?? t.day?.c ?? 0
    const prevClose = t.prevDay?.c ?? 0
    const change = last - prevClose
    const changePct = prevClose ? (change / prevClose) * 100 : 0

    return NextResponse.json({
      ticker,
      last,
      open: t.day?.o ?? 0,
      high: t.day?.h ?? 0,
      low: t.day?.l ?? 0,
      volume: t.day?.v ?? 0,
      prevClose,
      change,
      changePct,
      updated: t.updated,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch quote',
      },
      { status: 500 }
    )
  }
}
