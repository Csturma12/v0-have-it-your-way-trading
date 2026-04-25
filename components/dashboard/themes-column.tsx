'use client'

import { useState } from 'react'
import {
  Cpu,
  Scale,
  Server,
  Shield,
  Flame,
  Stethoscope,
  Zap as ChipIcon,
  Globe,
  BarChart2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

type AccentColor = 'green' | 'gold' | 'red' | 'cyan'

interface ThemeAlert {
  ticker: string
  signal: 'BUY' | 'SELL'
  confidence: number
  reason: string
}

interface Theme {
  id: string
  name: string
  topics: number
  tickers: number
  icon: React.ElementType
  accent: AccentColor
  tickers_list: string[]
  alerts: ThemeAlert[]
}

const THEMES: Theme[] = [
  {
    id: 'ai-industry',
    name: 'AI Industry',
    topics: 12,
    tickers: 32,
    icon: Cpu,
    accent: 'green',
    tickers_list: ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'ORCL', 'AMD', 'SMCI'],
    alerts: [
      { ticker: 'NVDA', signal: 'BUY', confidence: 0.94, reason: 'Blackwell ramp accelerating' },
      { ticker: 'SMCI', signal: 'BUY', confidence: 0.83, reason: 'AI server backlog growing' },
      { ticker: 'ORCL', signal: 'BUY', confidence: 0.78, reason: 'OCI capacity deals signed' },
    ],
  },
  {
    id: 'political-mna',
    name: 'Political & M&A',
    topics: 10,
    tickers: 28,
    icon: Scale,
    accent: 'gold',
    tickers_list: ['SPY', 'XLF', 'GLD', 'TLT', 'DXY', 'BAC'],
    alerts: [
      { ticker: 'GLD', signal: 'BUY', confidence: 0.86, reason: 'Geopolitical tensions rising' },
      { ticker: 'TLT', signal: 'SELL', confidence: 0.72, reason: 'Hawkish Fed signals' },
      { ticker: 'XLF', signal: 'BUY', confidence: 0.69, reason: 'Deregulation tailwinds' },
    ],
  },
  {
    id: 'ai-infra',
    name: 'AI Infrastructure',
    topics: 8,
    tickers: 28,
    icon: Server,
    accent: 'green',
    tickers_list: ['AVGO', 'ANET', 'VST', 'CEG', 'ETN', 'EQIX'],
    alerts: [
      { ticker: 'VST', signal: 'BUY', confidence: 0.91, reason: 'Power demand surge for AI DCs' },
      { ticker: 'AVGO', signal: 'BUY', confidence: 0.88, reason: 'AI networking 60% of revenue' },
      { ticker: 'CEG', signal: 'BUY', confidence: 0.84, reason: 'Nuclear PPAs with hyperscalers' },
    ],
  },
  {
    id: 'defense',
    name: 'Defense & Government',
    topics: 8,
    tickers: 19,
    icon: Shield,
    accent: 'red',
    tickers_list: ['LMT', 'RTX', 'NOC', 'GD', 'BA', 'PLTR'],
    alerts: [
      { ticker: 'PLTR', signal: 'BUY', confidence: 0.87, reason: 'Govt contracts accelerating' },
      { ticker: 'RTX', signal: 'BUY', confidence: 0.79, reason: 'Missile defense backlog' },
      { ticker: 'BA', signal: 'SELL', confidence: 0.74, reason: 'Production delays persist' },
    ],
  },
  {
    id: 'energy',
    name: 'Energy & Industrials',
    topics: 12,
    tickers: 37,
    icon: Flame,
    accent: 'gold',
    tickers_list: ['XOM', 'CVX', 'COP', 'SLB', 'OXY', 'VLO'],
    alerts: [
      { ticker: 'XOM', signal: 'BUY', confidence: 0.85, reason: 'Permian production beat' },
      { ticker: 'SLB', signal: 'BUY', confidence: 0.81, reason: 'Intl drilling rebound' },
      { ticker: 'OXY', signal: 'SELL', confidence: 0.68, reason: 'Debt servicing pressure' },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare & BioPharma',
    topics: 8,
    tickers: 28,
    icon: Stethoscope,
    accent: 'gold',
    tickers_list: ['LLY', 'NVO', 'JNJ', 'MRK', 'ABBV', 'AMGN'],
    alerts: [
      { ticker: 'LLY', signal: 'BUY', confidence: 0.95, reason: 'GLP-1 dominance + pipeline' },
      { ticker: 'NVO', signal: 'BUY', confidence: 0.89, reason: 'Wegovy supply easing' },
      { ticker: 'AMGN', signal: 'BUY', confidence: 0.76, reason: 'MariTide trial data positive' },
    ],
  },
  {
    id: 'semis',
    name: 'Semiconductors',
    topics: 10,
    tickers: 24,
    icon: ChipIcon,
    accent: 'red',
    tickers_list: ['NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'MU'],
    alerts: [
      { ticker: 'AMD', signal: 'BUY', confidence: 0.86, reason: 'MI350 ramp on schedule' },
      { ticker: 'MU', signal: 'BUY', confidence: 0.82, reason: 'HBM3E shipping at scale' },
      { ticker: 'INTC', signal: 'SELL', confidence: 0.77, reason: 'Foundry losses widening' },
    ],
  },
  {
    id: 'macro',
    name: 'Macro & Global',
    topics: 11,
    tickers: 31,
    icon: Globe,
    accent: 'gold',
    tickers_list: ['SPY', 'QQQ', 'TLT', 'GLD', 'UUP', 'VIX'],
    alerts: [
      { ticker: 'VIX', signal: 'BUY', confidence: 0.71, reason: 'Hedge against earnings vol' },
      { ticker: 'GLD', signal: 'BUY', confidence: 0.78, reason: 'CB buying continues' },
      { ticker: 'QQQ', signal: 'SELL', confidence: 0.66, reason: 'Stretched valuations' },
    ],
  },
  {
    id: 'earnings',
    name: 'Earnings Momentum',
    topics: 6,
    tickers: 40,
    icon: BarChart2,
    accent: 'green',
    tickers_list: ['META', 'AMZN', 'GOOGL', 'MSFT', 'AAPL', 'TSLA'],
    alerts: [
      { ticker: 'META', signal: 'BUY', confidence: 0.90, reason: 'Reels monetization beat' },
      { ticker: 'AMZN', signal: 'BUY', confidence: 0.84, reason: 'AWS reaccel + ads strong' },
      { ticker: 'TSLA', signal: 'SELL', confidence: 0.69, reason: 'Margin compression continues' },
    ],
  },
]

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

interface ThemesColumnProps {
  onSelectTicker?: (ticker: string) => void
}

export function ThemesColumn({ onSelectTicker }: ThemesColumnProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CROSS-SECTOR' | 'EVENT-DRIVEN'>('ALL')

  const filtered = THEMES.filter((t) => {
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'CROSS-SECTOR')
      return ['ai-industry', 'ai-infra', 'energy', 'semis', 'macro'].includes(t.id)
    if (activeFilter === 'EVENT-DRIVEN')
      return ['political-mna', 'defense', 'earnings'].includes(t.id)
    return true
  })

  return (
    <div className="p-2 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1 sticky top-0 bg-card/95 backdrop-blur-sm py-1 z-10">
        <h2 className="text-[11px] font-bold tracking-wide text-foreground font-mono uppercase">
          Themes
        </h2>
        <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-muted-foreground">
          {(['ALL', 'CROSS-SECTOR', 'EVENT-DRIVEN'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`transition-colors ${
                activeFilter === f ? 'text-foreground' : 'hover:text-foreground/70'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Theme cards (responsive 2-col grid for bottom-left quadrant) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((theme) => (
          <ThemePillCard key={theme.id} theme={theme} onSelectTicker={onSelectTicker} />
        ))}
      </div>
    </div>
  )
}

function ThemePillCard({
  theme,
  onSelectTicker,
}: {
  theme: Theme
  onSelectTicker?: (ticker: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const styles = accentStyles[theme.accent]
  const Icon = theme.icon

  return (
    <div className={`rounded-md border ${styles.border} ${styles.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`w-3 h-3 flex-shrink-0 ${styles.text}`} />
          <span className="text-[11px] font-bold text-foreground truncate">{theme.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-[9px] font-mono font-semibold tracking-wider ${styles.text}`}>
            {theme.tickers}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-2 pb-2 space-y-1.5">
          {/* Ticker pills */}
          <div className="flex flex-wrap gap-1">
            {theme.tickers_list.map((ticker) => (
              <button
                key={ticker}
                onClick={() => onSelectTicker?.(ticker)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${styles.pill}`}
              >
                {ticker}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <div className="border-t border-border/30 pt-1.5 space-y-1">
            <div className="flex items-center gap-1">
              <ArrowUpRight className={`w-2.5 h-2.5 ${styles.text}`} />
              <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase">
                Alerts
              </span>
            </div>
            {theme.alerts.map((alert, idx) => (
              <button
                key={idx}
                onClick={() => onSelectTicker?.(alert.ticker)}
                className="w-full text-left p-1.5 rounded bg-card/50 border border-border/30 hover:border-border/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-mono font-bold text-foreground">
                      {alert.ticker}
                    </span>
                    <span
                      className={`text-[8px] px-1 py-0 rounded font-mono font-bold ${
                        alert.signal === 'BUY'
                          ? 'bg-theme-green/15 text-theme-green'
                          : 'bg-theme-red/15 text-theme-red'
                      }`}
                    >
                      {alert.signal}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold flex-shrink-0 ${
                      alert.confidence >= 0.85
                        ? 'text-theme-green'
                        : alert.confidence >= 0.75
                          ? 'text-theme-gold'
                          : 'text-orange-400'
                    }`}
                  >
                    {(alert.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-tight line-clamp-1">
                  {alert.reason}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
