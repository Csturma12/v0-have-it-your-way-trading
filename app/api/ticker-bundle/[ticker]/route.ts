import { NextRequest, NextResponse } from 'next/server'

/**
 * Ticker Bundle — fans out Unusual Whales endpoints in parallel
 * for one ticker and returns a single JSON shape.
 *
 * RATE LIMIT OPTIMIZATION:
 * - Server-side cache with 30s TTL for fast-changing data
 * - 5-minute TTL for slow-changing data (insider, congress)
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CacheEntry {
  data: BundleResult
  timestamp: number
  fastDataTimestamp: number
}

const bundleCache = new Map<string, CacheEntry>()
const FAST_TTL = 30_000
const SLOW_TTL = 5 * 60_000

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
  const delays = [0, 250, 600]
  let lastStatus = 0
  for (const delay of delays) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay))
    const res = await fetch(`${UW_BASE}/${path}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.ok) return res.json()
    lastStatus = res.status
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
    return NextResponse.json({ error: 'UNUSUAL_WHALES_API_KEY not set' }, { status: 500 })
  }

  const now = Date.now()
  const cached = bundleCache.get(ticker)
  
  if (cached && (now - cached.fastDataTimestamp) < FAST_TTL) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
      cacheAge: Math.round((now - cached.fastDataTimestamp) / 1000),
    })
  }

  const needSlowData = !cached || (now - cached.timestamp) > SLOW_TTL

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
  
  const slowSlots: Record<string, () => Promise<any>> = {
    info:            () => uw(`stock/${ticker}/info`, apiKey),
    ivTermStructure: () => uw(`stock/${ticker}/volatility/term-structure`, apiKey),
    volatilityStats: () => uw(`stock/${ticker}/volatility/stats`, apiKey),
    realizedVol:     () => uw(`stock/${ticker}/volatility/realized`, apiKey),
    oiChange:        () => uw(`stock/${ticker}/oi-change`, apiKey),
    insider:         () => uw(`insider/recent?ticker_symbol=${ticker}&limit=20`, apiKey),
    congress:        () => uw(`congress/recent-trades?ticker=${ticker}&limit=20`, apiKey),
  }

  const fastKeys = Object.keys(fastSlots)
  const fastResults = await Promise.allSettled(fastKeys.map(k => fastSlots[k]()))
  
  let slowResults: PromiseSettledResult<any>[] = []
  let slowKeys: string[] = []
  if (needSlowData) {
    await new Promise(r => setTimeout(r, 100))
    slowKeys = Object.keys(slowSlots)
    slowResults = await Promise.allSettled(slowKeys.map(k => slowSlots[k]()))
  }

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

  for (let i = 0; i < fastKeys.length; i++) {
    processSlotResult(fastKeys[i], fastResults[i], out, ticker)
  }
  for (let i = 0; i < slowKeys.length; i++) {
    processSlotResult(slowKeys[i], slowResults[i], out, ticker)
  }

  bundleCache.set(ticker, {
    data: out,
    timestamp: needSlowData ? now : (cached?.timestamp ?? now),
    fastDataTimestamp: now,
  })

  if (bundleCache.size > 50) {
    const oldestKey = bundleCache.keys().next().value
    if (oldestKey) bundleCache.delete(oldestKey)
  }

  return NextResponse.json(out)
}

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
    const all = data?.data || data?.trades || []
    const tickerTrades = all.filter((t: any) => (t.ticker || '').toUpperCase() === ticker)
    let buyVol = 0, sellVol = 0, totalVol = 0
    for (const t of tickerTrades) {
      const size = Number(t.size) || 0
      const price = Number(t.price) || 0
      const ask = Number(t.nbbo_ask) || 0
      const bid = Number(t.nbbo_bid) || 0
      totalVol += size
      if (ask > 0 && price >= ask) buyVol += size
      else if (bid > 0 && price <= bid) sellVol += size
    }
    out.darkPool = { trades: tickerTrades.slice(0, 100), totalVol, buyVol, sellVol, count: tickerTrades.length }
  } else {
    ;(out as any)[key] = data?.data ?? data
  }
}
