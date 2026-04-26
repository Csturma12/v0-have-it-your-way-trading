'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react'

/**
 * Color System:
 * - GREEN  = Positive signal (BUY)
 * - RED    = Negative signal (SELL)
 * - YELLOW = Neutral signal (HOLD)
 * - BLUE   = Current holding OR high conviction alert (>=90%)
 */

interface Ticker {
  symbol: string
  price: number
  change: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  conviction: number // 0-1
  trending: number   // rank 1 = hottest
  isHolding?: boolean // user currently holds this
}

interface ThemePillBoxProps {
  title: string
  icon: React.ElementType
  tickers: Ticker[]
  onSelectTicker?: (ticker: string) => void
}

export function ThemePillBox({ title, icon: Icon, tickers, onSelectTicker }: ThemePillBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Sort by trending rank (1 = hottest)
  const sorted = [...tickers].sort((a, b) => a.trending - b.trending)

  return (
    <div className="rounded-md border border-border/40 overflow-hidden bg-card/20">

      {/* Collapse / Expand Header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/20 hover:bg-muted/30 transition-all"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase truncate text-foreground">
            {title}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground ml-1">
            {tickers.length}
          </span>
        </div>
        {isExpanded
          ? <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {/* Ticker Table — auto-expands to fit all rows */}
      {isExpanded && (
        <div className="w-full">
          {/* Column headers */}
          <div className="grid grid-cols-[16px_1fr_56px_44px_36px] gap-x-1.5 px-2 py-1 border-b border-border/20">
            <span className="text-[8px] font-mono text-muted-foreground/50">#</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 uppercase">Ticker</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 text-right uppercase">Price</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 text-center uppercase">Signal</span>
            <span className="text-[8px] font-mono text-muted-foreground/50 text-right uppercase">Conv.</span>
          </div>

          {/* Ticker rows */}
          {sorted.map((t) => {
            const isPositive = t.change >= 0
            
            // Signal colors: GREEN = BUY, RED = SELL, YELLOW = HOLD
            const signalColor =
              t.signal === 'BUY'  ? 'text-green-400 bg-green-500/10 border-green-500/30' :
              t.signal === 'SELL' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                                    'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'

            // Conviction color: BLUE for high conviction (>=90%) or holding, else graduated
            const isHighConviction = t.conviction >= 0.90 || t.isHolding
            const convColor = isHighConviction
              ? 'text-cyan-400'
              : t.conviction >= 0.75
                ? 'text-yellow-400'
                : 'text-orange-400'

            // Row highlight for holdings (blue tint)
            const rowBg = t.isHolding ? 'bg-cyan-500/5' : ''

            return (
              <button
                key={t.symbol}
                onClick={() => onSelectTicker?.(t.symbol)}
                className={`w-full grid grid-cols-[16px_1fr_56px_44px_36px] gap-x-1.5 px-2 py-1 hover:bg-white/5 transition-colors border-b border-border/10 last:border-b-0 text-left ${rowBg}`}
              >
                {/* Rank - star for #1 */}
                <span className="text-[9px] font-mono text-muted-foreground/40 self-center">
                  {t.trending === 1 ? (
                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                  ) : (
                    t.trending
                  )}
                </span>

                {/* Ticker + change % */}
                <div className="flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono font-bold text-foreground leading-none">
                      {t.symbol}
                    </span>
                    {t.isHolding && (
                      <span className="text-[7px] font-mono font-bold text-cyan-400 bg-cyan-500/15 px-1 rounded">
                        HELD
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-mono leading-none mt-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{t.change.toFixed(2)}%
                  </span>
                </div>

                {/* Price */}
                <span className="text-[10px] font-mono text-foreground text-right self-center">
                  ${t.price.toFixed(2)}
                </span>

                {/* Signal badge */}
                <div className="flex items-center justify-center">
                  <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded border flex items-center gap-0.5 ${signalColor}`}>
                    {t.signal === 'BUY'  && <TrendingUp className="w-2 h-2" />}
                    {t.signal === 'SELL' && <TrendingDown className="w-2 h-2" />}
                    {t.signal === 'HOLD' && <Minus className="w-2 h-2" />}
                    {t.signal}
                  </span>
                </div>

                {/* Conviction */}
                <span className={`text-[10px] font-mono font-bold text-right self-center ${convColor}`}>
                  {(t.conviction * 100).toFixed(0)}%
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
