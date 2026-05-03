import { NextRequest, NextResponse } from 'next/server'

/**
 * Universal Unusual Whales catch-all proxy.
 *
 * Frontend calls /api/uw/<any uw path>?<any query> and we forward to
 * https://api.unusualwhales.com/api/<that path>?<that query> with the
 * server-side API key attached. This unlocks all 41+ UW endpoints
 * confirmed working on the upgraded plan without needing a separate
 * Next route per endpoint.
 *
 * Examples:
 *   /api/uw/stock/NVDA/max-pain
 *   /api/uw/stock/NVDA/greek-exposure/strike?expiration=2025-06-20
 *   /api/uw/market/market-tide
 *   /api/uw/congress/recent
 *   /api/uw/insider/NVDA
 *   /api/uw/etfs/SPY/holdings
 *
 * GET only — UW is read-only on the data side.
 * Response is forwarded as-is so widgets see the exact UW shape.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UW_BASE = 'https://api.unusualwhales.com/api'

// Tiny in-memory TTL cache per process (per region). Helps tame
// rate limits when several widgets simultaneously hit /api/uw/<same>.
// Keyed by full URL including query.
type CacheEntry = { body: any; status: number; expires: number }
const cache = new Map<string, CacheEntry>()
const DEFAULT_TTL_MS = 5_000 // 5s — appropriate for "real-time-ish" widget polling

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  const subPath = path.join('/')

  const apiKey = process.env.UNUSUAL_WHALES_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'UNUSUAL_WHALES_API_KEY not set' },
      { status: 500 },
    )
  }

  // Forward all query params as-is.
  const search = req.nextUrl.searchParams.toString()
  const upstream = `${UW_BASE}/${subPath}${search ? `?${search}` : ''}`

  // Per-endpoint TTL — flow alerts and dark pool change fast, GEX
  // changes slowly, info/holdings barely change.
  const ttl = ttlFor(subPath)

  const cached = cache.get(upstream)
  const now = Date.now()
  if (cached && cached.expires > now) {
    return NextResponse.json(cached.body, {
      status: cached.status,
      headers: { 'x-uw-cache': 'HIT', 'x-uw-path': subPath },
    })
  }

  try {
    const res = await fetch(upstream, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      // Disable Next's data cache — we manage it ourselves above.
      cache: 'no-store',
    })

    const text = await res.text()
    let body: any
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = { raw: text }
    }

    if (res.ok) {
      cache.set(upstream, { body, status: res.status, expires: now + ttl })
    }

    return NextResponse.json(body, {
      status: res.status,
      headers: {
        'x-uw-cache': 'MISS',
        'x-uw-path': subPath,
        'x-uw-status': String(res.status),
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Upstream fetch failed',
        path: subPath,
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    )
  }
}

function ttlFor(path: string): number {
  // Hot/realtime data — short TTL
  if (
    path.includes('flow-alerts') ||
    path.includes('flow-recent') ||
    path.includes('option-trades') ||
    path.startsWith('darkpool/')
  )
    return 3_000

  // Slowly changing data — medium TTL
  if (
    path.includes('greek-exposure') ||
    path.includes('spot-exposures') ||
    path.includes('market-tide') ||
    path.includes('total-options-volume') ||
    path.includes('iv-rank') ||
    path.includes('iv-term-structure') ||
    // Vol suite Phase 1: stats and term structure update once or twice
    // a day, realized vol is computed off the daily close.
    path.includes('volatility/stats') ||
    path.includes('volatility/term-structure') ||
    path.includes('volatility/realized') ||
    // Phase 4: greek flow + sector/ETF tides + correlations.
    // These tick during market hours but not as fast as raw flow alerts;
    // 10s is a good balance vs API spend.
    path.includes('greek-flow') ||
    path.includes('sector-tide') ||
    path.includes('etf-tide') ||
    path.includes('market/correlations')
  )
    return 10_000

  // Reference data — long TTL
  // Earnings calendars don't tick intraday — the schedule is set the
  // night before and only changes when a company moves their report.
  // Short interest data updates daily after market close (FINRA cycle).
  if (
    path.endsWith('/info') ||
    path.includes('holdings') ||
    path.includes('weights') ||
    path.includes('exposure') ||
    path.includes('economic-calendar') ||
    path.includes('fda-calendar') ||
    path.includes('earnings/premarket') ||
    path.includes('earnings/afterhours') ||
    path.includes('earnings/calendar') ||
    path.includes('short-data') ||
    path.includes('short-interest-float') ||
    path.includes('volume-and-ratio') ||
    path.includes('short-screener') ||
    // Phase 5: company fundamentals + insider activity + expiry breakdown.
    // Financials are quarterly. Insider filings are daily SEC cadence.
    // Expiry breakdown updates EOD by UW.
    path.includes('financials') ||
    path.includes('insider-buy-sells') ||
    path.includes('expiry-breakdown')
  )
    return 5 * 60_000

  return DEFAULT_TTL_MS
}
