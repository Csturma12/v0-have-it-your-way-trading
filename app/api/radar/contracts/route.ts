import { NextRequest, NextResponse } from 'next/server'
import type { RadarItem, RadarResponse } from '@/lib/radar/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UA = process.env.SEC_USER_AGENT || 'SturmaData radar@sturmadata.net'

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parseRssItems(xml: string) {
  const out: Array<{ title: string; link: string; pubDate: string; description?: string }> = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1]
    const title = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? ''
    const link = /<link>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? ''
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? ''
    const description = /<description>([\s\S]*?)<\/description>/.exec(block)?.[1] ?? ''
    out.push({
      title: decode(title).trim(),
      link: decode(link).trim(),
      pubDate: pubDate.trim(),
      description: decode(description).trim(),
    })
  }
  return out
}

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  const abs = Math.abs(n)
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

async function fetchDod(): Promise<RadarItem[]> {
  const url = 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=400&Site=945'
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml,application/xml,text/xml' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`DoD RSS ${res.status}`)
  const xml = await res.text()
  const entries = parseRssItems(xml)
  return entries.slice(0, 30).map((e, i) => {
    const cleanDesc = e.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? ''
    return {
      id: `dod-${e.link || i}`,
      kind: 'contract-dod',
      ticker: null,
      title: `DoD contract · ${e.title}`,
      detail: cleanDesc.slice(0, 300),
      source: 'defense.gov',
      url: e.link,
      timestamp: e.pubDate ? Date.parse(e.pubDate) : Date.now(),
    } as RadarItem
  })
}

async function fetchUsaSpending(): Promise<RadarItem[]> {
  // Pull the most recent FY federal contract awards, biggest first.
  // https://api.usaspending.gov/api/v2/search/spending_by_award/
  const today = new Date()
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - 14)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const body = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      time_period: [{ start_date: fmt(start), end_date: fmt(today) }],
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Awarding Agency',
      'Awarding Sub Agency',
      'Description',
      'generated_internal_id',
      'Last Modified Date',
    ],
    page: 1,
    limit: 40,
    sort: 'Award Amount',
    order: 'desc',
    subawards: false,
  }
  const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`USAspending ${res.status}`)
  const json = await res.json()
  const rows: any[] = json?.results ?? []
  return rows.map((r) => {
    const amt = Number(r['Award Amount'] ?? 0)
    const id = r.generated_internal_id ?? r['Award ID']
    return {
      id: `awd-${id}`,
      kind: 'contract-award',
      ticker: null,
      title: `Award · ${r['Recipient Name'] ?? 'unknown'} · ${fmtMoney(amt)}`,
      detail: `${r['Awarding Agency'] ?? ''}${r['Awarding Sub Agency'] ? ' / ' + r['Awarding Sub Agency'] : ''} · ${r.Description ?? ''}`.slice(0, 300),
      source: 'USAspending.gov',
      url: id ? `https://www.usaspending.gov/award/${encodeURIComponent(id)}` : undefined,
      amount: amt,
      timestamp: r['Last Modified Date'] ? Date.parse(r['Last Modified Date']) : Date.now(),
    } as RadarItem
  })
}

export async function GET(_req: NextRequest) {
  const errors: string[] = []
  const items: RadarItem[] = []

  const results = await Promise.allSettled([fetchDod(), fetchUsaSpending()])
  const labels = ['dod', 'usaspending']
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value)
    else errors.push(`${labels[i]}: ${(r.reason as Error).message}`)
  })

  items.sort((a, b) => b.timestamp - a.timestamp)

  return NextResponse.json<RadarResponse>(
    {
      items: items.slice(0, 120),
      source: 'gov-contracts',
      fetchedAt: Date.now(),
      errors: errors.length ? errors : undefined,
    },
    { status: 200 },
  )
}
