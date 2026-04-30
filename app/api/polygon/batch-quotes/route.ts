import { NextRequest, NextResponse } from 'next/server'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

// Rate limiting: max 5 requests per minute to Polygon
const rateLimitWindow = 60 * 1000 // 1 minute
const maxRequests = 5
const requestTimestamps: number[] = []

// In-memory cache for responses (15 second TTL)
const cache = new Map<string, { data: Record<string, unknown>; timestamp: number }>()
const CACHE_TTL = 15 * 1000 // 15 seconds

function isRateLimited(): boolean {
  const now = Date.now()
  // Remove timestamps older than the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - rateLimitWindow) {
    requestTimestamps.shift()
  }
  return requestTimestamps.length >= maxRequests
}

function recordRequest(): void {
  requestTimestamps.push(Date.now())
}

function getCacheKey(tickers: string[]): string {
  return tickers.sort().join(',')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tickersParam = searchParams.get('tickers')

  if (!tickersParam) {
    return NextResponse.json({ error: 'tickers param required' }, { status: 400 })
  }

  const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean).slice(0, 50)

  if (!POLYGON_API_KEY) {
    return NextResponse.json({ error: 'POLYGON_API_KEY not configured' }, { status: 500 })
  }

  // Check cache first
  const cacheKey = getCacheKey(tickers)
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ 
      ...cached.data, 
      cached: true, 
      updatedAt: new Date(cached.timestamp).toISOString() 
    })
  }

  // Check rate limit before making external request
  if (isRateLimited()) {
    // Return stale cache if available, otherwise return rate limit error
    if (cached) {
      return NextResponse.json({ 
        ...cached.data, 
        cached: true, 
        stale: true,
        updatedAt: new Date(cached.timestamp).toISOString() 
      })
    }
    return NextResponse.json({ 
      error: 'Rate limited - please wait before refreshing', 
      retryAfter: 60 
    }, { status: 429 })
  }

  recordRequest()

  try {
    // Use Polygon snapshot endpoint which returns all tickers in one call
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(',')}&apiKey=${POLYGON_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 15 } })

    if (!res.ok) {
      throw new Error(`Polygon API error: ${res.status}`)
    }

    const data = await res.json()

    // Build a map of symbol -> price data
    const quotes: Record<string, {
      price: number
      change: number
      changePct: number
      open: number
      high: number
      low: number
      volume: number
      prevClose: number
      extendedPrice?: number
      extendedChangePct?: number
      session: 'pre' | 'post' | 'regular' | 'closed'
    }> = {}

    const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const hour = nowET.getHours()
    const minute = nowET.getMinutes()
    const timeDecimal = hour + minute / 60

    // Determine current session
    const isPreMarket = timeDecimal >= 4 && timeDecimal < 9.5
    const isPostMarket = timeDecimal >= 16 && timeDecimal < 20
    const isRegular = timeDecimal >= 9.5 && timeDecimal < 16
    const session = isPreMarket ? 'pre' : isPostMarket ? 'post' : isRegular ? 'regular' : 'closed'

    for (const ticker of (data.tickers ?? [])) {
      const day = ticker.day ?? {}
      const prevDay = ticker.prevDay ?? {}
      const lastTrade = ticker.lastTrade ?? {}
      const lastQuote = ticker.lastQuote ?? {}
      const todayClose = ticker.day?.c ?? lastTrade.p ?? 0
      const prevClose = prevDay.c ?? 0
      const change = todayClose - prevClose
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0

      // Extended hours price from pre/post market data
      let extendedPrice: number | undefined
      let extendedChangePct: number | undefined

      if (ticker.preMarket?.o && isPreMarket) {
        extendedPrice = ticker.preMarket.o
        extendedChangePct = prevClose > 0 && extendedPrice !== undefined ? ((extendedPrice - prevClose) / prevClose) * 100 : 0
      } else if (ticker.afterHours?.o && isPostMarket) {
        extendedPrice = ticker.afterHours.o
        extendedChangePct = prevClose > 0 && extendedPrice !== undefined ? ((extendedPrice - prevClose) / prevClose) * 100 : 0
      }

      quotes[ticker.ticker] = {
        price: todayClose || lastTrade.p || lastQuote.P || 0,
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
      }
    }

    const response = { quotes, session, updatedAt: new Date().toISOString() }
    
    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() })
    
    // Clean up old cache entries (keep cache under 100 entries)
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
    
    return NextResponse.json(response)
  } catch (err) {
    console.error('[batch-quotes]', err)
    
    // Return stale cache on error if available
    if (cached) {
      return NextResponse.json({ 
        ...cached.data, 
        cached: true, 
        stale: true,
        error: 'Using cached data due to API error'
      })
    }
    
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}
