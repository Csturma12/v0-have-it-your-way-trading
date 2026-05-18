import { NextRequest, NextResponse } from 'next/server'
import type { RadarItem, RadarResponse } from '@/lib/radar/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Apewisdom aggregates ticker mentions across r/wallstreetbets, r/stocks,
// r/investing, StockTwits, and Yahoo Finance comments. Free, no auth.
// https://apewisdom.io/api/

async function fetchApewisdom(filter: 'all-stocks' | 'wallstreetbets' | 'stocktwits'): Promise<RadarItem[]> {
  const res = await fetch(`https://apewisdom.io/api/v1.0/filter/${filter}/page/1`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`apewisdom ${filter} ${res.status}`)
  const json = await res.json()
  const rows: any[] = json?.results ?? []
  const sourceLabel =
    filter === 'wallstreetbets' ? 'r/wallstreetbets' : filter === 'stocktwits' ? 'StockTwits' : 'Social'
  return rows.slice(0, 30).map((r) => {
    const mentions = Number(r.mentions ?? 0)
    const prev = Number(r.mentions_24h_ago ?? 0)
    const change = prev > 0 ? ((mentions - prev) / prev) * 100 : 0
    const sentScore = Number(r.sentiment_score ?? 0)
    return {
      id: `tr-${filter}-${r.ticker}`,
      kind: 'trending',
      ticker: r.ticker,
      title: `${r.ticker} trending · ${mentions.toLocaleString()} mentions${prev ? ` (${change >= 0 ? '+' : ''}${change.toFixed(0)}%)` : ''}`,
      detail: `${r.name ?? ''}${r.rank ? ` · rank #${r.rank}` : ''}${sentScore ? ` · sentiment ${sentScore.toFixed(2)}` : ''}`,
      source: sourceLabel,
      sentiment: sentScore > 0.05 ? 'bullish' : sentScore < -0.05 ? 'bearish' : 'neutral',
      timestamp: Date.now(),
    } as RadarItem
  })
}

export async function GET(_req: NextRequest) {
  const errors: string[] = []
  const items: RadarItem[] = []

  const results = await Promise.allSettled([
    fetchApewisdom('all-stocks'),
    fetchApewisdom('wallstreetbets'),
  ])
  const labels = ['all', 'wsb']
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value)
    else errors.push(`${labels[i]}: ${(r.reason as Error).message}`)
  })

  // De-dupe by ticker, preferring the higher-mention entry (already pre-sorted by Apewisdom).
  const seen = new Set<string>()
  const deduped = items.filter((it) => {
    if (!it.ticker) return true
    if (seen.has(it.ticker)) return false
    seen.add(it.ticker)
    return true
  })

  return NextResponse.json<RadarResponse>(
    {
      items: deduped.slice(0, 60),
      source: 'apewisdom',
      fetchedAt: Date.now(),
      errors: errors.length ? errors : undefined,
    },
    { status: 200 },
  )
}
