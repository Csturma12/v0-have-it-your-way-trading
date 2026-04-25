'use client'

import { useState } from 'react'
import {
  Cpu,
  Scale,
  Server,
  Landmark,
  Shield,
  Flame,
  Building2,
  ShoppingCart,
  Stethoscope,
  Zap,
  Globe,
  BarChart2,
  ArrowUpRight,
} from 'lucide-react'

type AccentColor = 'green' | 'gold' | 'red'

interface Theme {
  id: string
  name: string
  description: string
  topics: number
  tickers: number
  icon: React.ElementType
  accent: AccentColor
  tickers_list: string[]
}

const THEMES: Theme[] = [
  {
    id: 'ai-industry',
    name: 'AI Industry',
    description:
      'Model releases, enterprise deals, funding rounds, AI agents, regulation & policy, China AI, talent moves, and AI infrastructure.',
    topics: 12,
    tickers: 32,
    icon: Cpu,
    accent: 'green',
    tickers_list: ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'ORCL', 'AMD', 'SMCI'],
  },
  {
    id: 'political-mna',
    name: 'Political & M&A Impact',
    description:
      'Policy catalysts that move markets: tariff changes, tax legislation, antitrust rulings, Fed meetings, sanctions, energy rules, plus M&A.',
    topics: 10,
    tickers: 28,
    icon: Scale,
    accent: 'gold',
    tickers_list: ['SPY', 'XLF', 'GLD', 'TLT', 'DXY', 'BAC', 'JPM', 'GS'],
  },
  {
    id: 'ai-infrastructure',
    name: 'AI Infrastructure',
    description:
      'GPU shipments, data center permits, cloud capex guidance, power & energy deals for AI, networking orders & backlog.',
    topics: 8,
    tickers: 28,
    icon: Server,
    accent: 'green',
    tickers_list: ['NVDA', 'AVGO', 'ANET', 'VST', 'CEG', 'ETN', 'EQIX', 'DLR'],
  },
  {
    id: 'banking-finance',
    name: 'Banking & Finance',
    description:
      'Bank earnings & NII, regional bank health, insurance results, consumer credit data, Fed rate decisions, private equity & M&A.',
    topics: 9,
    tickers: 23,
    icon: Landmark,
    accent: 'green',
    tickers_list: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BRK.B', 'AXP'],
  },
  {
    id: 'defense-government',
    name: 'Defense & Government',
    description:
      'Major contract awards, defense budget & spending, space launch & contracts, drone & UAV programs, cyber & IT contracts, naval.',
    topics: 8,
    tickers: 19,
    icon: Shield,
    accent: 'red',
    tickers_list: ['LMT', 'RTX', 'NOC', 'GD', 'BA', 'LDOS', 'CACI', 'PLTR'],
  },
  {
    id: 'energy-industrials',
    name: 'Energy & Industrials',
    description:
      'Oil major earnings, rig counts & drilling activity, LNG & natural gas contracts, crude oil & gas prices, utility rate cases, nuclear.',
    topics: 12,
    tickers: 37,
    icon: Flame,
    accent: 'gold',
    tickers_list: ['XOM', 'CVX', 'COP', 'SLB', 'HAL', 'OXY', 'PSX', 'VLO'],
  },
  {
    id: 'real-estate',
    name: 'Real Estate & REITs',
    description:
      'REIT earnings & FFO, office vacancy & distress, housing starts & sales data, mortgage rate movement, data center leasing.',
    topics: 7,
    tickers: 28,
    icon: Building2,
    accent: 'green',
    tickers_list: ['PLD', 'AMT', 'EQIX', 'SPG', 'O', 'WELL', 'PSA', 'DLR'],
  },
  {
    id: 'consumer-retail',
    name: 'Consumer & Retail',
    description:
      'Retail earnings & comps, luxury & apparel sales, restaurant & food earnings, CPG volumes & pricing, auto sales & EV data.',
    topics: 7,
    tickers: 37,
    icon: ShoppingCart,
    accent: 'green',
    tickers_list: ['AMZN', 'WMT', 'COST', 'TGT', 'HD', 'MCD', 'SBUX', 'TSLA'],
  },
  {
    id: 'healthcare-biopharma',
    name: 'Healthcare & BioPharma',
    description:
      'Pharma earnings & drug sales, FDA approvals & PDUFA dates, clinical trial results, GLP-1 prescriptions & sales, medical device.',
    topics: 8,
    tickers: 28,
    icon: Stethoscope,
    accent: 'gold',
    tickers_list: ['LLY', 'NVO', 'JNJ', 'MRK', 'ABBV', 'PFE', 'BMY', 'AMGN'],
  },
  {
    id: 'semiconductors',
    name: 'Semiconductors',
    description:
      'Chip earnings & guidance, fab utilization & capacity, equipment orders, TSMC capacity, memory pricing, export controls & China.',
    topics: 10,
    tickers: 24,
    icon: Zap,
    accent: 'red',
    tickers_list: ['NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'MU', 'AMAT', 'KLAC'],
  },
  {
    id: 'macro-global',
    name: 'Macro & Global Markets',
    description:
      'CPI, PPI, PCE data, Fed policy signals, treasury yields, dollar index, global PMIs, geopolitical risk & cross-asset flows.',
    topics: 11,
    tickers: 31,
    icon: Globe,
    accent: 'gold',
    tickers_list: ['SPY', 'QQQ', 'TLT', 'GLD', 'UUP', 'EFA', 'EEM', 'VIX'],
  },
  {
    id: 'earnings-momentum',
    name: 'Earnings Momentum',
    description:
      'High-conviction earnings plays, guidance beats & raises, analyst upgrades post-earnings, options flow around reporting dates.',
    topics: 6,
    tickers: 40,
    icon: BarChart2,
    accent: 'green',
    tickers_list: ['META', 'AMZN', 'GOOGL', 'MSFT', 'AAPL', 'NVDA', 'TSLA', 'AMD'],
  },
]

const accentStyles: Record<AccentColor, { border: string; icon: string; stat: string; pill: string }> = {
  green: {
    border: 'border-theme-green/40 hover:border-theme-green/80',
    icon: 'text-theme-green',
    stat: 'text-theme-green',
    pill: 'bg-theme-green/10 text-theme-green border-theme-green/20',
  },
  gold: {
    border: 'border-theme-gold/40 hover:border-theme-gold/80',
    icon: 'text-theme-gold',
    stat: 'text-theme-gold',
    pill: 'bg-theme-gold/10 text-theme-gold border-theme-gold/20',
  },
  red: {
    border: 'border-theme-red/40 hover:border-theme-red/80',
    icon: 'text-theme-red',
    stat: 'text-theme-red',
    pill: 'bg-theme-red/10 text-theme-red border-theme-red/20',
  },
}

interface CrossSectorThemesProps {
  onSelectTheme?: (tickers: string[]) => void
}

export function CrossSectorThemes({ onSelectTheme }: CrossSectorThemesProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CROSS-SECTOR' | 'EVENT-DRIVEN'>('ALL')

  const filtered = THEMES.filter((t) => {
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'CROSS-SECTOR')
      return ['ai-industry', 'ai-infrastructure', 'banking-finance', 'energy-industrials', 'semiconductors', 'macro-global'].includes(t.id)
    if (activeFilter === 'EVENT-DRIVEN')
      return ['political-mna', 'defense-government', 'earnings-momentum'].includes(t.id)
    return true
  })

  return (
    <section className="w-full">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-wide text-foreground font-mono uppercase">
          Themes
        </h2>
        <div className="flex items-center gap-3 text-xs font-mono tracking-widest text-muted-foreground">
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

      {/* Theme grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((theme) => {
          const styles = accentStyles[theme.accent]
          const Icon = theme.icon
          return (
            <div
              key={theme.id}
              className={`
                relative rounded border bg-card/50 backdrop-blur-sm p-5 cursor-pointer
                transition-all duration-200 group
                ${styles.border}
              `}
              onClick={() => onSelectTheme?.(theme.tickers_list)}
            >
              {/* Arrow icon */}
              <ArrowUpRight
                className={`absolute top-4 right-4 w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity ${styles.icon}`}
              />

              {/* Title row */}
              <div className="flex items-center gap-3 mb-3">
                <Icon className={`w-5 h-5 flex-shrink-0 ${styles.icon}`} />
                <h3 className="font-bold text-foreground text-base leading-tight pr-6">
                  {theme.name}
                </h3>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                {theme.description}
              </p>

              {/* Ticker pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {theme.tickers_list.slice(0, 6).map((ticker) => (
                  <span
                    key={ticker}
                    className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-mono font-semibold border ${styles.pill}`}
                  >
                    {ticker}
                  </span>
                ))}
                {theme.tickers_list.length > 6 && (
                  <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-mono text-muted-foreground/60">
                    +{theme.tickers_list.length - 6}
                  </span>
                )}
              </div>

              {/* Footer stats */}
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-3 text-xs font-mono font-semibold tracking-wider ${styles.stat}`}>
                  <span>{theme.topics} TOPICS</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{theme.tickers} TICKERS</span>
                </div>
                <span className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase">
                  Theme
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
