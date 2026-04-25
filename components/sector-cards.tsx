'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface Sector {
  id: string
  name: string
  description: string
  performance: number
  groups: number
  tickers: string[]
}

const SECTORS: Sector[] = [
  {
    id: 'technology',
    name: 'Technology',
    description: 'Software, hardware, semiconductors, IT services, and internet platforms.',
    performance: 2.81,
    groups: 8,
    tickers: ['AAPL', 'MSFT', 'NVDA', 'META', 'GOOGL', 'AMZN'],
  },
  {
    id: 'health-care',
    name: 'Health Care',
    description: 'Pharma, biotech, medical devices, insurers, and health services.',
    performance: -1.41,
    groups: 5,
    tickers: ['JNJ', 'UNH', 'LLY', 'MRK', 'ABBV', 'TMO'],
  },
  {
    id: 'financials',
    name: 'Financials',
    description: 'Banks, insurers, asset managers, exchanges, and brokerages.',
    performance: -0.73,
    groups: 6,
    tickers: ['JPM', 'BAC', 'WFC', 'AXP', 'GS', 'MS'],
  },
  {
    id: 'consumer-discretionary',
    name: 'Consumer Discretionary',
    description: 'Retail, autos, travel, restaurants, and luxury goods.',
    performance: 0.81,
    groups: 7,
    tickers: ['AMZN', 'TSLA', 'HD', 'MCD', 'SBUX', 'NKE'],
  },
  {
    id: 'communication-services',
    name: 'Communication Services',
    description: 'Telecom, media, entertainment, and social platforms.',
    performance: -1.58,
    groups: 3,
    tickers: ['META', 'GOOGL', 'VZ', 'T', 'DIS', 'NFLX'],
  },
  {
    id: 'industrials',
    name: 'Industrials',
    description: 'Aerospace, defense, machinery, transports, and construction.',
    performance: -0.92,
    groups: 5,
    tickers: ['BA', 'LMT', 'RTX', 'CAT', 'MMM', 'GE'],
  },
  {
    id: 'energy',
    name: 'Energy',
    description: 'Oil & gas producers, refiners, pipelines, and services.',
    performance: -0.19,
    groups: 4,
    tickers: ['XOM', 'CVX', 'COP', 'SLB', 'HAL', 'OXY'],
  },
  {
    id: 'utilities',
    name: 'Utilities',
    description: 'Electric utilities, water utilities, and renewables.',
    performance: 0.26,
    groups: 2,
    tickers: ['NEE', 'DUK', 'SO', 'EXC', 'AEP', 'ES'],
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'REITs across residential, commercial, industrial, and data center.',
    performance: -0.38,
    groups: 5,
    tickers: ['PLD', 'AMT', 'EQIX', 'SPG', 'O', 'WELL'],
  },
  {
    id: 'consumer-staples',
    name: 'Consumer Staples',
    description: 'Food, beverages, household products, and mass retail.',
    performance: 0.81,
    groups: 4,
    tickers: ['WMT', 'COST', 'PG', 'KO', 'MO', 'PM'],
  },
  {
    id: 'materials',
    name: 'Materials',
    description: 'Chemicals, metals, mining, construction materials, and packaging.',
    performance: 0.21,
    groups: 4,
    tickers: ['LIN', 'NEM', 'FCX', 'POL', 'DD', 'ECL'],
  },
]

const getPerformanceColor = (perf: number) => {
  if (perf > 0) return 'text-green-400'
  if (perf < 0) return 'text-red-400'
  return 'text-muted-foreground'
}

const getPerformanceIcon = (perf: number) => {
  if (perf > 0) return ArrowUpRight
  if (perf < 0) return ArrowDownRight
  return null
}

export function SectorCards() {
  return (
    <section className="w-full">
      {/* Section header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold tracking-wide text-foreground font-mono uppercase">
          Sectors
        </h2>
        <span className="text-xs font-mono tracking-widest text-muted-foreground/60 uppercase">
          11 Core Sectors
        </span>
      </div>

      {/* Sector grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SECTORS.map((sector) => {
          const Icon = getPerformanceIcon(sector.performance)
          const perfColor = getPerformanceColor(sector.performance)

          return (
            <div
              key={sector.id}
              className={`
                relative rounded-lg border bg-card p-5 cursor-pointer
                transition-all duration-200 group
                border-border/50 hover:border-border/80
              `}
            >
              {/* Arrow icon */}
              <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 opacity-30 group-hover:opacity-60 transition-opacity text-muted-foreground/50" />

              {/* Title */}
              <h3 className="font-bold text-foreground text-base leading-tight pr-6 mb-2">
                {sector.name}
              </h3>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {sector.description}
              </p>

              {/* Performance metric */}
              <div className="mb-4 p-2.5 bg-muted/30 rounded border border-border/30">
                <div className="text-[10px] font-mono tracking-widest text-muted-foreground/60 mb-1 uppercase">
                  DAY
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold font-mono ${perfColor}`}>
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{sector.performance > 0 ? '+' : ''}{sector.performance.toFixed(2)}%</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="space-y-1">
                  <div className="text-muted-foreground/50">GROUPS</div>
                  <div className="text-foreground font-semibold">{sector.groups} GROUPS</div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-muted-foreground/50">TICKERS</div>
                  <div className="text-foreground font-semibold">{sector.tickers.length} TICKERS</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
