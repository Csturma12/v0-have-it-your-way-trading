'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'

interface WidgetItem {
  label: string
  description: string
  available: boolean
}

interface WidgetCategory {
  label: string
  items: WidgetItem[]
}

const WIDGET_CATEGORIES: WidgetCategory[] = [
  {
    label: 'Quote',
    items: [
      { label: 'Chart',               description: 'Interactive price chart with overlays and indicators',    available: true  },
      { label: 'Options',             description: 'Options chain with calls, puts, IV, and Greeks',          available: true  },
      { label: 'Events',              description: 'Earnings dates, dividends, splits, and corporate actions', available: true  },
      { label: 'Quotes',              description: 'Real-time bid/ask, last price, volume, and OHLC data',    available: true  },
      { label: 'Key Statistics',      description: 'Market cap, P/E, EPS, 52-week range, float, and more',    available: true  },
      { label: 'Time & Sales',        description: 'Tick-by-tick trade prints with size and price',           available: true  },
      { label: 'Volume Analysis',     description: 'Volume profile, VWAP, and relative volume breakdown',     available: true  },
      { label: 'Order Book',          description: 'Level 2 depth-of-market bid/ask ladder',                  available: true  },
      { label: 'NOII',                description: 'NASDAQ Opening/Closing Imbalance Indicator',              available: false },
      { label: 'Options Statistics',  description: 'Put/call ratio, open interest, unusual activity',         available: false },
      { label: 'Warrant & CBBC',      description: 'Warrants and callable bull/bear contracts data',          available: false },
      { label: 'Brokers',             description: 'Broker-by-broker order flow and market share',            available: false },
      { label: 'Options Calculator',  description: 'Black-Scholes P&L calculator for options strategies',     available: false },
    ],
  },
  {
    label: 'Trade',
    items: [
      { label: 'Order Entry',         description: 'Buy/sell order ticket with limit, market, and stop types', available: true  },
      { label: 'Positions',           description: 'Open positions with real-time P&L and cost basis',         available: true  },
      { label: 'Orders',              description: 'Pending and filled orders with cancel/modify actions',      available: true  },
      { label: 'Buying Power',        description: 'Available cash, margin, and day-trade buying power',        available: true  },
      { label: 'Account Summary',     description: 'Portfolio value, day change, and account metrics',          available: true  },
      { label: 'Trade History',       description: 'Historical executions and average fill prices',             available: true  },
    ],
  },
  {
    label: 'Stocks',
    items: [
      { label: 'Profile',             description: 'Company description, sector, industry, and key executives', available: true  },
      { label: 'Financials',          description: 'Income statement, balance sheet, and cash flow data',       available: true  },
      { label: 'Analyst Ratings',     description: 'Buy/hold/sell consensus with price targets',                available: true  },
      { label: 'Short Interest',      description: 'Short float %, days to cover, and borrow rate',             available: true  },
      { label: 'Institutional Holdings', description: 'Top institutional owners and recent 13F changes',        available: true  },
      { label: 'Insider Transactions', description: 'SEC Form 4 insider buys and sells',                        available: true  },
      { label: 'SEC Filings',         description: '10-K, 10-Q, 8-K, and other regulatory documents',          available: true  },
      { label: 'ETF Details',         description: 'Holdings, expense ratio, and index tracking data',          available: false },
    ],
  },
  {
    label: 'General',
    items: [
      { label: 'News',                description: 'Real-time news feed filtered by symbol or sector',          available: true  },
      { label: 'Earnings Calendar',   description: 'Upcoming earnings with estimate vs. actual results',        available: true  },
      { label: 'Economic Calendar',   description: 'Fed events, CPI, NFP, and macro data releases',             available: true  },
      { label: 'Notes',               description: 'Personal notes and annotations attached to tickers',        available: true  },
      { label: 'Alerts',              description: 'Price, volume, and indicator-based alert management',        available: true  },
    ],
  },
  {
    label: 'Market',
    items: [
      { label: 'Top Gainers',         description: 'Stocks with the largest percentage gains today',            available: true  },
      { label: 'Top Losers',          description: 'Stocks with the largest percentage declines today',         available: true  },
      { label: 'Most Active',         description: 'Highest volume stocks across major exchanges',               available: true  },
      { label: 'Sector Heatmap',      description: 'Color-coded sector and industry performance map',           available: true  },
      { label: 'Futures & Indices',   description: 'Pre-market futures and major index levels',                  available: true  },
      { label: 'Screener',            description: 'Filter stocks by price, volume, technical, and fundamental', available: true  },
      { label: 'IPO Calendar',        description: 'Upcoming and recent IPO listings with details',             available: false },
      { label: 'Options Flow',        description: 'Unusual options activity and large block sweeps',            available: false },
    ],
  },
]

export default function WidgetsPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Quote: true })
  const [added, setAdded] = useState<Set<string>>(new Set())

  const toggle = (label: string) =>
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }))

  const addWidget = (categoryLabel: string, itemLabel: string) => {
    const key = `${categoryLabel}:${itemLabel}`
    setAdded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <main className="flex h-full min-h-screen bg-background">
      {/* Sidebar panel — Webull style */}
      <div className="w-72 border-r border-border bg-card flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">Widgets</h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
            Click + to add a widget to your dashboard
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {WIDGET_CATEGORIES.map(cat => {
            const isOpen = !!expanded[cat.label]
            return (
              <div key={cat.label}>
                {/* Category header */}
                <button
                  onClick={() => toggle(cat.label)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/20 transition-colors group"
                >
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  }
                  <span className="text-[13px] font-mono text-foreground">{cat.label}</span>
                </button>

                {/* Widget items */}
                {isOpen && (
                  <div>
                    {cat.items.map(item => {
                      const key = `${cat.label}:${item.label}`
                      const isAdded = added.has(key)
                      return (
                        <div
                          key={item.label}
                          className={`flex items-center justify-between px-8 py-2 group transition-colors ${
                            isAdded ? 'bg-primary/5' : 'hover:bg-muted/10'
                          }`}
                        >
                          <span className={`text-[12px] font-mono ${
                            item.available ? 'text-foreground' : 'text-muted-foreground/50'
                          }`}>
                            {item.label}
                          </span>
                          <button
                            onClick={() => item.available && addWidget(cat.label, item.label)}
                            disabled={!item.available}
                            title={item.available ? item.description : 'Not yet available'}
                            className={`ml-2 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              !item.available
                                ? 'opacity-20 cursor-not-allowed'
                                : isAdded
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel — widget preview / info */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        {added.size === 0 ? (
          <div className="space-y-3 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-muted/20 border border-border flex items-center justify-center mx-auto">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-mono font-bold text-foreground">No widgets selected</h2>
            <p className="text-[12px] font-mono text-muted-foreground leading-relaxed">
              Expand a category on the left and click the + button next to any widget to add it to your dashboard.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-lg space-y-3">
            <h2 className="text-sm font-mono font-bold text-foreground text-left">
              {added.size} widget{added.size !== 1 ? 's' : ''} selected
            </h2>
            <div className="space-y-1.5">
              {Array.from(added).map(key => {
                const [catLabel, itemLabel] = key.split(':')
                const cat = WIDGET_CATEGORIES.find(c => c.label === catLabel)
                const item = cat?.items.find(i => i.label === itemLabel)
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card">
                    <div className="text-left">
                      <p className="text-[12px] font-mono font-semibold text-foreground">{itemLabel}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{catLabel} &middot; {item?.description}</p>
                    </div>
                    <button
                      onClick={() => addWidget(catLabel, itemLabel)}
                      className="text-[10px] font-mono text-destructive hover:text-destructive/80 transition-colors ml-4 flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
            <button className="w-full mt-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-mono font-semibold hover:bg-primary/90 transition-colors">
              Add to Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
