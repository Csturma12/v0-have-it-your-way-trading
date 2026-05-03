'use client'

/**
 * Stock Profile — Webull-style tabbed widget for per-ticker fundamentals.
 *
 * Phase 5 of the UW endpoint rollout. Consolidates four data slices that
 * are all "company-level reference data" into one box with tabs:
 *
 *   Snapshot   — wraps the existing Fundamentals widget (Polygon +
 *                Finnhub merge). Kept as-is so we don't break what works.
 *   Financials — /stock/{t}/financials. Quarterly income statement
 *                rows: revenue, gross profit, operating income, net
 *                income, EPS. Last 4 quarters with YoY deltas.
 *   Insider    — /stock/{t}/insider-buy-sells. Net insider activity
 *                by month + recent buy/sell rows. Honest about volume:
 *                a single CFO buy says more than 10 routine grants.
 *   Expiry     — /stock/{t}/expiry-breakdown. Options open interest
 *                grouped by expiration date. Shows where the gamma
 *                pile is concentrated for the current ticker.
 *
 * The pre-existing flat Fundamentals widget stays registered as
 * a separate option for users who don't want the tab UI.
 */

import { useMemo } from 'react'
import { Building2 } from 'lucide-react'
import useSWR from 'swr'
import { TabbedWidget } from './tabbed-widget'
import { Fundamentals } from './fundamentals'
import { WidgetEmptyState } from './widget-empty-state'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
})

// Compact number formatter — handles negatives and small numbers cleanly.
function fmtBig(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function pctColor(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  if (n > 0.5) return 'text-green-400'
  if (n < -0.5) return 'text-red-400'
  return 'text-muted-foreground'
}

// ─── Tab 2: Financials ──────────────────────────────────────────────
// UW returns rows like { period_of_report, total_revenue, gross_profit,
// operating_income, net_income, basic_eps, ... }. We compute YoY by
// comparing to the row 4 quarters back.
function FinancialsTab({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/uw/stock/${ticker}/financials` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    // Most recent first
    const sorted = [...raw].sort((a, b) =>
      String(b.period_of_report ?? '').localeCompare(String(a.period_of_report ?? ''))
    )
    return sorted.slice(0, 8).map((row, idx, arr) => {
      const yoyMatch = arr.find((r, i) => i > idx
        && String(r.period_of_report ?? '').slice(0, 4)
          === String((Number(String(row.period_of_report ?? '').slice(0, 4)) - 1)))
      const num = (k: string) => row[k] != null ? Number(row[k]) : null
      const yoyNum = (k: string) => yoyMatch?.[k] != null ? Number(yoyMatch[k]) : null
      const yoyPct = (k: string) => {
        const a = num(k), b = yoyNum(k)
        if (a == null || b == null || b === 0) return null
        return ((a - b) / Math.abs(b)) * 100
      }
      return {
        period: String(row.period_of_report ?? ''),
        revenue: num('total_revenue'),
        grossProfit: num('gross_profit'),
        opIncome: num('operating_income'),
        netIncome: num('net_income'),
        eps: num('basic_eps') ?? num('diluted_eps'),
        revYoY: yoyPct('total_revenue'),
        netYoY: yoyPct('net_income'),
      }
    })
  }, [data])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading financials…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message="Failed to load financials" />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No financials available" />
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-card border-b border-border/40">
          <tr className="text-muted-foreground uppercase tracking-wider text-[8px]">
            <th className="text-left px-2 py-1">Period</th>
            <th className="text-right px-1 py-1">Revenue</th>
            <th className="text-right px-1 py-1">YoY</th>
            <th className="text-right px-1 py-1">Net Inc</th>
            <th className="text-right px-1 py-1">YoY</th>
            <th className="text-right px-2 py-1">EPS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.period + i} className="border-b border-border/20 hover:bg-muted/20">
              <td className="text-left px-2 py-1 text-muted-foreground">{r.period}</td>
              <td className="text-right px-1 py-1">{fmtBig(r.revenue)}</td>
              <td className={`text-right px-1 py-1 ${pctColor(r.revYoY)}`}>{fmtPct(r.revYoY)}</td>
              <td className="text-right px-1 py-1">{fmtBig(r.netIncome)}</td>
              <td className={`text-right px-1 py-1 ${pctColor(r.netYoY)}`}>{fmtPct(r.netYoY)}</td>
              <td className="text-right px-2 py-1 font-bold">
                {r.eps != null ? `$${r.eps.toFixed(2)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab 3: Insider ──────────────────────────────────────────────────
// UW's insider-buy-sells endpoint returns aggregated monthly counts +
// dollar values. Net = buy_value - sell_value. Honest about the noise:
// most insider sales are scheduled grants (10b5-1) and aren't signal.
function InsiderTab({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/uw/stock/${ticker}/insider-buy-sells` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    return raw.slice(0, 12).map((r: any) => {
      const buyValue = Number(r.purchases_value ?? r.buy_value ?? 0)
      const sellValue = Number(r.sales_value ?? r.sell_value ?? 0)
      const buyCount = Number(r.purchases ?? r.buy_count ?? 0)
      const sellCount = Number(r.sales ?? r.sell_count ?? 0)
      const net = buyValue - sellValue
      return {
        date: String(r.filing_date ?? r.date ?? r.month ?? ''),
        buyValue, sellValue, buyCount, sellCount, net,
      }
    })
  }, [data])

  // Aggregate top-of-page summary
  const summary = useMemo(() => {
    if (!rows.length) return null
    const totalBuys = rows.reduce((s, r) => s + r.buyValue, 0)
    const totalSells = rows.reduce((s, r) => s + r.sellValue, 0)
    return { totalBuys, totalSells, net: totalBuys - totalSells }
  }, [rows])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading insider data…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message="Failed to load insider data" />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No insider activity" />
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary card */}
      {summary && (
        <div className="grid grid-cols-3 gap-1 p-1.5 border-b border-border/30 text-[9px] font-mono flex-shrink-0">
          <div className="bg-muted/30 rounded p-1">
            <div className="text-[8px] uppercase text-muted-foreground">Buys</div>
            <div className="text-green-400 font-bold">{fmtBig(summary.totalBuys)}</div>
          </div>
          <div className="bg-muted/30 rounded p-1">
            <div className="text-[8px] uppercase text-muted-foreground">Sells</div>
            <div className="text-red-400 font-bold">{fmtBig(summary.totalSells)}</div>
          </div>
          <div className="bg-muted/30 rounded p-1">
            <div className="text-[8px] uppercase text-muted-foreground">Net</div>
            <div className={`font-bold ${summary.net > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtBig(summary.net)}
            </div>
          </div>
        </div>
      )}

      {/* Detail rows */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-card border-b border-border/40">
            <tr className="text-muted-foreground uppercase tracking-wider text-[8px]">
              <th className="text-left px-2 py-1">Period</th>
              <th className="text-right px-1 py-1">Buys</th>
              <th className="text-right px-1 py-1">Sells</th>
              <th className="text-right px-2 py-1">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.date + i} className="border-b border-border/20 hover:bg-muted/20">
                <td className="text-left px-2 py-1 text-muted-foreground">{r.date}</td>
                <td className="text-right px-1 py-1 text-green-400">{fmtBig(r.buyValue)}</td>
                <td className="text-right px-1 py-1 text-red-400">{fmtBig(r.sellValue)}</td>
                <td className={`text-right px-2 py-1 font-bold ${r.net > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmtBig(r.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-2 py-1 text-[8px] text-muted-foreground italic">
          Note: most insider sales are pre-scheduled (10b5-1). Net buys are stronger signal.
        </div>
      </div>
    </div>
  )
}

// ─── Tab 4: Expiry Breakdown ────────────────────────────────────────
// Options open interest grouped by expiration. Reveals where the
// dealer/gamma exposure is concentrated.
function ExpiryTab({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/uw/stock/${ticker}/expiry-breakdown` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    const parsed = raw.map((r: any) => ({
      expiry: String(r.expiry ?? ''),
      callOI: Number(r.call_open_interest ?? r.call_oi ?? 0),
      putOI: Number(r.put_open_interest ?? r.put_oi ?? 0),
      callVolume: Number(r.call_volume ?? 0),
      putVolume: Number(r.put_volume ?? 0),
    }))
    return parsed.sort((a, b) => a.expiry.localeCompare(b.expiry)).slice(0, 20)
  }, [data])

  // For visual bars
  const maxOI = useMemo(() => {
    return rows.reduce((m, r) => Math.max(m, r.callOI + r.putOI), 0)
  }, [rows])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading expiry breakdown…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message="Failed to load expiry breakdown" />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No expiry data" />
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-card border-b border-border/40">
          <tr className="text-muted-foreground uppercase tracking-wider text-[8px]">
            <th className="text-left px-2 py-1">Expiry</th>
            <th className="text-right px-1 py-1">Call OI</th>
            <th className="text-right px-1 py-1">Put OI</th>
            <th className="px-1 py-1">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const total = r.callOI + r.putOI
            const callPct = total > 0 ? (r.callOI / total) * 100 : 0
            const widthPct = maxOI > 0 ? (total / maxOI) * 100 : 0
            return (
              <tr key={r.expiry + i} className="border-b border-border/20 hover:bg-muted/20">
                <td className="text-left px-2 py-1 text-muted-foreground">{r.expiry}</td>
                <td className="text-right px-1 py-1 text-green-400">
                  {(r.callOI / 1000).toFixed(0)}K
                </td>
                <td className="text-right px-1 py-1 text-red-400">
                  {(r.putOI / 1000).toFixed(0)}K
                </td>
                <td className="px-1 py-1 w-32">
                  <div className="relative h-2 bg-muted/30 rounded overflow-hidden" style={{ width: `${widthPct}%` }}>
                    <div
                      className="absolute left-0 top-0 h-full bg-green-500/60"
                      style={{ width: `${callPct}%` }}
                    />
                    <div
                      className="absolute right-0 top-0 h-full bg-red-500/60"
                      style={{ width: `${100 - callPct}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main widget ────────────────────────────────────────────────────
export function StockProfile({ ticker }: { ticker: string }) {
  // TabbedWidget expects `render: () => ReactNode` (not `content`).
  // Lazy render means the tab body only mounts on first activation.
  const tabs = [
    { id: 'snapshot',   label: 'Snapshot',   render: () => <Fundamentals ticker={ticker} /> },
    { id: 'financials', label: 'Financials', render: () => <FinancialsTab ticker={ticker} /> },
    { id: 'insider',    label: 'Insider',    render: () => <InsiderTab ticker={ticker} /> },
    { id: 'expiry',     label: 'Expiry',     render: () => <ExpiryTab ticker={ticker} /> },
  ]

  return (
    <TabbedWidget
      title="Stock Profile"
      icon={Building2}
      iconColor="text-cyan-400"
      subtitle={ticker}
      tabs={tabs}
    />
  )
}
