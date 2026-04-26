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
      { label: 'Order Entry',           description: 'Buy/sell order ticket with limit, market, and stop types',    available: true  },
      { label: 'Classic Trade',         description: 'Traditional order entry interface',                            available: true  },
      { label: 'TurboTrader',           description: 'Fast trading interface with keyboard shortcuts',              available: true  },
      { label: 'TurboTrader Futures',   description: 'Optimized for futures trading',                               available: true  },
      { label: 'TurboTrader Options',   description: 'Specialized interface for options trading',                   available: false },
      { label: 'Turbo Order Entry',     description: 'Quick order entry with customizable hotkeys',                 available: true  },
      { label: 'Orders',                description: 'Pending and filled orders with cancel/modify actions',        available: true  },
      { label: 'Positions',             description: 'Open positions with real-time P&L and cost basis',           available: true  },
      { label: 'Account Info',          description: 'Account balance, buying power, and portfolio overview',       available: true  },
      { label: 'Performance',           description: 'P&L summary and trading performance metrics',                 available: true  },
      { label: 'Banking',               description: 'Deposit, withdrawal, and fund transfer management',           available: true  },
      { label: 'Price Ladder',          description: 'Interactive price ladder for quick order entry',              available: false },
      { label: 'IPO Orders',            description: 'IPO allocation and order management',                          available: false },
    ],
  },
  {
    label: 'Stocks',
    items: [
      { label: 'Order Flow',             description: 'Real-time order flow and large block trades analysis',        available: false },
      { label: 'News',                   description: 'Latest news and press releases for the stock',               available: true  },
      { label: 'Financial Statements',   description: 'Income statement, balance sheet, and cash flow data',        available: true  },
      { label: 'Press Releases',         description: 'Company press releases and investor updates',                available: true  },
      { label: 'Corporate Actions',      description: 'Splits, dividends, mergers, and other corporate events',    available: true  },
      { label: 'Analysis',               description: 'Analyst ratings, price targets, and recommendations',        available: true  },
      { label: 'Short Interest',         description: 'Short interest data and borrow availability',                available: true  },
      { label: 'Institutional Holdings', description: 'Top institutional holders and portfolio positions',          available: true  },
      { label: 'ETF Weighting',          description: 'ETFs holding this stock and weight allocation',              available: false },
      { label: 'Profile',                description: 'Company profile, industry, and business overview',           available: true  },
      { label: 'ETF Details',            description: 'Detailed ETF composition and performance metrics',            available: false },
      { label: 'Related Symbols',        description: 'Competitors, peers, and related securities',                 available: true  },
      { label: 'Comments',               description: 'Community comments and discussions on the stock',            available: true  },
    ],
  },
  {
    label: 'General',
    items: [
      { label: 'Watchlists',        description: 'Custom watchlists with real-time quotes and alerts',          available: true  },
      { label: 'Screeners',         description: 'Stock screener with technical and fundamental filters',       available: true  },
      { label: 'Option Screener',   description: 'Filter options by strike, expiry, volume, and Greeks',       available: false },
      { label: 'Bond Screener',     description: 'Search and filter fixed income securities by yield and rating', available: false },
      { label: 'Alert Message',     description: 'Price, volume, and indicator-based alert notifications',      available: true  },
      { label: 'Note',              description: 'Personal notes and annotations attached to tickers',          available: true  },
      { label: 'Messages',          description: 'In-app messages and broker communications',                   available: false },
      { label: 'Community',         description: 'Community discussion feed and social sentiment',              available: false },
      { label: 'Clock',             description: 'Market session clock with open/close countdown',              available: true  },
    ],
  },
  {
    label: 'Market',
    items: [
      { label: 'Top Gainers',     description: 'Stocks with the largest percentage gains today',             available: true  },
      { label: 'Top Losers',      description: 'Stocks with the largest percentage declines today',          available: true  },
      { label: 'Most Active',     description: 'Highest volume stocks across major exchanges',                available: true  },
      { label: 'Pre-Market',      description: 'Pre-market movers, volume, and price action',                available: true  },
      { label: 'After Hours',     description: 'After-hours movers and extended session price changes',      available: true  },
      { label: 'Hot Sectors',     description: 'Top and bottom performing sectors in real time',             available: true  },
      { label: '52-Week High',    description: 'Stocks hitting new 52-week highs today',                     available: true  },
      { label: '52-Week Low',     description: 'Stocks hitting new 52-week lows today',                      available: true  },
      { label: 'Top Options',     description: 'Most active options contracts by volume and open interest',  available: true  },
      { label: 'ETF List',        description: 'Browse and filter ETFs by category and performance',         available: true  },
      { label: 'Economic Data',   description: 'CPI, NFP, Fed events, and key macro data releases',          available: true  },
      { label: 'IPO',             description: 'Upcoming and recent IPO listings with deal details',         available: true  },
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
