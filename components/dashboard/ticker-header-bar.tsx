'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

interface TickerHeaderBarProps {
  ticker: string
}

interface BarData {
  name: string
  exchange: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  prevClose: number
  marketCap: number
  sector: string
  source: string
}

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals)
}

function fmtVolume(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(v)
}

function fmtCap(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`
  return ''
}

export function TickerHeaderBar({ ticker }: TickerHeaderBarProps) {
  const [data, setData] = useState<BarData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!ticker) return
    setLoading(true)
    try {
      const res = await fetch(`/api/polygon/profile?ticker=${ticker}`)
      if (res.ok) {
        const json = await res.json()
        const q = json.quote
        const p = json.profile
        if (q || p) {
          setData({
            name: p?.name ?? ticker,
            exchange: p?.exchange ?? '',
            price: q?.price ?? 0,
            change: q?.change ?? 0,
            changePercent: q?.changePercent ?? 0,
            volume: q?.volume ?? 0,
            high: q?.high ?? 0,
            low: q?.low ?? 0,
            open: q?.open ?? 0,
            prevClose: q?.prevClose ?? 0,
            marketCap: p?.marketCap ?? 0,
            sector: p?.sector ?? '',
            source: json.source ?? 'polygon',
          })
        }
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [ticker])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 30000)
    return () => clearInterval(id)
  }, [fetchData])

  const up = (data?.changePercent ?? 0) >= 0

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-card/40 flex-shrink-0 overflow-x-auto min-w-0">

      {/* Ticker + name + exchange */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-mono font-bold text-foreground">{ticker}</span>
        {data?.name && data.name !== ticker && (
          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[160px]">
            {data.name}
          </span>
        )}
        {data?.exchange && (
          <span className="text-[8px] font-mono border border-border/50 bg-muted/30 text-muted-foreground px-1.5 py-0.5 rounded">
            {data.exchange}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border/50 flex-shrink-0" />

      {/* Price + change */}
      {data ? (
        <div className="flex items-baseline gap-2 flex-shrink-0">
          <span className="text-sm font-mono font-bold text-foreground">
            ${fmt(data.price)}
          </span>
          <div className={`flex items-center gap-1 text-[10px] font-mono font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {up ? '+' : ''}{fmt(data.change)} ({up ? '+' : ''}{fmt(data.changePercent)}%)
          </div>
        </div>
      ) : loading ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />
      ) : null}

      {/* Divider */}
      {data && <div className="w-px h-4 bg-border/50 flex-shrink-0" />}

      {/* OHLV stats */}
      {data && (
        <div className="flex items-center gap-4 flex-shrink-0">
          <Stat label="O" value={`$${fmt(data.open)}`} />
          <Stat label="H" value={`$${fmt(data.high)}`} color="text-green-400" />
          <Stat label="L" value={`$${fmt(data.low)}`} color="text-red-400" />
          <Stat label="Prev C" value={`$${fmt(data.prevClose)}`} />
          <Stat label="Vol" value={fmtVolume(data.volume)} />
          {data.marketCap > 0 && (
            <Stat label="Mkt Cap" value={fmtCap(data.marketCap)} />
          )}
          {data.sector && (
            <Stat label="Sector" value={data.sector} />
          )}
        </div>
      )}

      {/* Source badge — pushed right */}
      {data && (
        <div className="ml-auto flex-shrink-0 flex items-center gap-1.5">
          <span
            className={`text-[8px] font-mono font-bold border px-1.5 py-0.5 rounded ${
              data.source === 'polygon'
                ? 'border-green-500/40 text-green-400 bg-green-500/10'
                : 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
            }`}
          >
            {data.source === 'polygon' ? 'POLYGON' : 'DEMO'}
          </span>
          <button
            onClick={fetchData}
            className="p-1 hover:bg-muted/50 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[9px] font-mono text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-mono font-semibold ${color ?? 'text-foreground'}`}>{value}</span>
    </div>
  )
}
