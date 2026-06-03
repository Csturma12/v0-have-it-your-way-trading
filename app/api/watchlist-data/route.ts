import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UW_BASE = 'https://api.unusualwhales.com/api'
const POLYGON_BASE = 'https://api.polygon.io'
const TRADIER_BASE = 'https://api.tradier.com'

/**
 * Batched watchlist enrichment endpoint.
 *
 * GET /api/watchlist-data?tickers=NVDA,TSLA,AMD
 *
 * OPTIMIZED: Uses Polygon (annual plan) for prices, Tradier fallback,
 * UW only for options-specific data (IV rank, call/put volume).
 *
 * Data sources:
 *   - Polygon: price, OHLC, volume, extended hours (annual plan - primary)
 *   - Tradier: fallback for quotes
 *   - UW: IV rank, options volume (cached 60s to avoid rate limits)
 */

// ──────────────────────────────────────────────────────────────────────
// Server-side cache for UW options data (60s TTL)
// ──────────────────────────────────────────────────────────────────────
interface CacheEntry {
  ivRank: number | null
  callVol: number | null
  putVol: number | null
  netPrem: number | null
  callPutRatio: number | null
  timestamp: number
}
const uwCache = new Map<string, CacheEntry>()
const UW_CACHE_TTL = 60_000 // 60 seconds

async function uw(path: string, apiKey: string): Promise<any> {
  for (const delay of [0, 250]) {
    if (delay) await new Promise(r => setTimeout(r, delay))
    const res = await fetch(`${UW_BASE}/${path}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.ok) return res.json()
    if (res.status !== 429) return null
  }
  return null
}

interface TickerRow {
  ticker: string
  // Quote (from Tradier)
  price: number | null
  open: number | null
  prevClose: number | null
  high: number | null
  low: number | null
  volume: number | null
  totalVolume: number | null
  marketTime: string | null
  tapeTime: string | null
  changePct: number | null
  // Options context (from UW, cached)
  ivRank: number | null
  callVol: number | null
  putVol: number | null
  netPrem: number | null
  callPutRatio: number | null
}

// Fetch quotes from Polygon (batch snapshot - annual plan)
async function fetchPolygonQuotes(tickers: string[], apiKey: string): Promise<Map<string, any>> {
  const quotes = new Map<string, any>()
  try {
    const url = `${POLYGON_BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(',')}&apiKey=${apiKey}`
    const res = await fetch(url, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      for (const t of (data.tickers ?? [])) {
        const day = t.day ?? {}
        const prevDay = t.prevDay ?? {}
        const price = day.c ?? t.lastTrade?.p ?? 0
        const prevClose = prevDay.c ?? 0
        const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0
        quotes.set(t.ticker, {
          last: price,
          open: day.o ?? 0,
          high: day.h ?? 0,
          low: day.l ?? 0,
          volume: day.v ?? 0,
          prevclose: prevClose,
          change_percentage: changePct,
        })
      }
    }
  } catch (e) {
    console.error('[watchlist-data] Polygon fetch error:', e)
  }
  return quotes
}

// Fetch quotes from Tradier (fallback)
async function fetchTradierQuotes(tickers: string[], apiKey: string): Promise<Map<string, any>> {
  const quotes = new Map<string, any>()
  try {
    const res = await fetch(`${TRADIER_BASE}/v1/markets/quotes?symbols=${tickers.join(',')}&greeks=false`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    })
    if (res.ok) {
      const data = await res.json()
      const list = data.quotes?.quote
      const arr = Array.isArray(list) ? list : list ? [list] : []
      for (const q of arr) {
        if (q?.symbol) quotes.set(q.symbol.toUpperCase(), q)
      }
    }
  } catch (e) {
    console.error('[watchlist-data] Tradier fetch error:', e)
  }
  return quotes
}

// Fetch UW options data with caching
async function getUWOptionsData(ticker: string, apiKey: string): Promise<CacheEntry> {
  const now = Date.now()
  const cached = uwCache.get(ticker)
  
  // Return cached data if fresh
  if (cached && (now - cached.timestamp) < UW_CACHE_TTL) {
    return cached
  }
  
  // Fetch fresh data from UW
  const [ivRankList, optsVolList] = await Promise.all([
    uw(`stock/${ticker}/iv-rank`, apiKey),
    uw(`stock/${ticker}/options-volume`, apiKey),
  ])
  
  const num = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  
  const iv = Array.isArray(ivRankList?.data) ? ivRankList.data[0] : null
  const ov = Array.isArray(optsVolList?.data) ? optsVolList.data[0] : null
  const callVol = num(ov?.call_volume)
  const putVol  = num(ov?.put_volume)
  const netCall = num(ov?.net_call_premium)
  const netPut  = num(ov?.net_put_premium)
  
  const entry: CacheEntry = {
    ivRank: num(iv?.iv_rank_1y),
    callVol,
    putVol,
    netPrem: (netCall !== null || netPut !== null) ? (netCall ?? 0) + (netPut ?? 0) : null,
    callPutRatio: (callVol !== null && putVol !== null && putVol > 0) ? callVol / putVol : null,
    timestamp: now,
  }
  
  uwCache.set(ticker, entry)
  
  // Clean up old cache entries (keep max 100)
  if (uwCache.size > 100) {
    const oldestKey = uwCache.keys().next().value
    if (oldestKey) uwCache.delete(oldestKey)
  }
  
  return entry
}

export async function GET(req: NextRequest) {
  const uwApiKey = process.env.UNUSUAL_WHALES_API_KEY
  const polygonApiKey = process.env.POLYGON_API_KEY
  const tradierApiKey = process.env.TRADIER_API_KEY
  
  if (!polygonApiKey && !tradierApiKey) {
    return NextResponse.json(
      { error: 'No quote API configured (POLYGON_API_KEY or TRADIER_API_KEY)' },
      { status: 500 },
    )
  }

  const url = new URL(req.url)
  const raw = url.searchParams.get('tickers') || ''
  const tickers = raw
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 25) // safety cap

  if (tickers.length === 0) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
  }

  // 1. Fetch quotes - Polygon primary (annual plan), Tradier fallback
  let quotes = new Map<string, any>()
  let quoteSource = 'none'
  
  if (polygonApiKey) {
    quotes = await fetchPolygonQuotes(tickers, polygonApiKey)
    if (quotes.size > 0) quoteSource = 'polygon'
  }
  
  // Fallback to Tradier if Polygon returned nothing
  if (quotes.size === 0 && tradierApiKey) {
    quotes = await fetchTradierQuotes(tickers, tradierApiKey)
    if (quotes.size > 0) quoteSource = 'tradier'
  }
  
  // 2. Fetch UW options data (with caching) - only if UW key is configured
  // Fan out in small waves to avoid rate limits
  const uwDataMap = new Map<string, CacheEntry>()
  if (uwApiKey) {
    const WAVE_SIZE = 3 // Smaller waves to be gentler on UW
    for (let i = 0; i < tickers.length; i += WAVE_SIZE) {
      const wave = tickers.slice(i, i + WAVE_SIZE)
      const results = await Promise.allSettled(
        wave.map(t => getUWOptionsData(t, uwApiKey))
      )
      for (let j = 0; j < wave.length; j++) {
        const r = results[j]
        if (r.status === 'fulfilled') {
          uwDataMap.set(wave[j], r.value)
        }
      }
      // Pause between waves
      if (i + WAVE_SIZE < tickers.length) {
        await new Promise(r => setTimeout(r, 200))
      }
    }
  }

  // 3. Combine data into response
  const rows: TickerRow[] = tickers.map(ticker => {
    const q = quotes.get(ticker)
    const uw = uwDataMap.get(ticker)
    
    const num = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    
    return {
      ticker,
      price: num(q?.last),
      open: num(q?.open),
      prevClose: num(q?.prevclose),
      high: num(q?.high),
      low: num(q?.low),
      volume: num(q?.volume),
      totalVolume: num(q?.volume),
      marketTime: null,
      tapeTime: null,
      changePct: num(q?.change_percentage),
      ivRank: uw?.ivRank ?? null,
      callVol: uw?.callVol ?? null,
      putVol: uw?.putVol ?? null,
      netPrem: uw?.netPrem ?? null,
      callPutRatio: uw?.callPutRatio ?? null,
    }
  })

  return NextResponse.json({
    tickers: rows,
    asOf: new Date().toISOString(),
    source: quoteSource + (uwApiKey ? '+uw' : ''),
  })
}
