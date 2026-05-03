'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { ShieldAlert, TrendingDown, BarChart3, ListFilter } from 'lucide-react'
import { TabbedWidget, TabbedWidgetTab } from './tabbed-widget'

/**
 * Shorts Profile — UW Phase 3.
 *
 * Tabs:
 *   - Snapshot — current short interest, % of float, days to cover,
 *                fee/rebate. /stock/{t}/short-data + short-interest-float
 *   - Volume   — recent short volume vs total volume + ratio history.
 *                /stock/{t}/volume-and-ratio
 *   - Screener — market-wide top short-interest stocks (heaviest shorts)
 *                /screener/short-screener
 *
 * Tabs 1-2 are ticker-aware and re-fetch when ticker changes. Tab 3
 * is market-wide and ignores the ticker.
 *
 * Why a separate widget instead of folding into the bundle: most users
 * won't have Shorts on their default layout — it's a specialized view
 * for squeeze hunting. Bundle stays lean; widget fetches on demand.
 */

interface ShortDataRow {
  short_interest?: string | number
  days_to_cover?: string | number
  short_percent_of_float?: string | number
  short_percent_increase?: string | number
  fee?: string | number
  rebate?: string | number
  shares_available?: string | number
  shares_on_loan?: string | number
  utilization?: string | number
  date?: string
}

interface VolumeRow {
  date: string
  short_volume?: string | number
  total_volume?: string | number
  short_volume_ratio?: string | number
}

interface ScreenerRow {
  ticker?: string
  symbol?: string
  full_name?: string
  short_percent_of_float?: string | number
  short_interest?: string | number
  days_to_cover?: string | number
  market_cap?: string | number
  price?: string | number
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

const toNum = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : null
}

function fmtPctMaybeDecimal(v: unknown): string {
  const n = toNum(v)
  if (n == null) return '—'
  // UW sometimes returns 0-1 decimals, sometimes whole percentages.
  const pct = Math.abs(n) <= 1 ? n * 100 : n
  return `${pct.toFixed(2)}%`
}

function fmtNum(v: unknown, opts?: { suffix?: string; digits?: number }): string {
  const n = toNum(v)
  if (n == null) return '—'
  return `${n.toLocaleString(undefined, { maximumFractionDigits: opts?.digits ?? 2 })}${opts?.suffix ?? ''}`
}

function fmtMcap(v: unknown): string {
  const n = toNum(v)
  if (n == null) return '—'
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toFixed(0)}`
}

// ──────────────────────────────────────────────────────────────────────
// Tab 1: Snapshot
// ──────────────────────────────────────────────────────────────────────
function SnapshotTab({ ticker }: { ticker: string }) {
  const { data: shortData, error: e1, isLoading: l1 } = useSWR<{ data?: ShortDataRow[] }>(
    ticker ? `/api/uw/stock/${ticker}/short-data` : null,
    fetcher,
    { refreshInterval: 5 * 60_000, revalidateOnFocus: false }
  )
  const { data: floatData, error: e2, isLoading: l2 } = useSWR<{ data?: ShortDataRow[] }>(
    ticker ? `/api/uw/stock/${ticker}/short-interest-float` : null,
    fetcher,
    { refreshInterval: 5 * 60_000, revalidateOnFocus: false }
  )

  const merged = useMemo<ShortDataRow | null>(() => {
    const a = shortData?.data?.[0]
    const b = floatData?.data?.[0]
    if (!a && !b) return null
    return { ...(b ?? {}), ...(a ?? {}) }
  }, [shortData, floatData])

  if (e1 || e2) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-red-400 px-3 text-center">
        Failed to load short data
      </div>
    )
  }

  if ((l1 || l2) && !merged) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!merged) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground px-3 text-center">
        No short data available for {ticker}
      </div>
    )
  }

  // Squeeze score: combo of % float + days-to-cover + utilization.
  // Honest heuristic, not a UW-published score.
  const sq = (() => {
    const pf = toNum(merged.short_percent_of_float)
    const dtc = toNum(merged.days_to_cover)
    const util = toNum(merged.utilization)
    if (pf == null && dtc == null && util == null) return null
    let score = 0
    if (pf != null) score += Math.min(40, (Math.abs(pf) <= 1 ? pf * 100 : pf) * 1.5)
    if (dtc != null) score += Math.min(30, dtc * 5)
    if (util != null) score += Math.min(30, (Math.abs(util) <= 1 ? util * 100 : util) * 0.4)
    return Math.round(Math.min(100, score))
  })()

  const sqColor = sq == null ? '' : sq >= 70 ? 'text-red-400' : sq >= 40 ? 'text-amber-400' : 'text-green-400'
  const sqLabel = sq == null ? '—' : sq >= 70 ? 'High' : sq >= 40 ? 'Medium' : 'Low'

  return (
    <div className="h-full overflow-y-auto p-2 space-y-2">
      {/* Squeeze indicator at the top */}
      <div className="bg-muted/30 rounded p-2">
        <div className="flex items-center justify-between text-[8px] uppercase tracking-wider text-muted-foreground">
          <span>Squeeze Risk (heuristic)</span>
          <span title="Composite of short-%-of-float, days-to-cover, and utilization. Not a UW-published score.">?</span>
        </div>
        <div className={`text-lg font-mono font-bold ${sqColor}`}>
          {sq == null ? '—' : `${sq}/100`}
          <span className="ml-2 text-[10px] uppercase tracking-wider">{sqLabel}</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
        <Stat label="Short % of Float" value={fmtPctMaybeDecimal(merged.short_percent_of_float)} />
        <Stat label="Short Interest"   value={fmtNum(merged.short_interest, { digits: 0 })} />
        <Stat label="Days to Cover"    value={fmtNum(merged.days_to_cover, { digits: 1 })} />
        <Stat label="Utilization"      value={fmtPctMaybeDecimal(merged.utilization)} />
        <Stat label="Borrow Fee"       value={fmtPctMaybeDecimal(merged.fee)} />
        <Stat label="Rebate"           value={fmtPctMaybeDecimal(merged.rebate)} />
        <Stat label="Shares On Loan"   value={fmtNum(merged.shares_on_loan, { digits: 0 })} />
        <Stat label="Shares Available" value={fmtNum(merged.shares_available, { digits: 0 })} />
      </div>

      {merged.short_percent_increase != null && (
        <div className="bg-muted/30 rounded p-1.5 text-[9px] font-mono">
          <span className="text-muted-foreground">Δ vs prior period: </span>
          <span className={
            (toNum(merged.short_percent_increase) ?? 0) > 0 ? 'text-red-400' : 'text-green-400'
          }>
            {fmtPctMaybeDecimal(merged.short_percent_increase)}
          </span>
        </div>
      )}

      {merged.date && (
        <div className="text-[8px] font-mono text-muted-foreground text-right">
          As of {merged.date}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/20 rounded p-1.5">
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-bold mt-0.5">{value}</div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Tab 2: Volume
// ──────────────────────────────────────────────────────────────────────
function VolumeTab({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR<{ data?: VolumeRow[] }>(
    ticker ? `/api/uw/stock/${ticker}/volume-and-ratio` : null,
    fetcher,
    { refreshInterval: 5 * 60_000, revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    return (data?.data ?? [])
      .slice()
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, 30)
  }, [data])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-red-400 px-3 text-center">
        Failed to load short volume
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
        No short volume history for {ticker}
      </div>
    )
  }

  // Compute max ratio so bars can be scaled.
  const maxRatio = Math.max(...rows.map(r => {
    const n = toNum(r.short_volume_ratio) ?? 0
    return Math.abs(n) <= 1 ? n * 100 : n
  }))

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-[10px] font-mono">
        <thead className="sticky top-0 bg-background border-b border-border/40">
          <tr className="text-[8px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left px-2 py-1 font-normal">Date</th>
            <th className="text-right px-1 py-1 font-normal">Short Vol</th>
            <th className="text-right px-1 py-1 font-normal">Total Vol</th>
            <th className="text-right px-2 py-1 font-normal">Ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const ratioRaw = toNum(row.short_volume_ratio) ?? 0
            const ratioPct = Math.abs(ratioRaw) <= 1 ? ratioRaw * 100 : ratioRaw
            const barWidth = maxRatio > 0 ? (ratioPct / maxRatio) * 100 : 0
            const barColor = ratioPct >= 50 ? 'bg-red-400/40' : ratioPct >= 35 ? 'bg-amber-400/40' : 'bg-muted-foreground/30'
            return (
              <tr key={row.date} className="border-b border-border/20">
                <td className="px-2 py-1 text-muted-foreground">{row.date}</td>
                <td className="px-1 py-1 text-right">{fmtNum(row.short_volume, { digits: 0 })}</td>
                <td className="px-1 py-1 text-right text-muted-foreground">{fmtNum(row.total_volume, { digits: 0 })}</td>
                <td className="px-2 py-1 text-right relative">
                  <div className={`absolute inset-y-0.5 left-0 right-0 rounded ${barColor}`} style={{ width: `${barWidth}%` }} />
                  <span className="relative">{ratioPct.toFixed(1)}%</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Tab 3: Screener
// ──────────────────────────────────────────────────────────────────────
function ScreenerTab() {
  const { data, error, isLoading } = useSWR<{ data?: ScreenerRow[] }>(
    '/api/uw/screener/short-screener',
    fetcher,
    { refreshInterval: 15 * 60_000, revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    return (data?.data ?? [])
      .slice()
      .sort((a, b) => {
        const ap = toNum(a.short_percent_of_float) ?? 0
        const bp = toNum(b.short_percent_of_float) ?? 0
        return Math.abs(bp) - Math.abs(ap)
      })
      .slice(0, 50)
  }, [data])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-red-400 px-3 text-center">
        Failed to load short screener
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
        No screener data
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-[10px] font-mono">
        <thead className="sticky top-0 bg-background border-b border-border/40">
          <tr className="text-[8px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left px-2 py-1 font-normal">Ticker</th>
            <th className="text-right px-1 py-1 font-normal">% Float</th>
            <th className="text-right px-1 py-1 font-normal">DTC</th>
            <th className="text-right px-2 py-1 font-normal">Mkt Cap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const t = row.ticker || row.symbol || ''
            const pf = toNum(row.short_percent_of_float)
            const pfPct = pf == null ? null : Math.abs(pf) <= 1 ? pf * 100 : pf
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
                <td className={`px-1 py-1 text-right font-bold ${
                  pfPct == null ? '' : pfPct >= 30 ? 'text-red-400' : pfPct >= 15 ? 'text-amber-400' : ''
                }`}>
                  {pfPct == null ? '—' : `${pfPct.toFixed(1)}%`}
                </td>
                <td className="px-1 py-1 text-right">{fmtNum(row.days_to_cover, { digits: 1 })}</td>
                <td className="px-2 py-1 text-right text-muted-foreground">{fmtMcap(row.market_cap)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Container
// ──────────────────────────────────────────────────────────────────────
export function ShortsProfile({ ticker }: { ticker: string }) {
  const tabs: TabbedWidgetTab[] = [
    {
      id: 'snapshot',
      label: 'Snapshot',
      icon: ShieldAlert,
      title: 'Current short interest, % of float, days to cover, fee, rebate',
      render: () => <SnapshotTab ticker={ticker} />,
    },
    {
      id: 'volume',
      label: 'Volume',
      icon: BarChart3,
      title: 'Daily short volume + ratio (last 30 days)',
      render: () => <VolumeTab ticker={ticker} />,
    },
    {
      id: 'screener',
      label: 'Screener',
      icon: ListFilter,
      title: 'Market-wide top short-interest names (heaviest shorts)',
      render: () => <ScreenerTab />,
    },
  ]

  return (
    <TabbedWidget
      title="Shorts"
      subtitle={ticker}
      icon={TrendingDown}
      iconColor="text-red-400"
      tabs={tabs}
    />
  )
}
