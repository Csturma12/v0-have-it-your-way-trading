'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Waves, Layers, PieChart, Network, ArrowDown, ArrowUp } from 'lucide-react'
import { TabbedWidget, TabbedWidgetTab } from './tabbed-widget'

/**
 * Market Flow — UW Phase 4.
 *
 * Tabs:
 *   - Greek Flow   — per-ticker net delta/gamma/vega flow split call vs put.
 *                    Merges /stock/{t}/greek-flow + /stock/{t}/greek-flow/expiry
 *                    behind one expiry selector (per user note "merge greek-flow
 *                    into one method").
 *   - Sector Tide  — market-wide sector-level options flow tide (net premium
 *                    by sector). /market/sector-tide
 *   - ETF Tide     — same idea but bucketed by ETF. /market/etf-tide
 *   - Correlations — market correlation grid grouped with darkpool theme
 *                    (per user note). /market/correlations
 *
 * Greek Flow tab uses selectedTicker. Other tabs are market-wide and
 * ignore it — but the widget header shows ticker as subtitle since
 * users will likely view this widget alongside their selected name.
 */

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

function fmtSigned(n: number | null, opts?: { prefix?: string; digits?: number }): string {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : '-'
  const abs = Math.abs(n)
  let formatted: string
  if (abs >= 1e9) formatted = `${(abs / 1e9).toFixed(opts?.digits ?? 2)}B`
  else if (abs >= 1e6) formatted = `${(abs / 1e6).toFixed(opts?.digits ?? 2)}M`
  else if (abs >= 1e3) formatted = `${(abs / 1e3).toFixed(opts?.digits ?? 1)}K`
  else formatted = abs.toFixed(opts?.digits ?? 2)
  return `${sign}${opts?.prefix ?? ''}${formatted}`
}

// ──────────────────────────────────────────────────────────────────────
// Tab 1: Greek Flow
// ──────────────────────────────────────────────────────────────────────
interface GreekFlowRow {
  expiration?: string
  expiry?: string
  call_delta_flow?: string | number
  call_gamma_flow?: string | number
  call_vega_flow?: string | number
  call_theta_flow?: string | number
  put_delta_flow?: string | number
  put_gamma_flow?: string | number
  put_vega_flow?: string | number
  put_theta_flow?: string | number
  net_delta_flow?: string | number
  net_gamma_flow?: string | number
  timestamp?: string
}

function GreekFlowTab({ ticker }: { ticker: string }) {
  // 'all' = aggregate /stock/{t}/greek-flow
  // expiry-specific = /stock/{t}/greek-flow/{expiry}
  const [expiry, setExpiry] = useState<'all' | string>('all')

  const url = ticker
    ? expiry === 'all'
      ? `/api/uw/stock/${ticker}/greek-flow`
      : `/api/uw/stock/${ticker}/greek-flow/${expiry}`
    : null

  const { data, error, isLoading } = useSWR<{ data?: GreekFlowRow[] }>(
    url,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  )

  // Latest aggregate row + list of distinct expiries (when in 'all' mode)
  const { latest, expiries } = useMemo(() => {
    const rows = data?.data ?? []
    if (rows.length === 0) return { latest: null, expiries: [] as string[] }
    // Latest by timestamp if present, else last row
    const sorted = [...rows].sort((a, b) =>
      (b.timestamp ?? '').localeCompare(a.timestamp ?? '')
    )
    const latest = sorted[0]
    const expiries = Array.from(
      new Set(rows.map(r => r.expiration ?? r.expiry).filter((e): e is string => Boolean(e)))
    ).sort()
    return { latest, expiries }
  }, [data])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-red-400 px-3 text-center">
        Failed to load greek flow
      </div>
    )
  }

  if (!ticker) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground px-3 text-center">
        No ticker selected
      </div>
    )
  }

  if (isLoading && !latest) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!latest) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground px-3 text-center">
        No greek flow for {ticker}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-2 space-y-2">
      {/* Expiry selector — merges /greek-flow + /greek-flow/{expiry} */}
      {expiries.length > 0 && (
        <div className="flex items-center gap-1 text-[9px] font-mono">
          <span className="text-muted-foreground uppercase tracking-wider">Expiry:</span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="bg-muted/30 border border-border/50 rounded px-1.5 py-0.5 text-[10px]"
          >
            <option value="all">All</option>
            {expiries.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      )}

      {/* Call vs Put greek table */}
      <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
        <div /> {/* spacer */}
        <div className="text-center text-green-400 uppercase tracking-wider text-[8px] font-bold">Calls</div>
        <div className="text-center text-red-400 uppercase tracking-wider text-[8px] font-bold">Puts</div>

        {(['delta', 'gamma', 'vega', 'theta'] as const).map(g => {
          const callVal = toNum((latest as any)[`call_${g}_flow`])
          const putVal = toNum((latest as any)[`put_${g}_flow`])
          return (
            <FlowGreekRow key={g} label={g} call={callVal} put={putVal} />
          )
        })}
      </div>

      {/* Net summary */}
      {(latest.net_delta_flow != null || latest.net_gamma_flow != null) && (
        <div className="bg-muted/20 rounded p-2 space-y-1 text-[10px] font-mono">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Net Flow</div>
          {latest.net_delta_flow != null && (
            <div className="flex justify-between">
              <span>Δ Delta</span>
              <NetValue n={toNum(latest.net_delta_flow)} />
            </div>
          )}
          {latest.net_gamma_flow != null && (
            <div className="flex justify-between">
              <span>Γ Gamma</span>
              <NetValue n={toNum(latest.net_gamma_flow)} />
            </div>
          )}
        </div>
      )}

      {latest.timestamp && (
        <div className="text-[8px] font-mono text-muted-foreground text-right">
          {new Date(latest.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  )
}

function FlowGreekRow({ label, call, put }: { label: string; call: number | null; put: number | null }) {
  const greek = label.charAt(0).toUpperCase() + label.slice(1)
  return (
    <>
      <div className="text-muted-foreground uppercase tracking-wider text-[8px] flex items-center">
        {greek}
      </div>
      <div className={`text-center font-bold ${call == null ? 'text-muted-foreground' : call >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {fmtSigned(call)}
      </div>
      <div className={`text-center font-bold ${put == null ? 'text-muted-foreground' : put >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {fmtSigned(put)}
      </div>
    </>
  )
}

function NetValue({ n }: { n: number | null }) {
  if (n == null) return <span className="text-muted-foreground">—</span>
  return (
    <span className={`font-bold ${n >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {n >= 0 ? <ArrowUp className="w-2.5 h-2.5 inline" /> : <ArrowDown className="w-2.5 h-2.5 inline" />}
      {fmtSigned(n)}
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Tab 2: Sector Tide
// ──────────────────────────────────────────────────────────────────────
interface TideRow {
  sector?: string
  etf?: string
  symbol?: string
  ticker?: string
  net_call_premium?: string | number
  net_put_premium?: string | number
  net_premium?: string | number
  call_volume?: string | number
  put_volume?: string | number
  timestamp?: string
}

function TideTab({ endpoint, labelKey, emptyLabel }: { endpoint: string; labelKey: 'sector' | 'etf' | 'ticker'; emptyLabel: string }) {
  const { data, error, isLoading } = useSWR<{ data?: TideRow[] }>(
    endpoint,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  )

  // Aggregate by label, take latest per group
  const aggregated = useMemo(() => {
    const rows = data?.data ?? []
    const map = new Map<string, TideRow>()
    for (const r of rows) {
      const key =
        labelKey === 'sector' ? r.sector :
        labelKey === 'etf' ? (r.etf ?? r.symbol ?? r.ticker) :
        (r.ticker ?? r.symbol)
      if (!key) continue
      const existing = map.get(key)
      if (!existing || (r.timestamp ?? '') > (existing.timestamp ?? '')) {
        map.set(key, r)
      }
    }
    const arr = [...map.entries()].map(([label, row]) => {
      const callPrem = toNum(row.net_call_premium) ?? 0
      const putPrem = toNum(row.net_put_premium) ?? 0
      const net = toNum(row.net_premium) ?? (callPrem - putPrem)
      return { label, callPrem, putPrem, net, row }
    })
    return arr.sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 30)
  }, [data, labelKey])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-red-400 px-3 text-center">
        Failed to load tide
      </div>
    )
  }

  if (isLoading && aggregated.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (aggregated.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground px-3 text-center">
        {emptyLabel}
      </div>
    )
  }

  // Symmetric scale for the bar based on the largest absolute net value
  const maxAbs = Math.max(...aggregated.map(a => Math.abs(a.net)))

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-[10px] font-mono">
        <thead className="sticky top-0 bg-background border-b border-border/40">
          <tr className="text-[8px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left px-2 py-1 font-normal">{labelKey}</th>
            <th className="text-right px-1 py-1 font-normal">Calls $</th>
            <th className="text-right px-1 py-1 font-normal">Puts $</th>
            <th className="text-right px-2 py-1 font-normal">Net</th>
          </tr>
        </thead>
        <tbody>
          {aggregated.map(({ label, callPrem, putPrem, net }) => {
            const barWidth = maxAbs > 0 ? Math.min(100, (Math.abs(net) / maxAbs) * 100) : 0
            const isBullish = net >= 0
            return (
              <tr key={label} className="border-b border-border/20 hover:bg-muted/20">
                <td className="px-2 py-1 font-bold">{label}</td>
                <td className="px-1 py-1 text-right text-green-400/80">{fmtSigned(callPrem, { prefix: '$' })}</td>
                <td className="px-1 py-1 text-right text-red-400/80">{fmtSigned(putPrem, { prefix: '$' })}</td>
                <td className="px-2 py-1 text-right relative">
                  <div
                    className={`absolute inset-y-0.5 rounded ${isBullish ? 'bg-green-400/30 right-1/2' : 'bg-red-400/30 left-1/2'}`}
                    style={{ width: `${barWidth / 2}%` }}
                  />
                  <span className={`relative font-bold ${isBullish ? 'text-green-400' : 'text-red-400'}`}>
                    {fmtSigned(net, { prefix: '$' })}
                  </span>
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
// Tab 4: Correlations
// ──────────────────────────────────────────────────────────────────────
interface CorrelationRow {
  ticker?: string
  symbol?: string
  pair?: string
  correlation?: string | number
  rolling_correlation?: string | number
  beta?: string | number
}

function CorrelationsTab({ ticker }: { ticker: string }) {
  // Symbol-aware if ticker present (correlations TO that ticker), else market grid.
  const url = ticker
    ? `/api/uw/market/correlations?ticker=${ticker}`
    : '/api/uw/market/correlations'

  const { data, error, isLoading } = useSWR<{ data?: CorrelationRow[] }>(
    url,
    fetcher,
    { refreshInterval: 5 * 60_000, revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const list = data?.data ?? []
    return [...list]
      .map(r => ({
        ...r,
        _corr: toNum(r.correlation ?? r.rolling_correlation) ?? 0,
        _label: r.pair ?? r.ticker ?? r.symbol ?? '',
      }))
      .filter(r => r._label && Math.abs(r._corr) > 0)
      .sort((a, b) => Math.abs(b._corr) - Math.abs(a._corr))
      .slice(0, 30)
  }, [data])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] font-mono text-red-400 px-3 text-center">
        Failed to load correlations
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
        No correlation data
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-[10px] font-mono">
        <thead className="sticky top-0 bg-background border-b border-border/40">
          <tr className="text-[8px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left px-2 py-1 font-normal">Pair</th>
            <th className="text-right px-2 py-1 font-normal">Corr</th>
            <th className="text-right px-2 py-1 font-normal">β</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const corr = r._corr
            // Map correlation [-1, 1] to color intensity; positive = green, negative = red
            const intensity = Math.min(1, Math.abs(corr))
            const colorClass =
              corr >= 0.7 ? 'text-green-400' :
              corr >= 0.3 ? 'text-green-400/70' :
              corr <= -0.7 ? 'text-red-400' :
              corr <= -0.3 ? 'text-red-400/70' :
              'text-muted-foreground'
            return (
              <tr key={`${r._label}-${i}`} className="border-b border-border/20 hover:bg-muted/20">
                <td className="px-2 py-1 font-bold">{r._label}</td>
                <td className={`px-2 py-1 text-right font-bold relative ${colorClass}`}>
                  <div
                    className={`absolute inset-y-0.5 right-1 rounded ${corr >= 0 ? 'bg-green-400/15' : 'bg-red-400/15'}`}
                    style={{ width: `${intensity * 50}%` }}
                  />
                  <span className="relative">{corr.toFixed(2)}</span>
                </td>
                <td className="px-2 py-1 text-right text-muted-foreground">
                  {r.beta == null ? '—' : (toNum(r.beta) ?? 0).toFixed(2)}
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
// Container
// ──────────────────────────────────────────────────────────────────────
export function MarketFlow({ ticker }: { ticker: string }) {
  const tabs: TabbedWidgetTab[] = [
    {
      id: 'greek',
      label: 'Greek Flow',
      icon: Waves,
      title: 'Per-ticker call/put greek flow with optional expiry filter',
      render: () => <GreekFlowTab ticker={ticker} />,
    },
    {
      id: 'sector',
      label: 'Sector Tide',
      icon: Layers,
      title: 'Market-wide net call/put premium by sector',
      render: () => (
        <TideTab
          endpoint="/api/uw/market/sector-tide"
          labelKey="sector"
          emptyLabel="No sector tide data"
        />
      ),
    },
    {
      id: 'etf',
      label: 'ETF Tide',
      icon: PieChart,
      title: 'Market-wide net call/put premium by ETF',
      render: () => (
        <TideTab
          endpoint="/api/uw/market/etf-tide"
          labelKey="etf"
          emptyLabel="No ETF tide data"
        />
      ),
    },
    {
      id: 'correlations',
      label: 'Correlations',
      icon: Network,
      title: 'Top correlated/anti-correlated names (per user note: grouped with darkpool theme)',
      render: () => <CorrelationsTab ticker={ticker} />,
    },
  ]

  return (
    <TabbedWidget
      title="Market Flow"
      subtitle={ticker}
      icon={Waves}
      iconColor="text-blue-400"
      tabs={tabs}
    />
  )
}
