'use client'

import useSWR from 'swr'

/**
 * useTickerBundle
 * --------------------------------------------------------------------
 * Shared SWR hook backing every UW-driven widget. One ticker bundle
 * call hydrates ~13 endpoints in two rate-limit-safe waves:
 *   info, state, greekExposure, greekExposureByStrike, spotExposures,
 *   ivRank, ivTermStructure, maxPain, optionsVolume, oiChange,
 *   flowAlerts, darkPool (aggregated), insider, congress
 *
 * Multiple widgets sharing the same `ticker` will dedupe to a single
 * fetch via SWR's cache, so adding 6 bundle-backed widgets to the
 * dashboard is still 1 network round-trip per refresh interval.
 */

export interface TickerBundle {
  ticker: string
  asOf: string
  info: any
  state: any
  greekExposure: any[] | null
  greekExposureByStrike: any[] | null
  spotExposures: any[] | null
  ivRank: any[] | null
  ivTermStructure: any[] | null
  maxPain: any[] | null
  optionsVolume: any[] | null
  oiChange: any[] | null
  flowAlerts: any[] | null
  darkPool: {
    trades: any[]
    totalVol: number
    buyVol: number
    sellVol: number
    count: number
  } | null
  insider: any[] | null
  congress: any[] | null
  errors?: Record<string, string>
}

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error(`bundle ${r.status}`)
    return r.json()
  })

export function useTickerBundle(ticker: string | null | undefined, opts?: {
  refreshInterval?: number
}) {
  const key = ticker ? `/api/ticker-bundle/${ticker.toUpperCase()}` : null
  const { data, error, isLoading, mutate } = useSWR<TickerBundle>(key, fetcher, {
    refreshInterval: opts?.refreshInterval ?? 30_000,
    revalidateOnFocus: false,
    keepPreviousData: true,
    dedupingInterval: 5_000,
  })
  return {
    bundle: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  }
}

/* ---------- shared formatting helpers used across widgets ---------- */

export function fmtNum(n: any, digits = 2): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (v == null || Number.isNaN(v)) return '—'
  return v.toFixed(digits)
}

export function fmtPrice(n: any): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (v == null || Number.isNaN(v)) return '—'
  return '$' + v.toFixed(2)
}

export function fmtMillions(n: any): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (v == null || Number.isNaN(v) || !v) return '—'
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toFixed(0)
}

export function fmtPremium(n: any): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (v == null || Number.isNaN(v) || !v) return '—'
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K'
  return '$' + v.toFixed(0)
}

export function fmtPct(n: any, digits = 1): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (v == null || Number.isNaN(v)) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(digits) + '%'
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (sec < 60) return sec + 's'
  const min = Math.floor(sec / 60)
  if (min < 60) return min + 'm'
  const hr = Math.floor(min / 60)
  if (hr < 24) return hr + 'h'
  return Math.floor(hr / 24) + 'd'
}
