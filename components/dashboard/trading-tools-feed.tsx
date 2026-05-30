'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Radar, RefreshCw, Crosshair } from 'lucide-react'
import { RadarItem } from '@/components/radar/radar-item'
import { cn } from '@/lib/utils'
import type { RadarResponse, RadarItem as RadarItemT } from '@/lib/radar/types'

const fetcher = async (url: string): Promise<RadarResponse> => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

const TABS: Array<{ key: string; label: string; endpoint: string; refreshMs: number }> = [
  { key: 'all', label: 'All', endpoint: '', refreshMs: 0 },
  { key: 'uw', label: 'UW', endpoint: '/api/radar/uw-feed', refreshMs: 15_000 },
  { key: 'sec', label: 'SEC', endpoint: '/api/radar/filings', refreshMs: 60_000 },
  { key: 'gov', label: 'Gov', endpoint: '/api/radar/contracts', refreshMs: 120_000 },
  { key: 'social', label: 'Social', endpoint: '/api/radar/trending', refreshMs: 60_000 },
]

export function TradingToolsFeed({ ticker }: { ticker: string }) {
  const [tab, setTab] = useState<string>('all')
  const [filterToTicker, setFilterToTicker] = useState(false)

  // All 4 sources pulled in parallel; SWR de-dupes per key.
  const uw = useSWR<RadarResponse>('/api/radar/uw-feed', fetcher, { refreshInterval: 15_000, revalidateOnFocus: false })
  const sec = useSWR<RadarResponse>('/api/radar/filings', fetcher, { refreshInterval: 60_000, revalidateOnFocus: false })
  const gov = useSWR<RadarResponse>('/api/radar/contracts', fetcher, { refreshInterval: 120_000, revalidateOnFocus: false })
  const social = useSWR<RadarResponse>('/api/radar/trending', fetcher, { refreshInterval: 60_000, revalidateOnFocus: false })

  const items: RadarItemT[] = useMemo(() => {
    const all = [
      ...(uw.data?.items ?? []),
      ...(sec.data?.items ?? []),
      ...(gov.data?.items ?? []),
      ...(social.data?.items ?? []),
    ]
    const pick =
      tab === 'all'
        ? all
        : tab === 'uw'
          ? uw.data?.items ?? []
          : tab === 'sec'
            ? sec.data?.items ?? []
            : tab === 'gov'
              ? gov.data?.items ?? []
              : social.data?.items ?? []
    const filtered = filterToTicker && ticker ? pick.filter((i) => i.ticker === ticker) : pick
    return filtered.sort((a, b) => b.timestamp - a.timestamp).slice(0, 80)
  }, [uw.data, sec.data, gov.data, social.data, tab, filterToTicker, ticker])

  const isLoading = uw.isLoading || sec.isLoading || gov.isLoading || social.isLoading
  const refreshAll = () => {
    uw.mutate(); sec.mutate(); gov.mutate(); social.mutate()
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950/40">
      <div className="flex items-center gap-1 border-b border-zinc-800 px-2 py-1.5 bg-zinc-900/40">
        <Radar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition',
                tab === t.key
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {ticker ? (
          <button
            onClick={() => setFilterToTicker((v) => !v)}
            className={cn(
              'flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono transition',
              filterToTicker
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent',
            )}
            title={filterToTicker ? `Only showing ${ticker}` : `Filter to ${ticker}`}
          >
            <Crosshair className="h-3 w-3" />
            {ticker}
          </button>
        ) : null}
        <button
          onClick={refreshAll}
          className="shrink-0 rounded p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          title="Refresh"
        >
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-4 text-xs text-zinc-500">
            {isLoading ? 'Loading…' : filterToTicker ? `No recent activity for ${ticker}.` : 'No items.'}
          </div>
        ) : (
          items.map((it) => <RadarItem key={`${it.kind}-${it.id}`} item={it} />)
        )}
      </div>
    </div>
  )
}
