import { NextRequest, NextResponse } from 'next/server'

/**
 * Ticker Bundle — fans out 10+ Unusual Whales endpoints in parallel
 * for one ticker, normalizes them, and returns a single JSON shape
 * that powers the Ticker Info / GEX / Options / Catalyst widgets
 * with one network request instead of ten.
 *
 * GET /api/ticker-bundle/NVDA
 *
 * Response shape:
 *   {
 *     ticker, asOf,
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
 *
 * All fetches go to /api/uw/... internally so they share the
 * universal proxy's TTL cache and rate-limit handling.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface BundleResult {
  ticker: string
  asOf: string
  info: any
  state: any
  greekExposure: any
  greekExposureByStrike: any
  spotExposures: any
  ivRank: any
  ivTermStructure: any
  // Volatility suite expansion (Phase 1):
  // volatilityStats   = /stock/{t}/volatility/stats — current iv/rv plus
  //                     52w high/low for both. Drives the IV/RV range
  //                     bars in IV Surface.
  // realizedVol       = /stock/{t}/volatility/realized — time series of
  //                     implied vs realized (RV shifted 30d back so you
  //                     can see whether IV historically over- or under-
  //                     priced the actual move). Drives the IV-vs-RV
  //                     sparkline in IV Surface.
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

  // Define all the slots and how to populate each. Settled
  // independently via Promise.allSettled so one failure doesn't
  // sink the whole bundle.
  // Endpoint paths confirmed against the live UW v2 API (Apr 2026).
  // Notes on the non-obvious ones:
  //   - state           => /stock/:t/stock-state (NOT "/state")
  //   - ivTermStructure => /stock/:t/volatility/term-structure
  //   - flowAlerts      => /option-trades/flow-alerts?ticker=
  //                        (the ticker-scoped /stock/:t/flow-alerts
  //                        is gated and returns 404 on most plans)
  //   - insider         => /insider/recent?ticker=  (no /insider/:t route)
  //   - congress        => /congress/recent-trades?ticker=
  //                        (no /congress/:t route, /congress/recent
  //                        is also 404)
  const slots: Record<string, () => Promise<any>> = {
    info:                  () => uw(`stock/${ticker}/info`, apiKey),
    state:                 () => uw(`stock/${ticker}/stock-state`, apiKey),
    greekExposure:         () => uw(`stock/${ticker}/greek-exposure`, apiKey),
    greekExposureByStrike: () => uw(`stock/${ticker}/greek-exposure/strike`, apiKey),
    spotExposures:         () => uw(`stock/${ticker}/spot-exposures`, apiKey),
    ivRank:                () => uw(`stock/${ticker}/iv-rank`, apiKey),
    ivTermStructure:       () => uw(`stock/${ticker}/volatility/term-structure`, apiKey),
    // Vol suite Phase 1 — see BundleResult interface for what each does.
    // 52w stats are reference-class (slow-moving), realized is also slow.
    // Both go in the second wave so wave 1 stays at 7 fast-changing
    // endpoints (info/state/greek/iv-rank/term-structure/maxPain).
    volatilityStats:       () => uw(`stock/${ticker}/volatility/stats`, apiKey),
    realizedVol:           () => uw(`stock/${ticker}/volatility/realized`, apiKey),
    maxPain:               () => uw(`stock/${ticker}/max-pain`, apiKey),
    optionsVolume:         () => uw(`stock/${ticker}/options-volume`, apiKey),
    oiChange:              () => uw(`stock/${ticker}/oi-change`, apiKey),
    flowAlerts:            () => uw(`option-trades/flow-alerts?ticker_symbol=${ticker}&limit=20`, apiKey),
    // UW caps darkpool/recent at limit<=200 (limit=500 returns 422)
    darkPoolRaw:           () => uw(`darkpool/recent?limit=200`, apiKey),
    insider:               () => uw(`insider/recent?ticker_symbol=${ticker}&limit=20`, apiKey),
    congress:              () => uw(`congress/recent-trades?ticker=${ticker}&limit=20`, apiKey),
  }

  // Fan out in two waves of ~7 to stay under UW's per-second rate
  // limit. With 14 concurrent calls some endpoints (spot-exposures,
  // term-structure) consistently get 429'd; splitting into two
  // sequential waves of 7 keeps us under the bucket.
  const keys = Object.keys(slots)
  const half = Math.ceil(keys.length / 2)
  const wave1Keys = keys.slice(0, half)
  const wave2Keys = keys.slice(half)
  const wave1 = await Promise.allSettled(wave1Keys.map(k => slots[k]()))
  // Tiny gap between waves so the rate-limit token bucket refills.
  await new Promise(r => setTimeout(r, 120))
  const wave2 = await Promise.allSettled(wave2Keys.map(k => slots[k]()))
  const results = [...wave1, ...wave2]

  const out: BundleResult = {
    ticker,
    asOf: new Date().toISOString(),
    info: null,
    state: null,
    greekExposure: null,
    greekExposureByStrike: null,
    spotExposures: null,
    ivRank: null,
    ivTermStructure: null,
    volatilityStats: null,
    realizedVol: null,
    maxPain: null,
    optionsVolume: null,
    oiChange: null,
    flowAlerts: null,
    darkPool: { trades: [], totalVol: 0, buyVol: 0, sellVol: 0, count: 0 },
    insider: null,
    congress: null,
    errors: {},
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const result = results[i]
    if (result.status === 'rejected') {
      out.errors[key] = String(result.reason?.message || result.reason)
      continue
    }
    const data = result.value
    switch (key) {
      case 'darkPoolRaw': {
        // Filter the global feed to this ticker only and derive
        // buy/sell from price vs NBBO (UW dark pool prints don't
        // include side directly).
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
        break
      }
      default: {
        // Most UW endpoints wrap data in { data: ... }
        ;(out as any)[key] = data?.data ?? data
      }
    }
  }

  return NextResponse.json(out, {
    headers: {
      'x-bundle-ticker': ticker,
      'x-bundle-slots': String(keys.length),
      'x-bundle-errors': String(Object.keys(out.errors).length),
    },
  })
}
