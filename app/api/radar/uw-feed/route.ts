import { NextRequest, NextResponse } from 'next/server'
import type { RadarItem, RadarResponse } from '@/lib/radar/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UW_BASE = 'https://api.unusualwhales.com/api'

async function fetchUW(path: string, key: string) {
  const res = await fetch(`${UW_BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`UW ${path} ${res.status}`)
  const json = await res.json()
  return Array.isArray(json) ? json : json?.data ?? []
}

function toMs(v: unknown): number {
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000
  if (typeof v === 'string') {
    const n = Number(v)
    if (!Number.isNaN(n)) return n > 1e12 ? n : n * 1000
    const d = Date.parse(v)
    if (!Number.isNaN(d)) return d
  }
  return Date.now()
}

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  const abs = Math.abs(n)
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export async function GET(req: NextRequest) {
  const key = process.env.UNUSUAL_WHALES_API_KEY
  const errors: string[] = []
  const items: RadarItem[] = []

  if (!key) {
    return NextResponse.json<RadarResponse>(
      {
        items: [],
        source: 'uw',
        fetchedAt: Date.now(),
        errors: ['UNUSUAL_WHALES_API_KEY not set'],
      },
      { status: 200 },
    )
  }

  const minValueParam = req.nextUrl.searchParams.get('minValue')
  const minValue = minValueParam ? Number(minValueParam) : 0

  // Run sources in parallel; isolate failures.
  const tasks: Array<Promise<void>> = [
    (async () => {
      try {
        const rows = await fetchUW('darkpool/recent', key)
        for (const r of rows.slice(0, 80)) {
          const value = Number(r.value ?? r.premium ?? (Number(r.price) * Number(r.size)) ?? 0)
          if (value < minValue) continue
          items.push({
            id: `dp-${r.tracking_id ?? r.id ?? `${r.ticker}-${r.executed_at ?? r.timestamp}`}`,
            kind: 'darkpool',
            ticker: r.ticker ?? null,
            title: `Dark pool print · ${r.ticker ?? '—'}`,
            detail: `${Number(r.size ?? 0).toLocaleString()} sh @ $${Number(r.price ?? 0).toFixed(2)} on ${r.market_center ?? r.exchange ?? 'FINRA'} · ${fmtMoney(value)}`,
            source: 'UW Dark Pool',
            amount: value,
            timestamp: toMs(r.executed_at ?? r.timestamp ?? r.tape_time),
          })
        }
      } catch (e) {
        errors.push(`darkpool: ${(e as Error).message}`)
      }
    })(),
    (async () => {
      try {
        const rows = await fetchUW('stock/flow/recent', key)
        for (const r of rows.slice(0, 60)) {
          const premium = Number(r.premium ?? r.total_premium ?? 0)
          if (premium < minValue) continue
          const side = r.type ?? r.option_type ?? ''
          items.push({
            id: `fl-${r.id ?? `${r.ticker}-${r.executed_at ?? r.timestamp}`}`,
            kind: 'flow',
            ticker: r.ticker ?? r.underlying_symbol ?? null,
            title: `Unusual options · ${r.ticker ?? r.underlying_symbol ?? '—'} ${side}`.toUpperCase(),
            detail: `${r.option_chain ?? `${r.expiry ?? ''} $${r.strike ?? ''}`} · ${fmtMoney(premium)} premium · ${Number(r.size ?? r.volume ?? 0).toLocaleString()} contracts`,
            source: 'UW Flow',
            amount: premium,
            sentiment: String(side).toLowerCase().includes('call')
              ? 'bullish'
              : String(side).toLowerCase().includes('put')
                ? 'bearish'
                : 'neutral',
            timestamp: toMs(r.executed_at ?? r.timestamp),
          })
        }
      } catch (e) {
        errors.push(`flow: ${(e as Error).message}`)
      }
    })(),
    (async () => {
      try {
        const rows = await fetchUW('congress/recent', key)
        for (const r of rows.slice(0, 40)) {
          const amt = Number(r.amount ?? r.amount_high ?? 0)
          items.push({
            id: `cg-${r.id ?? `${r.ticker}-${r.transaction_date}-${r.reporter}`}`,
            kind: 'congress',
            ticker: r.ticker ?? null,
            title: `Congress · ${r.reporter ?? 'member'} ${r.transaction_type ?? ''} ${r.ticker ?? ''}`.trim(),
            detail: `${r.chamber ?? ''} ${r.party ?? ''} · ${r.amount_range ?? fmtMoney(amt)} · filed ${r.disclosure_date ?? '—'}`,
            source: 'UW Congress',
            amount: amt,
            sentiment: /buy|purchase/i.test(String(r.transaction_type)) ? 'bullish' : /sell|sale/i.test(String(r.transaction_type)) ? 'bearish' : 'neutral',
            timestamp: toMs(r.transaction_date ?? r.disclosure_date ?? r.reported_at),
          })
        }
      } catch (e) {
        errors.push(`congress: ${(e as Error).message}`)
      }
    })(),
    (async () => {
      try {
        const rows = await fetchUW('insider/recent', key)
        for (const r of rows.slice(0, 40)) {
          const amt = Number(r.total_value ?? r.value ?? 0)
          items.push({
            id: `in-${r.id ?? `${r.ticker}-${r.transaction_date}-${r.full_name}`}`,
            kind: 'insider',
            ticker: r.ticker ?? null,
            title: `Insider · ${r.full_name ?? r.name ?? ''} ${r.transaction_code ?? r.transaction_type ?? ''} ${r.ticker ?? ''}`.trim(),
            detail: `${r.title ?? r.relationship ?? ''} · ${Number(r.shares ?? 0).toLocaleString()} sh · ${fmtMoney(amt)}`,
            source: 'UW Insider',
            amount: amt,
            sentiment: /P|buy/i.test(String(r.transaction_code ?? r.transaction_type)) ? 'bullish' : 'bearish',
            timestamp: toMs(r.transaction_date ?? r.filing_date),
          })
        }
      } catch (e) {
        errors.push(`insider: ${(e as Error).message}`)
      }
    })(),
  ]

  await Promise.all(tasks)

  items.sort((a, b) => b.timestamp - a.timestamp)

  return NextResponse.json<RadarResponse>(
    {
      items: items.slice(0, 250),
      source: 'uw',
      fetchedAt: Date.now(),
      errors: errors.length ? errors : undefined,
    },
    { status: 200 },
  )
}
