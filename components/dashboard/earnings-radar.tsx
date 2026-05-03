'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { Calendar, Sun, Moon, CalendarDays } from 'lucide-react'
import { TabbedWidget, TabbedWidgetTab } from './tabbed-widget'

/**
 * Earnings Radar — UW Phase 2.
 *
 * Three tabs (lazy-mounted by TabbedWidget):
 *   - Pre-Market    : tickers reporting before today's open
 *   - After-Hours   : tickers reporting after today's close
 *   - This Week     : 5-day rolling earnings calendar
 *
 * All endpoints are market-wide (not per-ticker) so this widget
 * doesn't read selectedTicker — it's the same view for every user.
 *
 * The "earnings + smart money" recipe from UW's notebook is partly
 * served here: the user can see WHAT'S reporting, then click into
 * a ticker on the dashboard to see institutional activity for it
 * via the existing Catalysts/Risk widget. A deeper "earnings X
 * institution overlap" lookup would need an endpoint we don't have
 * yet, so we ship the surfaceable half and leave the recipe note
 * in the widget header tooltip.
 */

interface EarningsRow {
  ticker: string
  symbol?: string
  full_name?: string
  report_date?: string
  date?: string
  reaction?: string | number
  expected_move?: string | number
  expected_move_perc?: string | number
  market_cap?: string | number
  pre_or_post?: string
  street_mean_est?: string | number
  actual_eps?: string | number
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

// Format a date as "Mon 5/2"
function fmtDate(d: string | undefined): string {
  if (!d) return ''
  try {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
  } catch {
    return d
  }
}

// Format $ short (1.2B, 350M, 12.5K)
function fmtMcap(v: string | number | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtPct(v: string | number | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!Number.isFinite(n)) return '—'
  // UW returns percentages as decimals sometimes, sometimes as whole numbers.
  // If absolute value < 1 we treat it as a decimal.
  const pct = Math.abs(n) < 1 ? n * 100 : n
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

interface EarningsListProps {
  endpoint: string
  emptyLabel: string
}

function EarningsList({ endpoint, emptyLabel }: EarningsListProps) {
  const { data, error, isLoading } = useSWR<{ data?: EarningsRow[] }>(
    endpoint,
    fetcher,
    {
      // Earnings calendars don't change intraday; refresh every 10 min.
      refreshInterval: 10 * 60_000,
      revalidateOnFocus: false,
    }
  )

  const rows = useMemo(() => {
    const list = data?.data ?? []
    // Sort by expected market cap (largest first) so heavyweight names
    // don't get buried under penny stocks.
    return [...list].sort((a, b) => {
      const am = parseFloat(String(a.market_cap ?? 0))
      const bm = parseFloat(String(b.market_cap ?? 0))
      return (bm || 0) - (am || 0)
    })
  }, [data])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-red-400 px-3 text-center">
        Failed to load earnings calendar
      </div>
    )
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground px-3 text-center">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-[10px] font-mono">
        <thead className="sticky top-0 bg-background border-b border-border/40">
          <tr className="text-[8px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left px-2 py-1 font-normal">Ticker</th>
            <th className="text-left px-1 py-1 font-normal">Date</th>
            <th className="text-right px-1 py-1 font-normal">Mkt Cap</th>
            <th className="text-right px-1 py-1 font-normal">Exp Move</th>
            <th className="text-right px-2 py-1 font-normal">Est EPS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const t = row.ticker || row.symbol || ''
            const move = row.expected_move_perc ?? row.expected_move
            const date = row.report_date || row.date
            return (
              <tr key={`${t}-${i}`} className="border-b border-border/20 hover:bg-muted/20">
                <td className="px-2 py-1">
                  <span className="font-bold">{t}</span>
                  {row.full_name && (
                    <div className="text-[8px] text-muted-foreground truncate max-w-[120px]">
                      {row.full_name}
                    </div>
                  )}
                </td>
                <td className="px-1 py-1 text-muted-foreground">{fmtDate(date)}</td>
                <td className="px-1 py-1 text-right">{fmtMcap(row.market_cap)}</td>
                <td className="px-1 py-1 text-right text-amber-400">
                  {fmtPct(move)}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.street_mean_est == null || row.street_mean_est === ''
                    ? '—'
                    : `$${parseFloat(String(row.street_mean_est)).toFixed(2)}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// "This Week" tab: pulls premarket + afterhours and groups by date
function ThisWeek() {
  const { data: pre, isLoading: preLoading } = useSWR<{ data?: EarningsRow[] }>(
    '/api/uw/earnings/premarket',
    fetcher,
    { refreshInterval: 10 * 60_000, revalidateOnFocus: false }
  )
  const { data: aft, isLoading: aftLoading } = useSWR<{ data?: EarningsRow[] }>(
    '/api/uw/earnings/afterhours',
    fetcher,
    { refreshInterval: 10 * 60_000, revalidateOnFocus: false }
  )

  const grouped = useMemo(() => {
    const all = [
      ...((pre?.data ?? []).map(r => ({ ...r, _slot: 'AM' as const }))),
      ...((aft?.data ?? []).map(r => ({ ...r, _slot: 'PM' as const }))),
    ]

    // Group by report date, sort dates ascending, sort tickers within
    // each date by market cap descending.
    const map = new Map<string, Array<EarningsRow & { _slot: 'AM' | 'PM' }>>()
    for (const r of all) {
      const d = r.report_date || r.date || ''
      if (!d) continue
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(r)
    }

    const sorted = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => ({
        date,
        rows: rows.sort((a, b) => {
          const am = parseFloat(String(a.market_cap ?? 0))
          const bm = parseFloat(String(b.market_cap ?? 0))
          return (bm || 0) - (am || 0)
        }),
      }))
    return sorted
  }, [pre, aft])

  if ((preLoading || aftLoading) && grouped.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (grouped.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground px-3 text-center">
        No earnings scheduled
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {grouped.map(({ date, rows }) => (
        <div key={date}>
          <div className="sticky top-0 bg-background/95 backdrop-blur px-2 py-1 border-b border-border/40 text-[9px] font-mono font-bold uppercase tracking-wider text-primary">
            {fmtDate(date)} <span className="text-muted-foreground font-normal">({rows.length})</span>
          </div>
          <table className="w-full text-[10px] font-mono">
            <tbody>
              {rows.slice(0, 20).map((row, i) => {
                const t = row.ticker || row.symbol || ''
                const move = row.expected_move_perc ?? row.expected_move
                return (
                  <tr key={`${t}-${i}`} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-2 py-1 w-12">
                      <span
                        className={`px-1 py-px rounded text-[7px] font-bold ${
                          row._slot === 'AM'
                            ? 'bg-amber-400/15 text-amber-400'
                            : 'bg-blue-400/15 text-blue-400'
                        }`}
                        title={row._slot === 'AM' ? 'Pre-market' : 'After-hours'}
                      >
                        {row._slot}
                      </span>
                    </td>
                    <td className="px-1 py-1 font-bold">{t}</td>
                    <td className="px-1 py-1 text-right text-muted-foreground">
                      {fmtMcap(row.market_cap)}
                    </td>
                    <td className="px-2 py-1 text-right text-amber-400">
                      {fmtPct(move)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export function EarningsRadar() {
  const tabs: TabbedWidgetTab[] = [
    {
      id: 'premarket',
      label: 'Pre-Market',
      icon: Sun,
      title: 'Tickers reporting earnings before market open',
      render: () => (
        <EarningsList
          endpoint="/api/uw/earnings/premarket"
          emptyLabel="No pre-market earnings today"
        />
      ),
    },
    {
      id: 'afterhours',
      label: 'After-Hours',
      icon: Moon,
      title: 'Tickers reporting earnings after market close',
      render: () => (
        <EarningsList
          endpoint="/api/uw/earnings/afterhours"
          emptyLabel="No after-hours earnings today"
        />
      ),
    },
    {
      id: 'week',
      label: 'This Week',
      icon: CalendarDays,
      title: '5-day rolling earnings calendar (pre+post combined)',
      render: () => <ThisWeek />,
    },
  ]

  return (
    <TabbedWidget
      title="Earnings Radar"
      icon={Calendar}
      iconColor="text-amber-400"
      tabs={tabs}
    />
  )
}
