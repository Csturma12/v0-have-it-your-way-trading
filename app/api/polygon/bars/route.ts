import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface PolygonBar {
  t: number // timestamp ms
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface PolygonResponse {
  ticker: string
  status: string
  results?: PolygonBar[]
  resultsCount?: number
  error?: string
  message?: string
}

const RANGE_CONFIG: Record<
  string,
  { multiplier: number; timespan: string; daysBack: number }
> = {
  '5m':  { multiplier: 5,  timespan: 'minute', daysBack: 3 },
  '15m': { multiplier: 15, timespan: 'minute', daysBack: 5 },
  '1H':  { multiplier: 1,  timespan: 'hour',   daysBack: 14 },
  '4H':  { multiplier: 4,  timespan: 'hour',   daysBack: 60 },
  '1D':  { multiplier: 5,  timespan: 'minute', daysBack: 3 },  // 3 days to cover weekends
  '5D':  { multiplier: 15, timespan: 'minute', daysBack: 7 },  // 7 days to cover weekends
  '1M':  { multiplier: 1,  timespan: 'hour',   daysBack: 35 },
  '3M':  { multiplier: 1,  timespan: 'day',    daysBack: 95 },
  '6M':  { multiplier: 1,  timespan: 'day',    daysBack: 185 },
  '1Y':  { multiplier: 1,  timespan: 'day',    daysBack: 370 },
  '5Y':  { multiplier: 1,  timespan: 'week',   daysBack: 365 * 5 },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()
    const range = searchParams.get('range') || '3M'

    const apiKey = process.env.POLYGON_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'POLYGON_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const config = RANGE_CONFIG[range] || RANGE_CONFIG['3M']
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - config.daysBack)

    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]

    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${config.multiplier}/${config.timespan}/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`

    const res = await fetch(url, {
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      const text = await res.text()
      console.log('[v0] Polygon error:', res.status, text)
      return NextResponse.json(
        { error: `Polygon API error: ${res.status}`, details: text },
        { status: res.status }
      )
    }

    const data: PolygonResponse = await res.json()
    
    console.log('[v0] Polygon bars response:', ticker, range, 'resultsCount:', data.resultsCount, 'status:', data.status)

    if (!data.results || data.results.length === 0) {
      console.log('[v0] No bars returned, message:', data.message)
      return NextResponse.json({
        ticker,
        range,
        bars: [],
        message: data.message || 'No data available',
      })
    }

    // Format for lightweight-charts: time in seconds (UTC) for intraday, YYYY-MM-DD for daily/weekly
    const isIntraday = config.timespan === 'minute' || config.timespan === 'hour'
    const bars = data.results.map((bar) => ({
      time: isIntraday
        ? Math.floor(bar.t / 1000)
        : new Date(bar.t).toISOString().split('T')[0],
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }))

    return NextResponse.json({
      ticker,
      range,
      bars,
      count: bars.length,
    })
  } catch (error) {
    console.log('[v0] Polygon route error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch bars',
      },
      { status: 500 }
    )
  }
}
