'use client'

import Link from 'next/link'
import { ExternalLink, LineChart, Search, Crosshair } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { RadarItem as RadarItemT } from '@/lib/radar/types'
import { cn } from '@/lib/utils'

interface Props {
  item: RadarItemT
}

const TS_TEMPLATE =
  process.env.NEXT_PUBLIC_TRENDSPIDER_URL_TEMPLATE ||
  'https://app.trendspider.com/charting/?symbol={TICKER}'
const SA_TEMPLATE =
  process.env.NEXT_PUBLIC_SEEKING_ALPHA_URL_TEMPLATE ||
  'https://seekingalpha.com/symbol/{TICKER}'

function externalUrl(template: string, ticker: string): string {
  return template.replace(/\{TICKER\}/gi, encodeURIComponent(ticker))
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.max(0, Math.floor(diff / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const KIND_STYLE: Record<string, string> = {
  darkpool: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  block: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  flow: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  insider: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  congress: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  'filing-8k': 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  'filing-4': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  'filing-13d': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  'contract-dod': 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  'contract-award': 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  trending: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30',
}

const KIND_LABEL: Record<string, string> = {
  darkpool: 'DP',
  block: 'BLK',
  flow: 'FLOW',
  insider: 'INS',
  congress: 'CONG',
  'filing-8k': '8-K',
  'filing-4': 'F4',
  'filing-13d': '13D',
  'contract-dod': 'DOD',
  'contract-award': 'AWD',
  trending: 'SOC',
}

export function RadarItem({ item }: Props) {
  const sentColor =
    item.sentiment === 'bullish'
      ? 'text-emerald-400'
      : item.sentiment === 'bearish'
        ? 'text-rose-400'
        : 'text-zinc-400'

  return (
    <div className="group flex flex-col gap-1.5 border-b border-zinc-800/60 px-3 py-2.5 hover:bg-zinc-900/40 transition">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider',
            KIND_STYLE[item.kind] ?? 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
          )}
        >
          {KIND_LABEL[item.kind] ?? item.kind.toUpperCase()}
        </span>
        {item.ticker ? (
          <Link
            href={`/quicktrade?ticker=${item.ticker}`}
            className="font-mono text-sm font-semibold text-zinc-100 hover:text-emerald-400 transition"
          >
            {item.ticker}
          </Link>
        ) : null}
        <span className={cn('text-sm leading-snug text-zinc-200 truncate', item.ticker && 'flex-1')}>
          {item.title}
        </span>
        <span className="ml-auto shrink-0 text-[10px] font-mono text-zinc-500 tabular-nums">
          {timeAgo(item.timestamp)}
        </span>
      </div>

      {item.detail ? (
        <div className="pl-1 text-[11px] text-zinc-400 leading-snug line-clamp-2">{item.detail}</div>
      ) : null}

      <div className="flex items-center gap-2 pl-1">
        <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal text-zinc-500 border-zinc-700">
          {item.source}
        </Badge>
        {item.sentiment ? (
          <span className={cn('text-[10px] uppercase tracking-wider font-medium', sentColor)}>
            {item.sentiment}
          </span>
        ) : null}
        {item.ticker ? (
          <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            <a
              href={externalUrl(TS_TEMPLATE, item.ticker)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-cyan-400"
              title="Open in TrendSpider (uses your existing logged-in session)"
            >
              <LineChart className="h-3 w-3" /> TS
            </a>
            <a
              href={externalUrl(SA_TEMPLATE, item.ticker)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-orange-400"
              title="Open in Seeking Alpha"
            >
              <Search className="h-3 w-3" /> SA
            </a>
            <Link
              href={`/quicktrade?ticker=${item.ticker}`}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-400"
              title="Quick Trade"
            >
              <Crosshair className="h-3 w-3" /> Trade
            </Link>
          </div>
        ) : null}
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-100',
              !item.ticker && 'ml-auto',
            )}
            title="Open source"
          >
            <ExternalLink className="h-3 w-3" /> source
          </a>
        ) : null}
      </div>
    </div>
  )
}
