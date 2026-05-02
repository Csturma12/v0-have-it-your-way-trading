'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ChevronDown, ChevronUp, Flame, RefreshCw } from 'lucide-react'

interface CommodityRow {
  ticker: string
  name: string
  price: number
  change: number
  changePct: number
  sparkline: number[]
}

interface CommoditiesPillsProps {
  onSelectTicker?: (ticker: string) => void
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Tiny inline SVG sparkline. Sized via CSS (parent flex), draws a single
// polyline from oldest -> newest closing price. Color matches change sign.
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) {
    return <div className="w-full h-full" />
  }
  const w = 60
  const h = 18
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = w / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = i * stepX
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const stroke = positive ? 'rgb(74 222 128)' : 'rgb(248 113 113)'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        opacity="0.85"
      />
    </svg>
  )
}

export function CommoditiesPills({ onSelectTicker }: CommoditiesPillsProps) {
  const [open, setOpen] = useState(false)

  // Only fetch when the section is open — saves API budget on initial load.
  const { data, isLoading, mutate } = useSWR<{ commodities: CommodityRow[]; cached?: boolean }>(
    open ? '/api/commodities' : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  )

  const rows = data?.commodities ?? []

  return (
    <div className="rounded-md border border-orange-500/30 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/20 hover:bg-muted/30 transition-all"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-orange-400" />
          <Flame className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase truncate text-foreground">
            Commodities
          </span>
          <span className="text-[8px] font-mono px-1 rounded text-green-400">LIVE</span>
        </div>
        <div className="flex items-center gap-1">
          {open && (
            <button
              onClick={e => { e.stopPropagation(); mutate() }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
              aria-label="Refresh commodities"
            >
              <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {open
            ? <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            : <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          }
        </div>
      </button>

      {open && (
        <div className="w-full">
          {/* Header row */}
          <div className="px-2 py-1 border-b border-border/20 grid grid-cols-[58px_1fr_60px_50px] gap-1.5 items-center">
            <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">Sym</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">Price</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-center">30D</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-right">Chg%</span>
          </div>

          {isLoading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-2 py-3 text-center text-[10px] font-mono text-muted-foreground">
              No data
            </div>
          ) : (
            rows.map(row => {
              const positive = row.changePct >= 0
              return (
                <button
                  key={row.ticker}
                  onClick={() => onSelectTicker?.(row.ticker)}
                  className="w-full grid grid-cols-[58px_1fr_60px_50px] items-center gap-1.5 px-2 py-1 border-b border-border/10 last:border-b-0 hover:bg-white/5 transition-colors text-left"
                  title={`${row.name} (${row.ticker})`}
                >
                  <span className="text-[11px] font-mono font-bold text-foreground truncate">{row.ticker}</span>
                  <span className="text-[10px] font-mono text-muted-foreground truncate">
                    ${row.price < 10 ? row.price.toFixed(3) : row.price.toFixed(2)}
                  </span>
                  <div className="h-[18px]">
                    <Sparkline data={row.sparkline} positive={positive} />
                  </div>
                  <span className={`text-[10px] font-mono font-semibold text-right ${positive ? 'text-green-400' : 'text-red-400'}`}>
                    {positive ? '+' : ''}{row.changePct.toFixed(2)}%
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
