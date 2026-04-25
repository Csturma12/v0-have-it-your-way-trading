'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type AccentColor = 'green' | 'gold' | 'red' | 'cyan'

interface Alert {
  ticker: string
  signal: 'BUY' | 'SELL'
  confidence: number
  reason: string
}

interface SectorPillBoxProps {
  title: string
  accent: AccentColor
  tickers: string[]
  alerts: Alert[]
  onSelectTicker?: (ticker: string) => void
}

const accentStyles: Record<AccentColor, { border: string; bg: string; text: string; pill: string }> = {
  green: {
    border: 'border-theme-green/40',
    bg: 'bg-theme-green/5',
    text: 'text-theme-green',
    pill: 'bg-theme-green/15 text-theme-green border-theme-green/30 hover:bg-theme-green/25',
  },
  gold: {
    border: 'border-theme-gold/40',
    bg: 'bg-theme-gold/5',
    text: 'text-theme-gold',
    pill: 'bg-theme-gold/15 text-theme-gold border-theme-gold/30 hover:bg-theme-gold/25',
  },
  red: {
    border: 'border-theme-red/40',
    bg: 'bg-theme-red/5',
    text: 'text-theme-red',
    pill: 'bg-theme-red/15 text-theme-red border-theme-red/30 hover:bg-theme-red/25',
  },
  cyan: {
    border: 'border-theme-cyan/40',
    bg: 'bg-theme-cyan/5',
    text: 'text-theme-cyan',
    pill: 'bg-theme-cyan/15 text-theme-cyan border-theme-cyan/30 hover:bg-theme-cyan/25',
  },
}

export function SectorPillBox({ title, accent, tickers, alerts, onSelectTicker }: SectorPillBoxProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const styles = accentStyles[accent]

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${styles.text} bg-current`} />
          <span className="text-sm font-bold font-mono tracking-wide text-foreground">{title}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50 text-muted-foreground">
            {tickers.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Trending Tickers */}
          <div className="flex flex-wrap gap-1.5">
            {tickers.map((ticker) => (
              <button
                key={ticker}
                onClick={() => onSelectTicker?.(ticker)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${styles.pill}`}
              >
                {ticker}
              </button>
            ))}
          </div>

          {/* Alerts Section */}
          <div className="border-t border-border/30 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className={`w-3 h-3 ${styles.text}`} />
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
                HIGH CONVICTION ALERTS
              </span>
            </div>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectTicker?.(alert.ticker)}
                  className="w-full text-left p-2 rounded bg-card/50 border border-border/30 hover:border-border/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-foreground">{alert.ticker}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${
                          alert.signal === 'BUY'
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {alert.signal === 'BUY' ? (
                          <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                        )}
                        {alert.signal}
                      </Badge>
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${
                      alert.confidence >= 0.85 ? 'text-green-400' :
                      alert.confidence >= 0.75 ? 'text-theme-gold' : 'text-orange-400'
                    }`}>
                      {(alert.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-1">
                    {alert.reason}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
