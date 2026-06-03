import { NextRequest, NextResponse } from 'next/server'

/**
 * Ticker Bundle — fans out 10+ Unusual Whales endpoints in parallel
 * for one ticker, normalizes them, and returns a single JSON shape
 * that powers the Ticker Info / GEX / Options / Catalyst widgets
 * with one network request instead of ten.
 *
 * GET /api/ticker-bundle/NVDA
 *
 * RATE LIMIT OPTIMIZATION:
 * - Server-side cache with 30s TTL for fast-changing data
 * - 5-minute TTL for slow-changing data (insider, congress)
 * - Staggered waves to avoid UW bucket exhaustion
 * 
 * Response shape:
 *   {
 *     ticker, asOf, cached,
 *     info: {...}                     // company/ETF profile
 *     state: {...}                    // last price, day high/low, vol
 *     greekExposure: {...}            // total GEX/DEX/charm/vanna
 *     greekExposureByStrike: [...]    // strike-level GEX
 *     spotExposures: {...}            // spot-only exposures
 *     ivRank: {...}                   // IV rank + percentile
 *     ivTermStructure: [...]
 *     maxPain: {...}
 *     expectedMove: {...}             // derived from atm-chains
 *     optionsVolume: {...}
 *     oiChange: [...]
 *     flowAlerts: [...]               // top 20
 *     darkPool: { trades: [...], totalVol, buyVol, sellVol }
 *     insider: [...]
 *     congress: [...]
 *     errors: { <slot>: string }      // per-slot fetch failures
 *   }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ──────────────────────────────────────────────────────────────────────
// Server-side cache to reduce UW API calls
// ──────────────────────────────────────────────────────────────────────
interface CacheEntry {
  data: BundleResult
  timestamp: number
  fastDataTimestamp: number  // When fast-changing data was last fetched
}

const bundleCache = new Map<string, CacheEntry>()
const FAST_TTL = 30_000      // 30s for greeks, flow, dark pool
const SLOW_TTL = 5 * 60_000  // 5min for insider, congress, info

interface BundleResult {
  ticker: string
  asOf: string
  cached?: boolean
  cacheAge?: number
  info: any
  state: any
  greekExposure: any
  greekExposureByStrike: any
  spotExposures: any
  ivRank: any
  ivTermStructure: any
  volatilityStats: any
  realizedVol: any
  maxPain: any
  optionsVolume: any
  oiChange: any
  flowAlerts: any
  darkPool: {
    trades: any[]
    totalVol: number
    buyVol: number
    sellVol: number
    count: number
  }
  insider: any
  congress: any
  errors: Record<string, string>
}

const UW_BASE = 'https://api.unusualwhales.com/api'

async function uw(path: string, apiKey: string): Promise<any> {
  // Retry up to 2 times on 429 (rate limit). UW's bucket refills
  // ~1s, so an exponential backoff of 250ms then 600ms is enough
  // to recover the slowest fan-out slots without inflating p95.
  const delays = [0, 250, 600]
  let lastStatus = 0
  for (const delay of delays) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay))
    const res = await fetch(`${UW_BASE}/${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (res.ok) return res.json()
    lastStatus = res.status
    // Only retry on rate-limit; everything else (404/422/etc) is
    // a hard fail and shouldn't waste budget.
    if (res.status !== 429) break
  }
  throw new Error(`UW ${path} -> ${lastStatus}`)
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await ctx.params
  const ticker = rawTicker.toUpperCase()

  const apiKey = process.env.UNUSUAL_WHALES_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'UNUSUAL_WHALES_API_KEY not set' },
      { status: 500 },
    )
  }

  // ──────────────────────────────────────────────────────────────────
  // Check cache — return cached data if fresh enough OR if UW is rate limited
  // ──────────────────────────────────────────────────────────────────
  const now = Date.now()
  const cached = bundleCache.get(ticker)
  
  // If cache is fresh (within FAST_TTL), return it immediately
  if (cached && (now - cached.fastDataTimestamp) < FAST_TTL) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
      cacheAge: Math.round((now - cached.fastDataTimestamp) / 1000),
    })
  }

  // Determine what we need to fetch
  // - Fast data: Always fetch if cache is stale
  // - Slow data: Only fetch if >5 minutes old or not cached
  const needSlowData = !cached || (now - cached.timestamp) > SLOW_TTL

  // ──────────────────────────────────────────────────────────────────────
  // Define slots — split into fast-changing and slow-changing data
  // ──────────────────────────────────────────────────────────────────────
  
  // Fast-changing data (fetch every 30s): greeks, flow, dark pool, state
  const fastSlots: Record<string, () => Promise<any>> = {
    state:                 () => uw(`stock/${ticker}/stock-state`, apiKey),
    greekExposure:         () => uw(`stock/${ticker}/greek-exposure`, apiKey),
    greekExposureByStrike: () => uw(`stock/${ticker}/greek-exposure/strike`, apiKey),
    spotExposures:         () => uw(`stock/${ticker}/spot-exposures`, apiKey),
    ivRank:                () => uw(`stock/${ticker}/iv-rank`, apiKey),
    maxPain:               () => uw(`stock/${ticker}/max-pain`, apiKey),
    optionsVolume:         () => uw(`stock/${ticker}/options-volume`, apiKey),
    flowAlerts:            () => uw(`option-trades/flow-alerts?ticker_symbol=${ticker}&limit=20`, apiKey),
    darkPoolRaw:           () => uw(`darkpool/recent?limit=200`, apiKey),
  }
  
  // Slow-changing data (fetch every 5min): info, insider, congress, vol stats
  const slowSlots: Record<string, () => Promise<any>> = {
    info:                  () => uw(`stock/${ticker}/info`, apiKey),
    ivTermStructure:       () => uw(`stock/${ticker}/volatility/term-structure`, apiKey),
    volatilityStats:       () => uw(`stock/${ticker}/volatility/stats`, apiKey),
    realizedVol:           () => uw(`stock/${ticker}/volatility/realized`, apiKey),
    oiChange:              () => uw(`stock/${ticker}/oi-change`, apiKey),
    insider:               () => uw(`insider/recent?ticker_symbol=${ticker}&limit=20`, apiKey),
    congress:              () => uw(`congress/recent-trades?ticker=${ticker}&limit=20`, apiKey),
  }

  // ──────────────────────────────────────────────────────────────────────
  // Fetch data — only fetch what we need
  // If rate limited, return stale cache with warning instead of 500
  // ──────────────────────────────────────────────────────────────────────
  
  // Always fetch fast-changing data
  const fastKeys = Object.keys(fastSlots)
  const fastResults = await Promise.allSettled(fastKeys.map(k => fastSlots[k]()))
  
  // Check if we're being rate limited (majority of calls failing with 429)
  const rateLimitErrors = fastResults.filter(
    r => r.status === 'rejected' && String(r.reason).includes('429')
  ).length
  const isRateLimited = rateLimitErrors > fastKeys.length / 2
  
  // If rate limited and we have cached data, return it with a warning
  if (isRateLimited && cached) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
      rateLimited: true,
      cacheAge: Math.round((now - cached.fastDataTimestamp) / 1000),
      warning: 'UW rate limited - returning stale data',
    }, {
      headers: {
        'x-bundle-rate-limited': 'true',
        'x-bundle-cache-age': String(Math.round((now - cached.fastDataTimestamp) / 1000)),
      },
    })
  }
  
  // Only fetch slow-changing data if needed
  let slowResults: PromiseSettledResult<any>[] = []
  let slowKeys: string[] = []
  if (needSlowData && !isRateLimited) {
    // Small delay between waves to avoid rate limit
    await new Promise(r => setTimeout(r, 100))
    slowKeys = Object.keys(slowSlots)
    slowResults = await Promise.allSettled(slowKeys.map(k => slowSlots[k]()))
  }

  // Determine what we need to fetch
  // - Fast data: Always fetch if cache is stale
  // - Slow data: Only fetch if >5 minutes old or not cached
  const needSlowData = !cached || (now - cached.timestamp) > SLOW_TTL

  // ──────────────────────────────────────────────────────────────────
  // Define slots — split into fast-changing and slow-changing data
  // ──────────────────────────────────────────────────────────────────
  
  // Fast-changing data (fetch every 30s): greeks, flow, dark pool, state
  const fastSlots: Record<string, () => Promise<any>> = {
    state:                 () => uw(`stock/${ticker}/stock-state`, apiKey),
    greekExposure:         () => uw(`stock/${ticker}/greek-exposure`, apiKey),
    greekExposureByStrike: () => uw(`stock/${ticker}/greek-exposure/strike`, apiKey),
    spotExposures:         () => uw(`stock/${ticker}/spot-exposures`, apiKey),
    ivRank:                () => uw(`stock/${ticker}/iv-rank`, apiKey),
    maxPain:               () => uw(`stock/${ticker}/max-pain`, apiKey),
    optionsVolume:         () => uw(`stock/${ticker}/options-volume`, apiKey),
    flowAlerts:            () => uw(`option-trades/flow-alerts?ticker_symbol=${ticker}&limit=20`, apiKey),
    darkPoolRaw:           () => uw(`darkpool/recent?limit=200`, apiKey),
  }
  
  // Slow-changing data (fetch every 5min): info, insider, congress, vol stats
  const slowSlots: Record<string, () => Promise<any>> = {
    info:                  () => uw(`stock/${ticker}/info`, apiKey),
    ivTermStructure:       () => uw(`stock/${ticker}/volatility/term-structure`, apiKey),
    volatilityStats:       () => uw(`stock/${ticker}/volatility/stats`, apiKey),
    realizedVol:           () => uw(`stock/${ticker}/volatility/realized`, apiKey),
    oiChange:              () => uw(`stock/${ticker}/oi-change`, apiKey),
    insider:               () => uw(`insider/recent?ticker_symbol=${ticker}&limit=20`, apiKey),
    congress:              () => uw(`congress/recent-trades?ticker=${ticker}&limit=20`, apiKey),
  }

  // ──────────────────────────────────────────────────────────────────
  // Fetch data — only fetch what we need
  // ──────────────────────────────────────────────────────────────────
  
  // Always fetch fast-changing data
  const fastKeys = Object.keys(fastSlots)
  const fastResults = await Promise.allSettled(fastKeys.map(k => fastSlots[k]()))
  
  // Only fetch slow-changing data if needed
  let slowResults: PromiseSettledResult<any>[] = []
  let slowKeys: string[] = []
  if (needSlowData) {
    // Small delay between waves to avoid rate limit
    await new Promise(r => setTimeout(r, 100))
    slowKeys = Object.keys(slowSlots)
    slowResults = await Promise.allSettled(slowKeys.map(k => slowSlots[k]()))
  }

  // ──────────────────────────────────────────────────────────────────
  // Build result object
  // ──────────────────────────────────────────────────────────────────
  const out: BundleResult = {
    ticker,
    asOf: new Date().toISOString(),
    info: cached?.data.info ?? null,
    state: null,
    greekExposure: null,
    greekExposureByStrike: null,
    spotExposures: null,
    ivRank: cached?.data.ivRank ?? null,
    ivTermStructure: cached?.data.ivTermStructure ?? null,
    volatilityStats: cached?.data.volatilityStats ?? null,
    realizedVol: cached?.data.realizedVol ?? null,
    maxPain: null,
    optionsVolume: null,
    oiChange: cached?.data.oiChange ?? null,
    flowAlerts: null,
    darkPool: { trades: [], totalVol: 0, buyVol: 0, sellVol: 0, count: 0 },
    insider: cached?.data.insider ?? null,
    congress: cached?.data.congress ?? null,
    errors: {},
  }

  // Process fast results
  for (let i = 0; i < fastKeys.length; i++) {
    const key = fastKeys[i]
    const result = fastResults[i]
    processSlotResult(key, result, out, ticker)
  }

  // Process slow results (if fetched)
  for (let i = 0; i < slowKeys.length; i++) {
    const key = slowKeys[i]
    const result = slowResults[i]
    processSlotResult(key, result, out, ticker)
  }

  // ──────────────────────────────────────────────────────────────────
  // Update cache
  // ──────────────────────────────────────────────────────────────────
  bundleCache.set(ticker, {
    data: out,
    timestamp: needSlowData ? now : (cached?.timestamp ?? now),
    fastDataTimestamp: now,
  })

  // Clean up old cache entries (keep max 50 tickers)
  if (bundleCache.size > 50) {
    const oldestKey = bundleCache.keys().next().value
    if (oldestKey) bundleCache.delete(oldestKey)
  }

  return NextResponse.json(out, {
    headers: {
      'x-bundle-ticker': ticker,
      'x-bundle-fast-slots': String(fastKeys.length),
      'x-bundle-slow-slots': String(slowKeys.length),
      'x-bundle-errors': String(Object.keys(out.errors).length),
      'x-bundle-cache-hit': String(!needSlowData),
    },
  })
}

// ──────────────────────────────────────────────────────────────────────
// Helper to process a slot result
// ──────────────────────────────────────────────────────────────────────
function processSlotResult(
  key: string,
  result: PromiseSettledResult<any>,
  out: BundleResult,
  ticker: string
) {
  if (result.status === 'rejected') {
    out.errors[key] = String(result.reason?.message || result.reason)
    return
  }
  
  const data = result.value
  
  if (key === 'darkPoolRaw') {
    // Filter the global feed to this ticker only
    const all = data?.data || data?.trades || []
    const tickerTrades = all.filter(
      (t: any) => (t.ticker || '').toUpperCase() === ticker,
    )
    let buyVol = 0
    let sellVol = 0
    let totalVol = 0
    for (const t of tickerTrades) {
      const size = Number(t.size) || 0
      const price = Number(t.price) || 0
      const ask = Number(t.nbbo_ask) || 0
      const bid = Number(t.nbbo_bid) || 0
      totalVol += size
      if (ask > 0 && price >= ask) buyVol += size
      else if (bid > 0 && price <= bid) sellVol += size
    }
    out.darkPool = {
      trades: tickerTrades.slice(0, 100),
      totalVol,
      buyVol,
      sellVol,
      count: tickerTrades.length,
    }
  } else {
    // Most UW endpoints wrap data in { data: ... }
    ;(out as any)[key] = data?.data ?? data
  }
}
