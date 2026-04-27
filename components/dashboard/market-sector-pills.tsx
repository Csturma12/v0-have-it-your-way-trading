'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Activity, RefreshCw, BarChart2 } from 'lucide-react'
import { useSectorPerformance, useGainersLosers } from '@/hooks/useSectorPerformance'

interface MarketSectorPillsProps {
  onSelectTicker?: (ticker: string) => void
}

const SECTOR_ABBREVIATIONS: Record<string, string> = {
  'Information Technology': 'Info Tech',
  'Communication Services': 'Comm Svcs',
  'Consumer Discretionary': 'Cons Disc',
  'Consumer Staples': 'Cons Staples',
  'Health Care': 'Health Care',
  'Financials': 'Financials',
  'Industrials': 'Industrials',
  'Materials': 'Materials',
  'Real Estate': 'Real Estate',
  'Utilities': 'Utilities',
  'Energy': 'Energy',
}

function abbrev(name: string) {
  return SECTOR_ABBREVIATIONS[name] ?? name
}

function PerfBar({ value }: { value: number }) {
  const pct = Math.min(Math.abs(value) * 10, 100)
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden flex items-center">
        <div
          className={`h-full rounded-full ${value >= 0 ? 'bg-green-400/60' : 'bg-red-400/60'}`}
          style={{ width: `${pct}%`, marginLeft: value < 0 ? `${100 - pct}%` : 0 }}
        />
      </div>
      <span className={`text-[10px] font-mono font-semibold w-12 text-right ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  )
}

// Collapsible pill section matching the SectorPillBox/ThemePillBox style
function PillSection({
  title,
  icon: Icon,
  accentClass,
  dotClass,
  children,
  loading,
  source,
  onRefresh,
}: {
  title: string
  icon: React.ElementType
  accentClass: string
  dotClass: string
  children: React.ReactNode
  loading: boolean
  source: string
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded-md border ${accentClass} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/20 hover:bg-muted/30 transition-all"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
          <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase truncate text-foreground">
            {title}
          </span>
          <span className={`text-[8px] font-mono px-1 rounded ${source === 'alpha_vantage' ? 'text-green-400' : 'text-amber-400'}`}>
            {source === 'alpha_vantage' ? 'LIVE' : 'DEMO'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {open && (
            <button
              onClick={e => { e.stopPropagation(); onRefresh() }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
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
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          ) : children}
        </div>
      )}
    </div>
  )
}

export function MarketSectorPills({ onSelectTicker }: MarketSectorPillsProps) {
  const { sectors, loading: sectorsLoading, source: sectorsSource, refresh: refreshSectors } = useSectorPerformance()
  const { data: gl, loading: glLoading, source: glSource, refresh: refreshGL } = useGainersLosers()

  const sectorRows = sectors?.realTimePerformance ?? []

  return (
    <div className="space-y-1">
      {/* MARKET SECTORS */}
      <PillSection
        title="Market Sectors"
        icon={BarChart2}
        accentClass="border-blue-500/30"
        dotClass="bg-blue-400"
        loading={sectorsLoading}
        source={sectorsSource}
        onRefresh={refreshSectors}
      >
        <div className="px-2 py-1 border-b border-border/20 grid grid-cols-[1fr_auto] gap-2">
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">Sector</span>
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-right">Perf</span>
        </div>
        {sectorRows
          .slice()
          .sort((a, b) => b.performance - a.performance)
          .map(s => (
            <div
              key={s.sector}
              className="grid grid-cols-[1fr_auto] items-center gap-2 px-2 py-1 border-b border-border/10 last:border-b-0 hover:bg-white/5 transition-colors"
            >
              <span className="text-[10px] font-mono text-foreground truncate">{abbrev(s.sector)}</span>
              <PerfBar value={s.performance} />
            </div>
          ))}
      </PillSection>

      {/* TOP GAINERS */}
      <PillSection
        title="Top Gainers"
        icon={TrendingUp}
        accentClass="border-green-500/30"
        dotClass="bg-green-400"
        loading={glLoading}
        source={glSource}
        onRefresh={refreshGL}
      >
        <div className="px-2 py-1 border-b border-border/20 grid grid-cols-[1fr_auto_auto] gap-2">
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">Ticker</span>
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-right">Price</span>
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-right">Chg%</span>
        </div>
        {(gl?.topGainers ?? []).slice(0, 8).map(s => (
          <button
            key={s.ticker}
            onClick={() => onSelectTicker?.(s.ticker)}
            className="w-full grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1 border-b border-border/10 last:border-b-0 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-[11px] font-mono font-bold text-foreground">{s.ticker}</span>
            <span className="text-[10px] font-mono text-muted-foreground">${s.price.toFixed(2)}</span>
            <span className="text-[10px] font-mono font-semibold text-green-400 text-right">
              +{s.changePercent.toFixed(2)}%
            </span>
          </button>
        ))}
      </PillSection>

      {/* TOP LOSERS */}
      <PillSection
        title="Top Losers"
        icon={TrendingDown}
        accentClass="border-red-500/30"
        dotClass="bg-red-400"
        loading={glLoading}
        source={glSource}
        onRefresh={refreshGL}
      >
        <div className="px-2 py-1 border-b border-border/20 grid grid-cols-[1fr_auto_auto] gap-2">
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">Ticker</span>
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-right">Price</span>
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-right">Chg%</span>
        </div>
        {(gl?.topLosers ?? []).slice(0, 8).map(s => (
          <button
            key={s.ticker}
            onClick={() => onSelectTicker?.(s.ticker)}
            className="w-full grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1 border-b border-border/10 last:border-b-0 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-[11px] font-mono font-bold text-foreground">{s.ticker}</span>
            <span className="text-[10px] font-mono text-muted-foreground">${s.price.toFixed(2)}</span>
            <span className="text-[10px] font-mono font-semibold text-red-400 text-right">
              {s.changePercent.toFixed(2)}%
            </span>
          </button>
        ))}
      </PillSection>

      {/* MOST ACTIVE */}
      <PillSection
        title="Most Active"
        icon={Activity}
        accentClass="border-amber-500/30"
        dotClass="bg-amber-400"
        loading={glLoading}
        source={glSource}
        onRefresh={refreshGL}
      >
        <div className="px-2 py-1 border-b border-border/20 grid grid-cols-[1fr_auto_auto] gap-2">
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">Ticker</span>
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-right">Vol</span>
          <span className="text-[8px] font-mono text-muted-foreground/50 uppercase text-right">Chg%</span>
        </div>
        {(gl?.mostActive ?? []).slice(0, 8).map(s => (
          <button
            key={s.ticker}
            onClick={() => onSelectTicker?.(s.ticker)}
            className="w-full grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1 border-b border-border/10 last:border-b-0 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-[11px] font-mono font-bold text-foreground">{s.ticker}</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {s.volume >= 1_000_000 ? `${(s.volume / 1_000_000).toFixed(1)}M` : `${(s.volume / 1_000).toFixed(0)}K`}
            </span>
            <span className={`text-[10px] font-mono font-semibold text-right ${s.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
            </span>
          </button>
        ))}
      </PillSection>
    </div>
  )
}
