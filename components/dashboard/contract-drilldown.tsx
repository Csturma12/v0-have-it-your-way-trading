'use client'

/**
 * Contract Drilldown — Webull-style tabbed widget for a SINGLE option
 * contract.
 *
 * Phase 7 (final) of the UW endpoint rollout. Unlike the other
 * tabbed widgets which take a stock ticker, this one operates on a
 * fully-specified option contract identifier (e.g. AAPL250620C00200000).
 *
 * UX:
 *   - Header has a small input field where the user pastes/types a
 *     contract symbol. The four tabs only fetch once a contract is set.
 *   - Empty state shows a brief example of valid format.
 *   - LocalStorage remembers the last contract so users don't re-type
 *     across sessions.
 *
 * Tabs (all on /option-contract/{id}/*):
 *   Flow      — recent live flow trades on this exact contract
 *   Historic  — daily OHLC + IV history
 *   Intraday  — intraday tape (1-min snapshot)
 *   Profile   — volume profile by price level for this contract
 */

import { useEffect, useMemo, useState } from 'react'
import { Crosshair, X } from 'lucide-react'
import useSWR from 'swr'
import { TabbedWidget } from './tabbed-widget'
import { WidgetEmptyState } from './widget-empty-state'

const STORAGE_KEY = 'v0-contract-drilldown-last'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json()
  })

// Loose validation — UW accepts OCC-style symbols. We only check basic
// shape so users can paste from anywhere and get reasonable errors.
function isValidContract(s: string): boolean {
  if (!s) return false
  // Must be 18-22 chars, contain a 'C' or 'P' separator
  return /^[A-Z]{1,6}\d{6}[CP]\d{8}$/.test(s.trim().toUpperCase())
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `$${n.toFixed(2)}`
}

// ─── Tab 1: Flow ────────────────────────────────────────────────────
function FlowTab({ contractId }: { contractId: string }) {
  const { data, error, isLoading } = useSWR(
    contractId ? `/api/uw/option-contract/${contractId}/flow` : null,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    return raw.slice(0, 50).map((r: any) => ({
      time: String(r.executed_at ?? r.timestamp ?? ''),
      side: String(r.side ?? r.sentiment ?? '').toUpperCase(),
      premium: Number(r.premium ?? r.total_premium ?? 0),
      size: Number(r.size ?? r.volume ?? 0),
      price: Number(r.price ?? 0),
    }))
  }, [data])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading flow…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message="Failed to load flow" />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No flow on this contract" />
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-card border-b border-border/40">
          <tr className="text-muted-foreground uppercase tracking-wider text-[8px]">
            <th className="text-left px-2 py-1">Time</th>
            <th className="text-left px-1 py-1">Side</th>
            <th className="text-right px-1 py-1">Size</th>
            <th className="text-right px-1 py-1">Price</th>
            <th className="text-right px-2 py-1">Premium</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const sideColor =
              r.side.includes('BUY') || r.side === 'BULL'
                ? 'text-green-400'
                : r.side.includes('SELL') || r.side === 'BEAR'
                  ? 'text-red-400'
                  : 'text-muted-foreground'
            return (
              <tr key={r.time + i} className="border-b border-border/20 hover:bg-muted/20">
                <td className="text-left px-2 py-1 text-muted-foreground">
                  {r.time.split('T')[1]?.slice(0, 8) ?? r.time}
                </td>
                <td className={`text-left px-1 py-1 font-bold ${sideColor}`}>{r.side}</td>
                <td className="text-right px-1 py-1">{fmtNum(r.size)}</td>
                <td className="text-right px-1 py-1">{fmtPrice(r.price)}</td>
                <td className="text-right px-2 py-1 font-bold">{fmtNum(r.premium)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab 2: Historic ────────────────────────────────────────────────
function HistoricTab({ contractId }: { contractId: string }) {
  const { data, error, isLoading } = useSWR(
    contractId ? `/api/uw/option-contract/${contractId}/historic` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .map((r: any) => ({
        date: String(r.date ?? r.timestamp ?? ''),
        open: Number(r.open ?? 0),
        high: Number(r.high ?? 0),
        low: Number(r.low ?? 0),
        close: Number(r.close ?? 0),
        volume: Number(r.volume ?? 0),
        iv: r.iv != null ? Number(r.iv) : null,
        oi: r.open_interest != null ? Number(r.open_interest) : null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
  }, [data])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading history…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message="Failed to load history" />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No historical data" />
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-card border-b border-border/40">
          <tr className="text-muted-foreground uppercase tracking-wider text-[8px]">
            <th className="text-left px-2 py-1">Date</th>
            <th className="text-right px-1 py-1">O</th>
            <th className="text-right px-1 py-1">H</th>
            <th className="text-right px-1 py-1">L</th>
            <th className="text-right px-1 py-1">C</th>
            <th className="text-right px-1 py-1">Vol</th>
            <th className="text-right px-2 py-1">IV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isUp = r.close >= r.open
            return (
              <tr key={r.date + i} className="border-b border-border/20 hover:bg-muted/20">
                <td className="text-left px-2 py-1 text-muted-foreground">{r.date}</td>
                <td className="text-right px-1 py-1">{r.open.toFixed(2)}</td>
                <td className="text-right px-1 py-1">{r.high.toFixed(2)}</td>
                <td className="text-right px-1 py-1">{r.low.toFixed(2)}</td>
                <td className={`text-right px-1 py-1 font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {r.close.toFixed(2)}
                </td>
                <td className="text-right px-1 py-1">{fmtNum(r.volume)}</td>
                <td className="text-right px-2 py-1">
                  {r.iv != null ? `${(r.iv * 100).toFixed(0)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab 3: Intraday ─────────────────────────────────────────────────
function IntradayTab({ contractId }: { contractId: string }) {
  const { data, error, isLoading } = useSWR(
    contractId ? `/api/uw/option-contract/${contractId}/intraday` : null,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .map((r: any) => ({
        time: String(r.timestamp ?? r.time ?? ''),
        price: Number(r.price ?? r.close ?? 0),
        volume: Number(r.volume ?? 0),
        oi: r.open_interest != null ? Number(r.open_interest) : null,
        iv: r.iv != null ? Number(r.iv) : null,
      }))
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 50)
  }, [data])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading intraday…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message="Failed to load intraday" />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No intraday data" />
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-card border-b border-border/40">
          <tr className="text-muted-foreground uppercase tracking-wider text-[8px]">
            <th className="text-left px-2 py-1">Time</th>
            <th className="text-right px-1 py-1">Price</th>
            <th className="text-right px-1 py-1">Vol</th>
            <th className="text-right px-1 py-1">OI</th>
            <th className="text-right px-2 py-1">IV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.time + i} className="border-b border-border/20 hover:bg-muted/20">
              <td className="text-left px-2 py-1 text-muted-foreground">
                {r.time.split('T')[1]?.slice(0, 8) ?? r.time}
              </td>
              <td className="text-right px-1 py-1 font-bold">{fmtPrice(r.price)}</td>
              <td className="text-right px-1 py-1">{fmtNum(r.volume)}</td>
              <td className="text-right px-1 py-1">{r.oi != null ? fmtNum(r.oi) : '—'}</td>
              <td className="text-right px-2 py-1">
                {r.iv != null ? `${(r.iv * 100).toFixed(0)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab 4: Volume Profile ───────────────────────────────────────────
function ProfileTab({ contractId }: { contractId: string }) {
  const { data, error, isLoading } = useSWR(
    contractId ? `/api/uw/option-contract/${contractId}/volume-profile` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const rows = useMemo(() => {
    const raw = data?.data ?? data ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .map((r: any) => ({
        price: Number(r.price ?? 0),
        buyVolume: Number(r.buy_volume ?? r.bid_volume ?? 0),
        sellVolume: Number(r.sell_volume ?? r.ask_volume ?? 0),
        totalVolume: Number(r.total_volume ?? r.volume ?? 0),
      }))
      .filter(r => r.price > 0)
      .sort((a, b) => b.price - a.price)
  }, [data])

  const maxVol = useMemo(() => Math.max(...rows.map(r => r.totalVolume), 1), [rows])

  if (isLoading && !data) {
    return <div className="p-2 text-[9px] font-mono text-muted-foreground">Loading profile…</div>
  }
  if (error) {
    return <WidgetEmptyState type="error" message="Failed to load profile" />
  }
  if (!rows.length) {
    return <WidgetEmptyState type="no-data" message="No volume profile" />
  }

  return (
    <div className="overflow-auto h-full p-1.5 space-y-0.5">
      {rows.map((r, i) => {
        const buyPct = r.totalVolume > 0 ? (r.buyVolume / r.totalVolume) * 100 : 50
        const widthPct = (r.totalVolume / maxVol) * 100
        return (
          <div key={r.price + '-' + i} className="text-[9px] font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{fmtPrice(r.price)}</span>
              <span className="font-bold">{fmtNum(r.totalVolume)}</span>
            </div>
            <div
              className="h-1.5 bg-muted/30 rounded overflow-hidden mt-0.5 flex"
              style={{ width: `${widthPct}%` }}
              title={`Buy ${fmtNum(r.buyVolume)} / Sell ${fmtNum(r.sellVolume)}`}
            >
              <div className="h-full bg-green-500/60" style={{ width: `${buyPct}%` }} />
              <div className="h-full bg-red-500/60" style={{ width: `${100 - buyPct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────
export function ContractDrilldown() {
  const [contractId, setContractId] = useState('')
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)

  // Restore last-used contract from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const last = window.localStorage.getItem(STORAGE_KEY)
    if (last) {
      setContractId(last)
      setDraft(last)
    }
  }, [])

  function commit(value: string) {
    const cleaned = value.trim().toUpperCase()
    if (!cleaned) {
      setContractId('')
      setDraftError(null)
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    if (!isValidContract(cleaned)) {
      setDraftError('Format: AAPL250620C00200000')
      return
    }
    setContractId(cleaned)
    setDraftError(null)
    window.localStorage.setItem(STORAGE_KEY, cleaned)
  }

  // Header right-slot: contract input + clear button
  const inputSlot = (
    <div className="flex items-center gap-1">
      <input
        value={draft}
        onChange={e => {
          setDraft(e.target.value)
          if (draftError) setDraftError(null)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') commit(draft)
        }}
        onBlur={() => commit(draft)}
        placeholder="AAPL250620C00200000"
        className="text-[9px] font-mono bg-muted/30 border border-border/40 rounded px-1.5 py-0.5 w-44 focus:outline-none focus:border-primary"
      />
      {contractId && (
        <button
          onClick={() => {
            setDraft('')
            commit('')
          }}
          className="p-0.5 hover:bg-muted/50 rounded"
          title="Clear contract"
        >
          <X className="w-2.5 h-2.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )

  // If no contract set, render an empty-state body
  if (!contractId) {
    const tabs = [
      {
        id: 'empty',
        label: 'Pick Contract',
        render: () => (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 gap-2">
            <Crosshair className="w-6 h-6 text-muted-foreground/50" />
            <div className="text-[10px] font-mono text-muted-foreground">
              Paste an option contract symbol above
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/70">
              OCC format: <span className="text-foreground">AAPL250620C00200000</span>
            </div>
            {draftError && (
              <div className="text-[9px] font-mono text-red-400 mt-1">{draftError}</div>
            )}
          </div>
        ),
      },
    ]
    return (
      <TabbedWidget
        title="Contract Drilldown"
        icon={Crosshair}
        iconColor="text-amber-400"
        tabs={tabs}
        rightSlot={inputSlot}
      />
    )
  }

  const tabs = [
    { id: 'flow',     label: 'Flow',     render: () => <FlowTab contractId={contractId} /> },
    { id: 'historic', label: 'Historic', render: () => <HistoricTab contractId={contractId} /> },
    { id: 'intraday', label: 'Intraday', render: () => <IntradayTab contractId={contractId} /> },
    { id: 'profile',  label: 'Profile',  render: () => <ProfileTab contractId={contractId} /> },
  ]

  return (
    <TabbedWidget
      title="Contract Drilldown"
      icon={Crosshair}
      iconColor="text-amber-400"
      subtitle={contractId}
      tabs={tabs}
      rightSlot={inputSlot}
    />
  )
}
