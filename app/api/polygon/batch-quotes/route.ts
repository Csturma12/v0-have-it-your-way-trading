import { NextRequest, NextResponse } from 'next/server'

/**
 * Batch quotes endpoint — Polygon primary (annual plan), Tradier fallback.
 *
 * Polygon annual plan has generous limits and real-time data with extended hours.
 * Tradier is fallback for redundancy.
 */

const TRADIER_KEY = process.env.TRADIER_API_KEY
const POLYGON_KEY = process.env.POLYGON_API_KEY
const TRADIER_BASE = process.env.TRADIER_BASE_URL || 'https://api.tradier.com'

// In-memory cache (15 second TTL)
const cache = new Map<string, { data: Record<string, unknown>; timestamp: number }>()
const CACHE_TTL = 15 * 1000

function getCacheKey(tickers: string[]): string {
  return tickers.sort().join(',')
}

function detectSession(): 'pre' | 'post' | 'regular' | 'closed' {
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = nowET.getHours()
  const minute = nowET.getMinutes()
  const day = nowET.getDay()
  const timeDecimal = hour + minute / 60

  if (day === 0 || day === 6) return 'closed'
  if (timeDecimal >= 4 && timeDecimal < 9.5) return 'pre'
  if (timeDecimal >= 16 && timeDecimal < 20) return 'post'
  if (timeDecimal >= 9.5 && timeDecimal < 16) return 'regular'
  return 'closed'
}

interface QuoteData {
  price: number
  change: number
  changePct: number
  open: number
  high: number
  low: number
  volume: number
  prevClose: number
  bid?: number
  ask?: number
  extendedPrice?: number
  extendedChangePct?: number
  session: 'pre' | 'post' | 'regular' | 'closed'
  source: 'tradier' | 'polygon'
}

// --------------- TRADIER ---------------
async function fetchTradierBatch(tickers: string[]): Promise<Record<string, QuoteData> | null> {
  if (!TRADIER_KEY || tickers.length === 0) return null

  try {
    const url = `${TRADIER_BASE}/v1/markets/quotes?symbols=${tickers.join(',')}&greeks=false`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TRADIER_KEY}`,
        Accept: 'application/json',
      },
      next: { revalidate: 5 },
    })
    if (!res.ok) return null

    const data = await res.json()
    const session = detectSession()
    const quotes: Record<string, QuoteData> = {}

    // Tradier returns single object if 1 symbol, array if multiple
    const rawQuotes = Array.isArray(data.quotes?.quote)
      ? data.quotes.quote
      : data.quotes?.quote
        ? [data.quotes.quote]
        : []

    for (const q of rawQuotes) {
      if (!q.symbol) continue
      const prevClose = q.prevclose ?? q.close ?? 0
      const price = q.last ?? 0
      const change = q.change ?? (price - prevClose)
      const changePct = q.change_percentage ?? (prevClose ? (change / prevClose) * 100 : 0)

      quotes[q.symbol] = {
        price,
        change,
        changePct,
        open: q.open ?? 0,
        high: q.high ?? 0,
        low: q.low ?? 0,
        volume: q.volume ?? 0,
        prevClose,
        bid: q.bid ?? undefined,
        ask: q.ask ?? undefined,
        session,
        source: 'tradier',
      }
    }

    return Object.keys(quotes).length > 0 ? quotes : null
  } catch (e) {
    console.error('[v0] Tradier batch-quotes error:', e)
    return null
  }
}

// --------------- POLYGON ---------------
async function fetchPolygonBatch(tickers: string[]): Promise<Record<string, QuoteData> | null> {
  if (!POLYGON_KEY || tickers.length === 0) return null

  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(',')}&apiKey=${POLYGON_KEY}`
    const res = await fetch(url, { next: { revalidate: 15 } })
    if (!res.ok) return null

    const data = await res.json()
    const session = detectSession()
    const quotes: Record<string, QuoteData> = {}

    for (const ticker of (data.tickers ?? [])) {
      const day = ticker.day ?? {}
      const prevDay = ticker.prevDay ?? {}
      const lastTrade = ticker.lastTrade ?? {}
      const price = day.c ?? lastTrade.p ?? 0
      const prevClose = prevDay.c ?? 0
      const change = price - prevClose
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0

      let extendedPrice: number | undefined
      let extendedChangePct: number | undefined

      if (ticker.preMarket?.o && session === 'pre') {
        extendedPrice = ticker.preMarket.o
        extendedChangePct = prevClose > 0 && extendedPrice ? ((extendedPrice - prevClose) / prevClose) * 100 : 0
      } else if (ticker.afterHours?.o && session === 'post') {
        extendedPrice = ticker.afterHours.o
        extendedChangePct = prevClose > 0 && extendedPrice ? ((extendedPrice - prevClose) / prevClose) * 100 : 0
      }

      quotes[ticker.ticker] = {
        price,
        change,
        changePct,
        open: day.o ?? 0,
        high: day.h ?? 0,
        low: day.l ?? 0,
        volume: day.v ?? 0,
        prevClose,
        extendedPrice,
        extendedChangePct,
        session,
        source: 'polygon',
      }
    }

    return Object.keys(quotes).length > 0 ? quotes : null
  } catch (e) {
    console.error('[v0] Polygon batch-quotes error:', e)
    return null
  }
}

// --------------- MAIN HANDLER ---------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tickersParam = searchParams.get('tickers')

  if (!tickersParam) {
    return NextResponse.json({ error: 'tickers param required' }, { status: 400 })
  }

  const tickers = tickersParam
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 100) // Tradier supports up to 100

  // Check cache first
  const cacheKey = getCacheKey(tickers)
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
      updatedAt: new Date(cached.timestamp).toISOString(),
    })
  }

  // Try Polygon first (annual plan - generous limits, real-time with extended hours)
  let quotes = await fetchPolygonBatch(tickers)
  let source: 'tradier' | 'polygon' | 'none' = quotes ? 'polygon' : 'none'

  // Fallback to Tradier if Polygon unavailable
  if (!quotes) {
    quotes = await fetchTradierBatch(tickers)
    source = quotes ? 'tradier' : 'none'
  }

  if (!quotes) {
    // Return stale cache on total failure
    if (cached) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        stale: true,
        error: 'Using cached data - no live data available',
      })
    }
    return NextResponse.json({ error: 'No market data sources available' }, { status: 503 })
  }

  const session = detectSession()
  const response = {
    quotes,
    session,
    source,
    updatedAt: new Date().toISOString(),
  }

  // Store in cache
  cache.set(cacheKey, { data: response, timestamp: Date.now() })

  // Clean up old cache entries
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }

  return NextResponse.json(response)
}
