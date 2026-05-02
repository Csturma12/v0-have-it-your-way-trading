import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Commodity ETF universe — proxies for spot commodity prices.
// Add/remove here to change the sidebar list everywhere.
const COMMODITIES = [
  { ticker: 'USO',  name: 'Crude Oil (WTI)' },
  { ticker: 'BNO',  name: 'Brent Crude' },
  { ticker: 'UNG',  name: 'Natural Gas' },
  { ticker: 'GLD',  name: 'Gold' },
  { ticker: 'SLV',  name: 'Silver' },
  { ticker: 'CPER', name: 'Copper' },
  { ticker: 'DBA',  name: 'Agriculture' },
  { ticker: 'PPLT', name: 'Platinum' },
  { ticker: 'PALL', name: 'Palladium' },
] as const

interface PolygonBar { t: number; c: number }
interface CommodityRow {
  ticker: string
  name: string
  price: number
  change: number
  changePct: number
  sparkline: number[] // closing prices, oldest -> newest, length ~22 (one trading month)
}

// Server-side cache so all browsers share a single set of polygon calls.
let cache: { rows: CommodityRow[]; ts: number } | null = null
const CACHE_TTL_MS = 60_000 // 60s — commodity ETFs don't move fast

export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'POLYGON_API_KEY not configured' }, { status: 500 })
  }

  // Serve fresh cache
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ commodities: cache.rows, cached: true, updatedAt: new Date(cache.ts).toISOString() })
  }

  try {
    // 1) One snapshot call for all tickers (prices + day change)
    const snapUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${COMMODITIES.map(c => c.ticker).join(',')}&apiKey=${apiKey}`
    const snapRes = await fetch(snapUrl, { next: { revalidate: 60 } })
    const snapData = await snapRes.json()
    const snapMap = new Map<string, { price: number; change: number; changePct: number }>()

    for (const t of (snapData.tickers ?? [])) {
      const day = t.day ?? {}
      const prevDay = t.prevDay ?? {}
      const lastTrade = t.lastTrade ?? {}
      const todayClose = day.c ?? lastTrade.p ?? 0
      const prevClose = prevDay.c ?? 0
      const change = todayClose - prevClose
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0
      snapMap.set(t.ticker, { price: todayClose, change, changePct })
    }

    // 2) Parallel daily-bar calls for sparklines (last ~30 days)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 35)
    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]

    const sparkPromises = COMMODITIES.map(async ({ ticker }) => {
      try {
        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=50&apiKey=${apiKey}`
        const r = await fetch(url, { next: { revalidate: 300 } })
        if (!r.ok) return [ticker, [] as number[]] as const
        const j = await r.json() as { results?: PolygonBar[] }
        const closes = (j.results ?? []).map(b => b.c)
        return [ticker, closes] as const
      } catch {
        return [ticker, [] as number[]] as const
      }
    })

    const sparkResults = await Promise.all(sparkPromises)
    const sparkMap = new Map(sparkResults)

    // 3) Combine into rows
    const rows: CommodityRow[] = COMMODITIES.map(({ ticker, name }) => {
      const snap = snapMap.get(ticker)
      const sparkline = sparkMap.get(ticker) ?? []
      // If snapshot didn't return this ticker (off-hours sometimes), fall back to last 2 sparkline points
      const fallbackPrice = sparkline[sparkline.length - 1] ?? 0
      const fallbackPrev = sparkline[sparkline.length - 2] ?? fallbackPrice
      const fallbackChange = fallbackPrice - fallbackPrev
      const fallbackPct = fallbackPrev > 0 ? (fallbackChange / fallbackPrev) * 100 : 0

      return {
        ticker,
        name,
        price: snap?.price ?? fallbackPrice,
        change: snap?.change ?? fallbackChange,
        changePct: snap?.changePct ?? fallbackPct,
        sparkline,
      }
    })

    cache = { rows, ts: Date.now() }
    return NextResponse.json({ commodities: rows, cached: false, updatedAt: new Date().toISOString() })
  } catch (err) {
    // Serve stale cache on error
    if (cache) {
      return NextResponse.json({
        commodities: cache.rows,
        cached: true,
        stale: true,
        error: 'Using cached data due to API error',
      })
    }
    console.error('[api/commodities] error:', err)
    return NextResponse.json({ error: 'Failed to fetch commodities' }, { status: 500 })
  }
}
