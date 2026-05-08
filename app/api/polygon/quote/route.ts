import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Unified quote endpoint — Tradier primary, Polygon fallback.
 *
 * Priority:
 * 1. Tradier (real-time, no delay)
 * 2. Polygon (15-min delayed on free tier, but has extended-hours + fundamentals)
 *
 * Returns a normalized QuoteShape regardless of source.
 */

const TRADIER_KEY = process.env.TRADIER_API_KEY
const POLYGON_KEY = process.env.POLYGON_API_KEY

// Use production endpoint if available, sandbox for testing
const TRADIER_BASE = process.env.TRADIER_BASE_URL || 'https://api.tradier.com'

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
  bid: number | null
  ask: number | null
  bidSize: number | null
  askSize: number | null
  extendedPrice: number | null
  extendedChange: number | null
  extendedChangePercent: number | null
  extendedSession: 'pre' | 'post' | 'closed' | null
  exchange: string | null
  name: string | null
  sector: string | null
  industry: string | null
  updated: number | null
  source: 'tradier' | 'polygon' | 'none'
}

function detectExtSession(): 'pre' | 'post' | 'closed' | null {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const minutes = et.getHours() * 60 + et.getMinutes()
  const day = et.getDay()
  if (day === 0 || day === 6) return 'closed'
  if (minutes >= 240 && minutes < 570) return 'pre'
  if (minutes >= 960 && minutes < 1200) return 'post'
  if (minutes >= 570 && minutes < 960) return null
  return 'closed'
}

// --------------- TRADIER ---------------
async function fetchTradierQuote(ticker: string): Promise<Partial<QuoteShape> | null> {
  if (!TRADIER_KEY) return null
  try {
    const url = `${TRADIER_BASE}/v1/markets/quotes?symbols=${ticker}&greeks=false`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TRADIER_KEY}`,
        Accept: 'application/json',
      },
      next: { revalidate: 5 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const q = data.quotes?.quote
    if (!q || q.symbol !== ticker) return null

    const last = q.last ?? 0
    const prevClose = q.prevclose ?? q.close ?? 0
    const change = q.change ?? (last - prevClose)
    const changePercent = q.change_percentage ?? (prevClose ? (change / prevClose) * 100 : 0)

    return {
      price: last,
      change,
      changePercent,
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      prevClose,
      volume: q.volume ?? 0,
      avgVolume: q.average_volume ?? 0,
      vwap: null, // Tradier doesn't provide VWAP in quote
      bid: q.bid ?? null,
      ask: q.ask ?? null,
      bidSize: q.bidsize ?? null,
      askSize: q.asksize ?? null,
      high52w: q.week_52_high ?? 0,
      low52w: q.week_52_low ?? 0,
      exchange: q.exch ?? null,
      name: q.description ?? null,
      updated: q.last_trade_time ? new Date(q.last_trade_time).getTime() : Date.now(),
      source: 'tradier' as const,
    }
  } catch (e) {
    console.error('[v0] Tradier quote error:', e)
    return null
  }
}

// --------------- POLYGON ---------------
async function fetchPolygonSnapshot(ticker: string) {
  if (!POLYGON_KEY) return null
  const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${POLYGON_KEY}`
  const res = await fetch(url, { next: { revalidate: 15 } })
  if (!res.ok) return null
  const data = await res.json()
  return data.ticker ?? null
}

async function fetchPolygonDetails(ticker: string) {
  if (!POLYGON_KEY) return null
  const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_KEY}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  return data.results ?? null
}

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

async function fetchPolygonQuote(ticker: string): Promise<Partial<QuoteShape> | null> {
  const [t, details, range] = await Promise.all([
    fetchPolygonSnapshot(ticker),
    fetchPolygonDetails(ticker),
    fetch52wAndAvgVolume(ticker),
  ])
  if (!t) return null

  const last = t.lastTrade?.p ?? t.day?.c ?? 0
  const prevClose = t.prevDay?.c ?? 0
  const change = last - prevClose
  const changePercent = prevClose ? (change / prevClose) * 100 : 0

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

  const sharesOut = details?.weighted_shares_outstanding ?? details?.share_class_shares_outstanding ?? null
  const marketCap = details?.market_cap ?? (sharesOut ? sharesOut * last : 0)

  return {
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
    pe: details?.eps && last > 0 ? last / details.eps : null,
    eps: details?.eps ?? null,
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
    source: 'polygon' as const,
  }
}

// --------------- MAIN HANDLER ---------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || searchParams.get('symbol') || 'AAPL').toUpperCase()

    // Try Tradier first (real-time)
    let quote = await fetchTradierQuote(ticker)

    // Fallback to Polygon if Tradier unavailable
    if (!quote) {
      quote = await fetchPolygonQuote(ticker)
    }

    if (!quote) {
      return NextResponse.json(
        { ticker, source: 'none', quote: null, message: 'No quote available from any source' },
        { status: 200 }
      )
    }

    // Fill in defaults for missing fields
    const fullQuote: QuoteShape = {
      price: quote.price ?? 0,
      change: quote.change ?? 0,
      changePercent: quote.changePercent ?? 0,
      open: quote.open ?? 0,
      high: quote.high ?? 0,
      low: quote.low ?? 0,
      prevClose: quote.prevClose ?? 0,
      volume: quote.volume ?? 0,
      avgVolume: quote.avgVolume ?? 0,
      vwap: quote.vwap ?? null,
      marketCap: quote.marketCap ?? 0,
      sharesOut: quote.sharesOut ?? null,
      pe: quote.pe ?? null,
      eps: quote.eps ?? null,
      dividendYield: quote.dividendYield ?? null,
      beta: quote.beta ?? null,
      high52w: quote.high52w ?? 0,
      low52w: quote.low52w ?? 0,
      bid: quote.bid ?? null,
      ask: quote.ask ?? null,
      bidSize: quote.bidSize ?? null,
      askSize: quote.askSize ?? null,
      extendedPrice: quote.extendedPrice ?? null,
      extendedChange: quote.extendedChange ?? null,
      extendedChangePercent: quote.extendedChangePercent ?? null,
      extendedSession: quote.extendedSession ?? null,
      exchange: quote.exchange ?? null,
      name: quote.name ?? null,
      sector: quote.sector ?? null,
      industry: quote.industry ?? null,
      updated: quote.updated ?? Date.now(),
      source: quote.source ?? 'none',
    }

    return NextResponse.json({
      ticker,
      source: fullQuote.source,
      quote: fullQuote,
      // Back-compat flat fields
      last: fullQuote.price,
      open: fullQuote.open,
      high: fullQuote.high,
      low: fullQuote.low,
      volume: fullQuote.volume,
      prevClose: fullQuote.prevClose,
      change: fullQuote.change,
      changePct: fullQuote.changePercent,
      updated: fullQuote.updated,
    })
  } catch (error) {
    console.error('[v0] Quote endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}
