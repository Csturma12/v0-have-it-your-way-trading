import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UW_BASE = 'https://api.unusualwhales.com/api'

/**
 * Batched watchlist enrichment endpoint.
 *
 * GET /api/watchlist-data?tickers=NVDA,TSLA,AMD
 *
 * For each ticker we pull only the 3 endpoints actually rendered in the
 * watchlist row:
 *   - /stock/:t/stock-state    → OHLC + total volume incl. ext hours
 *                                + market_time ('regular' | 'pre' | 'post')
 *   - /stock/:t/iv-rank        → 1y IV rank for the IV badge
 *   - /stock/:t/options-volume → call/put volume + net premium for flow tilt
 *
 * To stay under UW's per-second rate limit when watchlists contain 5-10
 * tickers, we throttle the fan-out to 5 tickers in parallel at a time
 * and retry transient 429s once with a 250ms backoff. Per-ticker errors
 * are swallowed and surfaced as nulls so a single bad ticker can't
 * blank out the whole watchlist.
 */

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
  // Quote
  price: number | null
  open: number | null
  prevClose: number | null
  high: number | null
  low: number | null
  volume: number | null
  totalVolume: number | null   // includes pre/post
  marketTime: string | null    // 'regular' | 'pre' | 'post'
  tapeTime: string | null
  // Options context
  ivRank: number | null
  callVol: number | null
  putVol: number | null
  netPrem: number | null
  callPutRatio: number | null
}

async function enrichTicker(ticker: string, apiKey: string): Promise<TickerRow> {
  const [state, ivRankList, optsVolList] = await Promise.all([
    uw(`stock/${ticker}/stock-state`, apiKey),
    uw(`stock/${ticker}/iv-rank`, apiKey),
    uw(`stock/${ticker}/options-volume`, apiKey),
  ])

  // /stock/:t/stock-state returns { data: { close, open, high, low, volume,
  // total_volume, market_time, tape_time, prev_close } } in newer plans, or
  // sometimes the fields are top-level.
  const s = state?.data ?? state ?? null
  const num = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  // /iv-rank returns { data: [{ iv_rank_1y, ... }] } — newest first
  const iv = Array.isArray(ivRankList?.data) ? ivRankList.data[0] : null

  // /options-volume returns { data: [{ call_volume, put_volume,
  // net_call_premium, net_put_premium, ... }] }
  const ov = Array.isArray(optsVolList?.data) ? optsVolList.data[0] : null
  const callVol = num(ov?.call_volume)
  const putVol  = num(ov?.put_volume)
  const netCall = num(ov?.net_call_premium)
  const netPut  = num(ov?.net_put_premium)

  return {
    ticker,
    price:        num(s?.close),
    open:         num(s?.open),
    prevClose:    num(s?.prev_close ?? s?.previous_close),
    high:         num(s?.high),
    low:          num(s?.low),
    volume:       num(s?.volume),
    totalVolume:  num(s?.total_volume),
    marketTime:   s?.market_time ?? null,
    tapeTime:     s?.tape_time ?? null,
    ivRank:       num(iv?.iv_rank_1y),
    callVol,
    putVol,
    netPrem:      (netCall !== null || netPut !== null)
                    ? (netCall ?? 0) + (netPut ?? 0)
                    : null,
    callPutRatio: (callVol !== null && putVol !== null && putVol > 0)
                    ? callVol / putVol
                    : null,
  }
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.UNUSUAL_WHALES_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'UNUSUAL_WHALES_API_KEY not configured' },
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

  // Fan out in waves of 5 to stay under UW's per-second cap.
  const WAVE_SIZE = 5
  const rows: TickerRow[] = []
  for (let i = 0; i < tickers.length; i += WAVE_SIZE) {
    const wave = tickers.slice(i, i + WAVE_SIZE)
    const settled = await Promise.allSettled(
      wave.map(t => enrichTicker(t, apiKey)),
    )
    for (let j = 0; j < settled.length; j++) {
      const r = settled[j]
      if (r.status === 'fulfilled') {
        rows.push(r.value)
      } else {
        // Push a stub so the UI still renders the ticker
        rows.push({
          ticker: wave[j],
          price: null, open: null, prevClose: null, high: null, low: null,
          volume: null, totalVolume: null, marketTime: null, tapeTime: null,
          ivRank: null, callVol: null, putVol: null, netPrem: null,
          callPutRatio: null,
        })
      }
    }
    // Short pause between waves
    if (i + WAVE_SIZE < tickers.length) {
      await new Promise(r => setTimeout(r, 120))
    }
  }

  return NextResponse.json({
    tickers: rows,
    asOf: new Date().toISOString(),
    source: 'unusual-whales',
  })
}
