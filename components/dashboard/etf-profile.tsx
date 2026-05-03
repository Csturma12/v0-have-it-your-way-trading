'use client'

/**
 * ETF Profile — Webull-style tabbed widget for ETF analysis.
 *
 * Phase 6 of the UW endpoint rollout. When the selected ticker is an
 * ETF, this widget surfaces the four UW endpoints that describe what's
 * inside it and money flow:
 *
 *   Info       — /etfs/{t}/info. Description, AUM, expense ratio,
 *                inception, dividend yield. The "what is this thing"
 *                tab.
 *   Holdings   — /etfs/{t}/holdings. Top constituent stocks with
 *                weights. Sorted by weight desc, top 25.
 *   Exposure   — /etfs/{t}/exposure. Sector / industry / country
 *                breakdown.
 *   Flows      — /etfs/{t}/in-out-flow. Money in/out by day. Reveals
 *                whether smart money is accumulating or distributing.
 *
 * If the ticker is not an ETF (UW returns empty/404), each tab shows
 * a friendly empty state instead of breaking. We don't try to detect
 * ETF-ness up front — we just let each endpoint speak for itself.
 */

import { useMemo } from 'react'
import { Layers } from 'lucide-react'
import useSWR from 'swr'
import { TabbedWidget } from './tabbed-widget'
import { WidgetEmptyState } from './widget-empty-state'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json()
  })

function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(digits)}%`
}

function fmtBig(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

// ─── Tab 1: Info ────────────────────────────────────────────────────
function InfoTab({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/uw/etfs/${ticker}/info` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const info = data?.data ?? data ?? null

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message={`${ticker} may not be an ETF`} />
  }
  if (!info || (Array.isArray(info) && info.length === 0)) {
    return <WidgetEmptyState type="no-data" message={`${ticker} is not an ETF`} />
  }

  // UW sometimes wraps in array
  const i = Array.isArray(info) ? info[0] : info

  // Pull common fields — UW field names vary by endpoint version
  const name = i.name ?? i.full_name ?? i.short_name ?? ticker
  const description = i.description ?? null
  const aum = i.aum ?? i.assets_under_management ?? null
  const expenseRatio = i.expense_ratio ?? i.gross_expense_ratio ?? null
  const inception = i.inception_date ?? null
  const dividend = i.dividend_yield ?? null
  const issuer = i.issuer ?? i.brand ?? null
  const category = i.category ?? i.sector ?? null
  const exchange = i.exchange ?? i.primary_exchange ?? null

  return (
    <div className="overflow-auto h-full p-2 text-[9px] font-mono space-y-1.5">
      <div>
        <div className="text-[8px] uppercase text-muted-foreground tracking-wider">Name</div>
        <div className="font-bold">{name}</div>
      </div>
      {description && (
        <div>
          <div className="text-[8px] uppercase text-muted-foreground tracking-wider">Description</div>
          <div className="text-muted-foreground leading-snug">{description}</div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <Stat label="AUM" value={fmtBig(Number(aum))} />
        <Stat label="Expense" value={expenseRatio != null ? fmtPct(Number(expenseRatio) * (Number(expenseRatio) < 1 ? 100 : 1)) : '—'} />
        <Stat label="Div Yield" value={dividend != null ? fmtPct(Number(dividend) * (Number(dividend) < 1 ? 100 : 1)) : '—'} />
        <Stat label="Inception" value={inception ?? '—'} />
        <Stat label="Issuer" value={issuer ?? '—'} />
        <Stat label="Category" value={category ?? '—'} />
        <Stat label="Exchange" value={exchange ?? '—'} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded p-1">
      <div className="text-[8px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="font-bold truncate">{value}</div>
    </div>
  )
}

// ─── Tab 2: Holdings ────────────────────────────────────────────────
function HoldingsTab({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/uw/etfs/${ticker}/holdings` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .map((r: any) => ({
        symbol: String(r.ticker ?? r.symbol ?? ''),
        name: String(r.name ?? r.security_name ?? ''),
        weight: Number(r.weight ?? r.percent_of_fund ?? 0),
        shares: Number(r.shares ?? r.shares_held ?? 0),
        value: Number(r.market_value ?? r.value ?? 0),
      }))
      .filter(r => r.symbol)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 25)
  }, [data])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message={`${ticker} may not be an ETF`} />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No holdings data" />
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-card border-b border-border/40">
          <tr className="text-muted-foreground uppercase tracking-wider text-[8px]">
            <th className="text-left px-2 py-1">Symbol</th>
            <th className="text-left px-1 py-1">Name</th>
            <th className="text-right px-2 py-1">Weight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            // Visual bar showing weight relative to top holding
            const topWeight = rows[0]?.weight ?? 1
            const barWidth = topWeight > 0 ? (r.weight / topWeight) * 100 : 0
            return (
              <tr key={r.symbol + i} className="border-b border-border/20 hover:bg-muted/20 relative">
                <td className="text-left px-2 py-1 font-bold text-cyan-400">{r.symbol}</td>
                <td className="text-left px-1 py-1 text-muted-foreground truncate max-w-[140px]" title={r.name}>
                  {r.name}
                </td>
                <td className="text-right px-2 py-1 relative">
                  <div
                    className="absolute inset-y-0 right-0 bg-cyan-500/20 rounded"
                    style={{ width: `${barWidth}%` }}
                  />
                  <span className="relative font-bold">{fmtPct(r.weight, 2)}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab 3: Exposure ─────────────────────────────────────────────────
function ExposureTab({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/uw/etfs/${ticker}/exposure` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .map((r: any) => ({
        category: String(r.sector ?? r.industry ?? r.category ?? r.country ?? r.name ?? ''),
        weight: Number(r.weight ?? r.percent ?? r.exposure ?? 0),
      }))
      .filter(r => r.category)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20)
  }, [data])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message={`${ticker} may not be an ETF`} />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No exposure data" />
  }

  const max = rows[0]?.weight ?? 1

  return (
    <div className="overflow-auto h-full p-1.5 space-y-0.5">
      {rows.map((r, i) => {
        const barWidth = max > 0 ? (r.weight / max) * 100 : 0
        return (
          <div key={r.category + i} className="text-[9px] font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground truncate" title={r.category}>{r.category}</span>
              <span className="font-bold">{fmtPct(r.weight)}</span>
            </div>
            <div className="h-1 bg-muted/30 rounded overflow-hidden mt-0.5">
              <div className="h-full bg-cyan-500/60" style={{ width: `${barWidth}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab 4: Flows ────────────────────────────────────────────────────
function FlowsTab({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/uw/etfs/${ticker}/in-out-flow` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .map((r: any) => ({
        date: String(r.date ?? r.timestamp ?? ''),
        flow: Number(r.net_flow ?? r.flow ?? r.in_out_flow ?? 0),
      }))
      .filter(r => r.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
  }, [data])

  // Aggregate stats
  const summary = useMemo(() => {
    if (!rows.length) return null
    const total = rows.reduce((s, r) => s + r.flow, 0)
    const positive = rows.filter(r => r.flow > 0).length
    return { total, positive, days: rows.length }
  }, [rows])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message={`${ticker} may not be an ETF`} />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No flow data" />
  }

  const maxAbs = Math.max(...rows.map(r => Math.abs(r.flow)), 1)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {summary && (
        <div className="grid grid-cols-2 gap-1 p-1.5 border-b border-border/30 text-[9px] font-mono flex-shrink-0">
          <div className="bg-muted/30 rounded p-1">
            <div className="text-[8px] uppercase text-muted-foreground">{summary.days}D Net</div>
            <div className={`font-bold ${summary.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtBig(summary.total)}
            </div>
          </div>
          <div className="bg-muted/30 rounded p-1">
            <div className="text-[8px] uppercase text-muted-foreground">Inflow Days</div>
            <div className="font-bold">
              {summary.positive} / {summary.days}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-auto flex-1">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-card border-b border-border/40">
            <tr className="text-muted-foreground uppercase tracking-wider text-[8px]">
              <th className="text-left px-2 py-1">Date</th>
              <th className="text-right px-1 py-1">Flow</th>
              <th className="px-1 py-1">Bar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = (Math.abs(r.flow) / maxAbs) * 100
              const isPos = r.flow >= 0
              return (
                <tr key={r.date + i} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="text-left px-2 py-1 text-muted-foreground">{r.date}</td>
                  <td className={`text-right px-1 py-1 font-bold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                    {fmtBig(r.flow)}
                  </td>
                  <td className="px-1 py-1 w-24">
                    {/* Centered bar — green right of axis, red left */}
                    <div className="relative h-1.5 w-full">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50" />
                      <div
                        className={`absolute top-0 h-full ${isPos ? 'bg-green-500/60 left-1/2' : 'bg-red-500/60 right-1/2'}`}
                        style={{ width: `${pct / 2}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────
export function ETFProfile({ ticker }: { ticker: string }) {
  const tabs = [
    { id: 'info',      label: 'Info',      render: () => <InfoTab ticker={ticker} /> },
    { id: 'holdings',  label: 'Holdings',  render: () => <HoldingsTab ticker={ticker} /> },
    { id: 'exposure',  label: 'Exposure',  render: () => <ExposureTab ticker={ticker} /> },
    { id: 'flows',     label: 'Flows',     render: () => <FlowsTab ticker={ticker} /> },
  ]

  return (
    <TabbedWidget
      title="ETF Profile"
      icon={Layers}
      iconColor="text-cyan-400"
      subtitle={ticker}
      tabs={tabs}
    />
  )
}
