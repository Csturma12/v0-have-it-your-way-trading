import { NextRequest, NextResponse } from 'next/server'
import type { RadarItem, RadarResponse, RadarKind } from '@/lib/radar/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// SEC requires a descriptive User-Agent identifying the requester.
// https://www.sec.gov/os/accessing-edgar-data
const SEC_UA = process.env.SEC_USER_AGENT || 'SturmaData radar@sturmadata.net'

const FEEDS: Array<{ type: string; kind: RadarKind; label: string }> = [
  { type: '8-K', kind: 'filing-8k', label: '8-K material event' },
  { type: '4', kind: 'filing-4', label: 'Form 4 insider txn' },
  { type: 'SC 13D', kind: 'filing-13d', label: '13D 5%+ stake' },
  { type: 'SC 13G', kind: 'filing-13d', label: '13G 5%+ stake' },
]

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function parseAtomEntries(xml: string) {
  const out: Array<{ title: string; link: string; updated: string; summary?: string }> = []
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g
  let m: RegExpExecArray | null
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1]
    const title = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? ''
    const link = /<link[^>]*href="([^"]+)"/.exec(block)?.[1] ?? ''
    const updated = /<updated>([\s\S]*?)<\/updated>/.exec(block)?.[1] ?? ''
    const summary = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(block)?.[1] ?? ''
    out.push({
      title: decodeXmlEntities(title.trim()),
      link: link.trim(),
      updated: updated.trim(),
      summary: decodeXmlEntities(summary.trim()),
    })
  }
  return out
}

// Title format examples:
// "8-K - APPLE INC (0000320193) (Filer)"
// "4 - Doe John (0001234567) (Reporting)"
function parseFilingTitle(title: string): { form: string; entity: string; cik: string } {
  const m = /^(.*?)\s*-\s*(.+?)\s*\((\d+)\)/.exec(title)
  if (!m) return { form: '', entity: title, cik: '' }
  return { form: m[1].trim(), entity: m[2].trim(), cik: m[3] }
}

// CIK -> ticker map (cached per process). Pulled from SEC's tickers.json.
let tickerMap: Map<string, string> | null = null
let tickerMapAt = 0
async function ensureTickerMap(): Promise<Map<string, string>> {
  const TTL = 24 * 60 * 60 * 1000
  if (tickerMap && Date.now() - tickerMapAt < TTL) return tickerMap
  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': SEC_UA, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`tickers.json ${res.status}`)
    const json: Record<string, { cik_str: number; ticker: string; title: string }> = await res.json()
    const m = new Map<string, string>()
    for (const v of Object.values(json)) {
      m.set(String(v.cik_str).padStart(10, '0'), v.ticker)
    }
    tickerMap = m
    tickerMapAt = Date.now()
    return m
  } catch {
    tickerMap = tickerMap ?? new Map()
    return tickerMap
  }
}

async function fetchFeed(type: string): Promise<RadarItem[]> {
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=${encodeURIComponent(type)}&owner=include&count=40&output=atom`
  const res = await fetch(url, {
    headers: { 'User-Agent': SEC_UA, Accept: 'application/atom+xml,application/xml,text/xml' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`EDGAR ${type} ${res.status}`)
  const xml = await res.text()
  const entries = parseAtomEntries(xml)
  const map = await ensureTickerMap()
  const def = FEEDS.find((f) => f.type === type)!

  return entries.map((e) => {
    const parsed = parseFilingTitle(e.title)
    const cikPad = parsed.cik ? parsed.cik.padStart(10, '0') : ''
    const ticker = cikPad ? map.get(cikPad) ?? null : null
    return {
      id: `sec-${type}-${e.link}`,
      kind: def.kind,
      ticker,
      title: `${def.label} · ${parsed.entity || e.title}`,
      detail: e.summary?.replace(/<[^>]+>/g, '').slice(0, 240),
      source: 'SEC EDGAR',
      url: e.link,
      timestamp: e.updated ? Date.parse(e.updated) : Date.now(),
    } as RadarItem
  })
}

export async function GET(_req: NextRequest) {
  const errors: string[] = []
  const items: RadarItem[] = []

  const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f.type)))
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value)
    else errors.push(`${FEEDS[i].type}: ${(r.reason as Error).message}`)
  })

  items.sort((a, b) => b.timestamp - a.timestamp)

  return NextResponse.json<RadarResponse>(
    {
      items: items.slice(0, 200),
      source: 'sec-edgar',
      fetchedAt: Date.now(),
      errors: errors.length ? errors : undefined,
    },
    { status: 200 },
  )
}
