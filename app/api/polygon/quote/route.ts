import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const POLYGON_KEY = process.env.POLYGON_API_KEY

interface QuoteShape {
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  prevClose: number
  volume: number
  avgVolume: number
  vwap: number | null
  marketCap: number
  sharesOut: number | null
  pe: number | null
  eps: number | null
  dividendYield: number | null
  beta: number | null
  high52w: number
  low52w: number
  // Extended hours
  extendedPrice: number | null
  extendedChange: number | null
  extendedChangePercent: number | null
  extendedSession: 'pre' | 'post' | 'closed' | null
  // Metadata
  exchange: string | null
  name: string | null
  sector: string | null
  industry: string | null
  updated: number | null
}

const EMPTY_QUOTE: QuoteShape = {
  price: 0, change: 0, changePercent: 0,
  open: 0, high: 0, low: 0, prevClose: 0,
  volume: 0, avgVolume: 0, vwap: null,
  marketCap: 0, sharesOut: null, pe: null, eps: null,
  dividendYield: null, beta: null,
  high52w: 0, low52w: 0,
  extendedPrice: null, extendedChange: null, extendedChangePercent: null, extendedSession: null,
  exchange: null, name: null, sector: null, industry: null, updated: null,
}

function detectExtSession(): 'pre' | 'post' | 'closed' | null {
  // ET market: 09:30-16:00 regular, 04:00-09:30 pre, 16:00-20:00 post
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const minutes = et.getHours() * 60 + et.getMinutes()
  const day = et.getDay() // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return 'closed'
  if (minutes >= 240 && minutes < 570) return 'pre'    // 04:00 - 09:30
  if (minutes >= 960 && minutes < 1200) return 'post'  // 16:00 - 20:00
  if (minutes >= 570 && minutes < 960) return null     // regular hours
  return 'closed'
}

async function fetchSnapshot(ticker: string) {
  if (!POLYGON_KEY) return null
  const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${POLYGON_KEY}`
  const res = await fetch(url, { next: { revalidate: 15 } })
  if (!res.ok) return null
  const data = await res.json()
  return data.ticker ?? null
}

async function fetchTickerDetails(ticker: string) {
  if (!POLYGON_KEY) return null
  const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_KEY}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  return data.results ?? null
}

// Pull 1-year of daily bars for 52w high/low and 30-day avg volume
async function fetch52wAndAvgVolume(ticker: string): Promise<{ high52w: number; low52w: number; avgVolume: number } | null> {
  if (!POLYGON_KEY) return null
  const today = new Date()
  const yearAgo = new Date()
  yearAgo.setFullYear(today.getFullYear() - 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fmt(yearAgo)}/${fmt(today)}?adjusted=true&sort=asc&limit=400&apiKey=${POLYGON_KEY}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  const bars: Array<{ h: number; l: number; v: number }> = data.results ?? []
  if (!bars.length) return null
  let high52w = 0, low52w = Infinity
  for (const b of bars) {
    if (b.h > high52w) high52w = b.h
    if (b.l < low52w) low52w = b.l
  }
  const last30 = bars.slice(-30)
  const avgVolume = last30.length
    ? Math.round(last30.reduce((s, b) => s + b.v, 0) / last30.length)
    : 0
  return { high52w, low52w: low52w === Infinity ? 0 : low52w, avgVolume }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

    if (!POLYGON_KEY) {
      return NextResponse.json(
        { error: 'POLYGON_API_KEY is not configured', ticker, source: 'none' },
        { status: 500 }
      )
    }

    const [t, details, range] = await Promise.all([
      fetchSnapshot(ticker),
      fetchTickerDetails(ticker),
      fetch52wAndAvgVolume(ticker),
    ])

    if (!t) {
      return NextResponse.json(
        { ticker, source: 'polygon', quote: null, message: 'No quote available' },
        { status: 200 }
      )
    }

    // Core fields
    const last = t.lastTrade?.p ?? t.day?.c ?? 0
    const prevClose = t.prevDay?.c ?? 0
    const change = last - prevClose
    const changePercent = prevClose ? (change / prevClose) * 100 : 0

    // Extended hours detection
    const session = detectExtSession()
    const minPrice = t.min?.c ?? null
    let extendedPrice: number | null = null
    let extendedChange: number | null = null
    let extendedChangePercent: number | null = null
    if (session && minPrice && Math.abs(minPrice - last) > 0.001) {
      extendedPrice = minPrice
      extendedChange = minPrice - last
      extendedChangePercent = last ? (extendedChange / last) * 100 : 0
    }

    // Reference details
    const sharesOut = details?.weighted_shares_outstanding ?? details?.share_class_shares_outstanding ?? null
    const marketCap = details?.market_cap ?? (sharesOut ? sharesOut * last : 0)

    const quote: QuoteShape = {
      price: last,
      change,
      changePercent,
      open: t.day?.o ?? 0,
      high: t.day?.h ?? 0,
      low: t.day?.l ?? 0,
      prevClose,
      volume: t.day?.v ?? 0,
      vwap: t.day?.vw ?? null,
      avgVolume: range?.avgVolume ?? 0,
      marketCap,
      sharesOut,
      pe: null,            // computed below if we have eps
      eps: details?.eps ?? null,
      dividendYield: null, // populated by fundamentals route
      beta: null,          // populated by fundamentals route
      high52w: range?.high52w ?? 0,
      low52w: range?.low52w ?? 0,
      extendedPrice,
      extendedChange,
      extendedChangePercent,
      extendedSession: session,
      exchange: details?.primary_exchange ?? null,
      name: details?.name ?? null,
      sector: details?.sic_description ?? null,
      industry: details?.sic_description ?? null,
      updated: t.updated ?? Date.now(),
    }

    if (quote.eps && last > 0) {
      quote.pe = last / quote.eps
    }

    // Return BOTH flat (back-compat) and nested `quote` shape
    return NextResponse.json({
      ticker,
      source: 'polygon',
      quote,
      // Back-compat flat fields used by older consumers
      last,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      volume: quote.volume,
      prevClose,
      change,
      changePct: changePercent,
      updated: quote.updated,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}
