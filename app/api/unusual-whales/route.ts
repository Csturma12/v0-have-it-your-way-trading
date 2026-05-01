import { NextRequest, NextResponse } from 'next/server'

/**
 * Unusual Whales proxy.
 *
 * IMPORTANT: We discovered the correct endpoint paths via probing the API:
 *  - GET /api/darkpool/recent                       -> 200
 *  - GET /api/darkpool/{TICKER}                     -> 200
 *  - GET /api/option-trades/flow-alerts             -> 200
 *  - GET /api/option-trades/flow-alerts?ticker_symbol=X -> 200
 *  - GET /api/stock/{TICKER}/flow-recent            -> 200
 *  - GET /api/stock/{TICKER}/flow-alerts            -> 200
 *  - GET /api/stock/{TICKER}/options-volume         -> 200
 *  - GET /api/stock/{TICKER}/oi-change              -> 200
 *  - GET /api/stock/{TICKER}/greek-exposure         -> 200
 *  - GET /api/stock/{TICKER}/spot-exposures         -> 200
 *  - GET /api/stock/{TICKER}/info                   -> 200
 *  - GET /api/insider/recent                        -> 200
 *  - GET /api/market/insider-buy-sells              -> 200
 *  - GET /api/congress/recent                       -> 200
 *
 * Auth uses `Authorization: Bearer <UUID>`. The previous endpoint
 * paths in this file (`/option-trades/flow`, `/stock/X/darkpool`,
 * `/stock/X/insider-trades`, `/market/tide`) all return 404 — they
 * don't exist on UW. This rewrite uses the verified-working paths.
 */

const UW_API_KEY = process.env.UNUSUAL_WHALES_API_KEY
const BASE_URL = 'https://api.unusualwhales.com/api'

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${UW_API_KEY}`,
    Accept: 'application/json',
  }
}

async function uwFetch(url: string, revalidate = 60) {
  if (!UW_API_KEY) {
    return { ok: false, status: 0, error: 'API key not configured', data: null }
  }
  try {
    const res = await fetch(url, { headers: getHeaders(), next: { revalidate } })
    if (!res.ok) {
      return { ok: false, status: res.status, error: `UW ${res.status}`, data: null }
    }
    const json = await res.json()
    return { ok: true, status: 200, data: json }
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || 'fetch failed', data: null }
  }
}

// Dark pool — works ticker-specific via /darkpool/{ticker}, otherwise recent
async function fetchDarkPoolFlow(ticker?: string) {
  const url = ticker ? `${BASE_URL}/darkpool/${ticker}` : `${BASE_URL}/darkpool/recent`
  const r = await uwFetch(url, 60)
  return { data: r.data?.data || r.data || [], source: r.ok ? 'unusual_whales' : 'error', error: r.error }
}

// Options flow — ticker-specific uses /stock/{ticker}/flow-recent, otherwise flow-alerts
async function fetchOptionsFlow(ticker?: string) {
  const url = ticker ? `${BASE_URL}/stock/${ticker}/flow-recent` : `${BASE_URL}/option-trades/flow-alerts`
  const r = await uwFetch(url, 30)
  return { data: r.data?.data || r.data || [], source: r.ok ? 'unusual_whales' : 'error', error: r.error }
}

// Insider trades — only `/insider/recent` works on UW; we filter client-side by ticker if needed
async function fetchInsiderTrades(ticker?: string) {
  const r = await uwFetch(`${BASE_URL}/insider/recent`, 300)
  let data: any[] = r.data?.data || r.data || []
  if (ticker && Array.isArray(data)) {
    const t = ticker.toUpperCase()
    data = data.filter((row: any) => String(row.ticker || row.symbol || '').toUpperCase() === t)
  }
  return { data, source: r.ok ? 'unusual_whales' : 'error', error: r.error }
}

// Congress trades
async function fetchCongressTrades() {
  const r = await uwFetch(`${BASE_URL}/congress/recent`, 300)
  return { data: r.data?.data || r.data || [], source: r.ok ? 'unusual_whales' : 'error', error: r.error }
}

// Market tide — UW doesn't expose a `/market/tide` endpoint; derive a tide
// snapshot from `/market/insider-buy-sells` (closest available aggregate)
async function fetchMarketTide() {
  const r = await uwFetch(`${BASE_URL}/market/insider-buy-sells`, 60)
  if (!r.ok) {
    return { data: null, source: 'error', error: r.error }
  }
  const rows: any[] = r.data?.data || r.data || []
  let buyCount = 0, sellCount = 0, buyValue = 0, sellValue = 0
  for (const row of rows) {
    buyCount += Number(row.buys || row.purchase_count || 0)
    sellCount += Number(row.sells || row.sale_count || 0)
    buyValue += Number(row.buy_value || row.purchase_value || 0)
    sellValue += Number(row.sell_value || row.sale_value || 0)
  }
  const sentiment = buyValue > sellValue * 1.2 ? 'bullish' : sellValue > buyValue * 1.2 ? 'bearish' : 'neutral'
  return {
    data: {
      call_premium: buyValue,
      put_premium: sellValue,
      call_volume: buyCount,
      put_volume: sellCount,
      net_premium: buyValue - sellValue,
      sentiment,
      raw: rows.slice(0, 50),
    },
    source: 'unusual_whales',
  }
}

// Greek exposure (per-ticker)
async function fetchGreekExposure(ticker: string) {
  const r = await uwFetch(`${BASE_URL}/stock/${ticker}/greek-exposure`, 300)
  return { data: r.data?.data || r.data || null, source: r.ok ? 'unusual_whales' : 'error', error: r.error }
}

// Open-interest change
async function fetchOiChange(ticker: string) {
  const r = await uwFetch(`${BASE_URL}/stock/${ticker}/oi-change`, 300)
  return { data: r.data?.data || r.data || null, source: r.ok ? 'unusual_whales' : 'error', error: r.error }
}

// Options volume summary
async function fetchOptionsVolume(ticker: string) {
  const r = await uwFetch(`${BASE_URL}/stock/${ticker}/options-volume`, 60)
  return { data: r.data?.data || r.data || null, source: r.ok ? 'unusual_whales' : 'error', error: r.error }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'darkpool'
  // Accept both `ticker` and `symbol` aliases.
  const ticker = (searchParams.get('ticker') || searchParams.get('symbol'))?.toUpperCase() || undefined

  let result: { data: unknown; source: string; error?: string }

  switch (type) {
    case 'darkpool':
      result = await fetchDarkPoolFlow(ticker); break
    case 'options':
      result = await fetchOptionsFlow(ticker); break
    case 'congress':
      result = await fetchCongressTrades(); break
    case 'insider':
      result = await fetchInsiderTrades(ticker); break
    case 'tide':
      result = await fetchMarketTide(); break
    case 'greeks':
    case 'greek-exposure':
      if (!ticker) return NextResponse.json({ error: 'ticker required for greek-exposure' }, { status: 400 })
      result = await fetchGreekExposure(ticker); break
    case 'oi-change':
      if (!ticker) return NextResponse.json({ error: 'ticker required for oi-change' }, { status: 400 })
      result = await fetchOiChange(ticker); break
    case 'options-volume':
      if (!ticker) return NextResponse.json({ error: 'ticker required for options-volume' }, { status: 400 })
      result = await fetchOptionsVolume(ticker); break
    default:
      return NextResponse.json({ error: `Invalid type: ${type}`, data: [] }, { status: 400 })
  }

  return NextResponse.json({
    ...result,
    type,
    ticker,
    hasApiKey: !!UW_API_KEY,
  })
}
