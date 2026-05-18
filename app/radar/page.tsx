'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { Radar, RefreshCw, AlertCircle, Filter } from 'lucide-react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { RadarItem } from '@/components/radar/radar-item'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RadarItem as RadarItemT, RadarResponse, RadarKind } from '@/lib/radar/types'

const fetcher = async (url: string): Promise<RadarResponse> => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

const COLUMNS: Array<{
  key: string
  title: string
  endpoint: string
  filters: Array<{ label: string; kinds: RadarKind[] | null }>
  refreshMs: number
}> = [
  {
    key: 'uw',
    title: 'UW Pre-Move Feed',
    endpoint: '/api/radar/uw-feed',
    refreshMs: 15_000,
    filters: [
      { label: 'All', kinds: null },
      { label: 'Dark Pool', kinds: ['darkpool', 'block'] },
      { label: 'Flow', kinds: ['flow'] },
      { label: 'Insider', kinds: ['insider'] },
      { label: 'Congress', kinds: ['congress'] },
    ],
  },
  {
    key: 'govfile',
    title: 'Filings + Gov Contracts',
    endpoint: '/api/radar/contracts',
    refreshMs: 120_000,
    filters: [
      { label: 'All', kinds: null },
      { label: 'DoD', kinds: ['contract-dod'] },
      { label: 'Awards', kinds: ['contract-award'] },
    ],
  },
  {
    key: 'sec',
    title: 'SEC Filings',
    endpoint: '/api/radar/filings',
    refreshMs: 60_000,
    filters: [
      { label: 'All', kinds: null },
      { label: '8-K', kinds: ['filing-8k'] },
      { label: 'Insider F4', kinds: ['filing-4'] },
      { label: '13D/G', kinds: ['filing-13d'] },
    ],
  },
  {
    key: 'trend',
    title: 'Trending + Social',
    endpoint: '/api/radar/trending',
    refreshMs: 60_000,
    filters: [{ label: 'All', kinds: null }],
  },
]

function RadarColumn({ col }: { col: (typeof COLUMNS)[number] }) {
  const { data, error, isLoading, mutate } = useSWR<RadarResponse>(col.endpoint, fetcher, {
    refreshInterval: col.refreshMs,
    revalidateOnFocus: false,
  })
  const [activeFilter, setActiveFilter] = useState(0)

  const filtered: RadarItemT[] = useMemo(() => {
    const all = data?.items ?? []
    const kinds = col.filters[activeFilter]?.kinds
    return kinds ? all.filter((i) => kinds.includes(i.kind)) : all
  }, [data, activeFilter, col.filters])

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950/60 overflow-hidden min-h-0">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <Radar className="h-3.5 w-3.5 text-emerald-400" />
          <h2 className="text-xs font-semibold tracking-wide uppercase text-zinc-200">{col.title}</h2>
          {data?.errors?.length ? (
            <span title={data.errors.join('\n')}>
              <AlertCircle className="h-3 w-3 text-amber-400" />
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-zinc-700 text-zinc-400 font-mono">
            {filtered.length}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-zinc-800"
            onClick={() => mutate()}
            title="Refresh"
          >
            <RefreshCw className={cn('h-3 w-3 text-zinc-400', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {col.filters.length > 1 ? (
        <div className="flex items-center gap-1 border-b border-zinc-800/50 px-2 py-1.5 overflow-x-auto bg-zinc-950/40">
          <Filter className="h-3 w-3 text-zinc-500 shrink-0" />
          {col.filters.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(i)}
              className={cn(
                'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition',
                i === activeFilter
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {isLoading && !data ? (
          <div className="p-4 text-xs text-zinc-500">Loading…</div>
        ) : error ? (
          <div className="p-4 text-xs text-rose-400">Error: {(error as Error).message}</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-xs text-zinc-500">No items.</div>
        ) : (
          filtered.map((it) => <RadarItem key={it.id} item={it} />)
        )}
      </div>
    </div>
  )
}

export default function RadarPage() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-black text-zinc-100">
      <TopNavBar />

      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 bg-zinc-950">
        <div className="flex items-center gap-3">
          <Radar className="h-4 w-4 text-emerald-400" />
          <h1 className="text-sm font-semibold tracking-wide uppercase">Pre-Move Radar</h1>
          <span className="text-[10px] text-zinc-500">
            UW · SEC EDGAR · USAspending · DoD · Apewisdom
          </span>
        </div>
        <div className="font-mono text-[10px] text-zinc-500 tabular-nums">
          {new Date(now).toLocaleTimeString()}
        </div>
      </header>

      <main className="grid flex-1 min-h-0 grid-cols-1 gap-2 p-2 lg:grid-cols-4 md:grid-cols-2">
        {COLUMNS.map((c) => (
          <RadarColumn key={c.key} col={c} />
        ))}
      </main>
    </div>
  )
}
