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
  const res = await fetch(`${UW_BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`UW ${path} -> ${res.status}`)
  }
  return res.json()
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
  const slots: Record<string, () => Promise<any>> = {
    info:                  () => uw(`stock/${ticker}/info`, apiKey),
    state:                 () => uw(`stock/${ticker}/stock-state`, apiKey),
    greekExposure:         () => uw(`stock/${ticker}/greek-exposure`, apiKey),
    greekExposureByStrike: () => uw(`stock/${ticker}/greek-exposure/strike`, apiKey),
    spotExposures:         () => uw(`stock/${ticker}/spot-exposures`, apiKey),
    ivRank:                () => uw(`stock/${ticker}/iv-rank`, apiKey),
    ivTermStructure:       () => uw(`stock/${ticker}/iv-term-structure`, apiKey),
    maxPain:               () => uw(`stock/${ticker}/max-pain`, apiKey),
    optionsVolume:         () => uw(`stock/${ticker}/options-volume`, apiKey),
    oiChange:              () => uw(`stock/${ticker}/oi-change`, apiKey),
    flowAlerts:            () => uw(`stock/${ticker}/flow-alerts`, apiKey),
    darkPoolRaw:           () => uw(`darkpool/recent?limit=500`, apiKey),
    insider:               () => uw(`insider/${ticker}`, apiKey),
    congress:              () => uw(`congress/${ticker}`, apiKey),
  }

  const keys = Object.keys(slots)
  const results = await Promise.allSettled(keys.map(k => slots[k]()))

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
