import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'POLYGON_API_KEY is not configured' }, { status: 500 })
    }

    // Snapshot for prev open/close + day range
    const snapshotUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${apiKey}`
    // Ticker details v3 for 52-week high/low
    const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${apiKey}`

    const [snapshotRes, detailsRes] = await Promise.all([
      fetch(snapshotUrl, { next: { revalidate: 15 } }),
      fetch(detailsUrl, { next: { revalidate: 3600 } }),
    ])

    const snapshotData = snapshotRes.ok ? await snapshotRes.json() : null
    const detailsData = detailsRes.ok ? await detailsRes.json() : null

    const t = snapshotData?.ticker
    const d = detailsData?.results

    return NextResponse.json({
      ticker,
      prevOpen:  t?.prevDay?.o  ?? null,
      prevClose: t?.prevDay?.c  ?? null,
      week52High: d?.week_52_high ?? null,
      week52Low:  d?.week_52_low  ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch details' },
      { status: 500 }
    )
  }
}
