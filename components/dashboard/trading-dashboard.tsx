'use client'

import { useState } from 'react'
import { SectorPillBox } from './sector-pill-box'
import { ThemesColumn } from './themes-column'
import { TradingViewChart } from './tradingview-chart'
import { WatchlistPanel } from './watchlist-panel'
import { AccountSummary } from './account-summary'
import { TradingModeToggle } from './trading-mode-toggle'
import { SettingsBar } from './settings-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, LayoutDashboard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export function TradingDashboard() {
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const [tradingMode, setTradingMode] = useState<'autonomous' | 'manual'>('manual')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Trading Mode */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/20 rounded">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold font-mono tracking-wide">SIGNAL FORGE</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <TradingModeToggle mode={tradingMode} onModeChange={setTradingMode} />
            </div>

            {/* Right: Account Summary */}
            <AccountSummary />
          </div>
        </div>
      </header>

      {/* Main Layout: 3 columns on top, full-width chart below */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Row: Sectors | Themes | Watchlist */}
        <div className="flex border-b border-border max-h-[60vh] overflow-hidden">
          {/* Left Column: Sector Pill Boxes */}
          <aside className="w-80 border-r border-border bg-card/30 overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold tracking-wide text-foreground font-mono uppercase">
                  Sectors
                </h2>
                <span className="text-[10px] font-mono tracking-widest text-muted-foreground">
                  6 ACTIVE
                </span>
              </div>
              <SectorPillBox
                title="AI & Technology"
                accent="green"
                tickers={['NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'AMD', 'ORCL', 'CRM']}
                alerts={[
                  { ticker: 'NVDA', signal: 'BUY', confidence: 0.92, reason: 'Breakout above $950 resistance' },
                  { ticker: 'AMD', signal: 'BUY', confidence: 0.85, reason: 'AI chip demand surge' },
                  { ticker: 'META', signal: 'BUY', confidence: 0.78, reason: 'Strong ad revenue growth' },
                ]}
                onSelectTicker={setSelectedTicker}
              />
              <SectorPillBox
                title="Banking & Finance"
                accent="gold"
                tickers={['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BRK.B']}
                alerts={[
                  { ticker: 'JPM', signal: 'BUY', confidence: 0.88, reason: 'NII expansion beat estimates' },
                  { ticker: 'GS', signal: 'BUY', confidence: 0.82, reason: 'M&A pipeline strengthening' },
                  { ticker: 'AXP', signal: 'SELL', confidence: 0.75, reason: 'Consumer spending slowing' },
                ]}
                onSelectTicker={setSelectedTicker}
              />
              <SectorPillBox
                title="Energy & Industrials"
                accent="red"
                tickers={['XOM', 'CVX', 'COP', 'SLB', 'HAL', 'OXY', 'PSX', 'VLO']}
                alerts={[
                  { ticker: 'XOM', signal: 'BUY', confidence: 0.85, reason: 'Oil price momentum' },
                  { ticker: 'SLB', signal: 'BUY', confidence: 0.80, reason: 'Drilling activity increase' },
                  { ticker: 'OXY', signal: 'SELL', confidence: 0.72, reason: 'Debt concerns persist' },
                ]}
                onSelectTicker={setSelectedTicker}
              />
              <SectorPillBox
                title="Healthcare & BioPharma"
                accent="cyan"
                tickers={['LLY', 'NVO', 'JNJ', 'MRK', 'ABBV', 'PFE', 'BMY', 'AMGN']}
                alerts={[
                  { ticker: 'LLY', signal: 'BUY', confidence: 0.95, reason: 'GLP-1 dominance continues' },
                  { ticker: 'NVO', signal: 'BUY', confidence: 0.90, reason: 'Wegovy demand surge' },
                  { ticker: 'PFE', signal: 'SELL', confidence: 0.68, reason: 'COVID revenue decline' },
                ]}
                onSelectTicker={setSelectedTicker}
              />
              <SectorPillBox
                title="Consumer & Retail"
                accent="green"
                tickers={['AMZN', 'WMT', 'COST', 'TGT', 'HD', 'MCD', 'SBUX', 'NKE']}
                alerts={[
                  { ticker: 'COST', signal: 'BUY', confidence: 0.88, reason: 'Membership growth strong' },
                  { ticker: 'WMT', signal: 'BUY', confidence: 0.82, reason: 'E-commerce gains' },
                  { ticker: 'TGT', signal: 'SELL', confidence: 0.70, reason: 'Margin pressure' },
                ]}
                onSelectTicker={setSelectedTicker}
              />
              <SectorPillBox
                title="Semiconductors"
                accent="gold"
                tickers={['NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'MU', 'AMAT', 'KLAC']}
                alerts={[
                  { ticker: 'AVGO', signal: 'BUY', confidence: 0.90, reason: 'AI networking demand' },
                  { ticker: 'MU', signal: 'BUY', confidence: 0.85, reason: 'Memory price recovery' },
                  { ticker: 'INTC', signal: 'SELL', confidence: 0.75, reason: 'Foundry delays' },
                ]}
                onSelectTicker={setSelectedTicker}
              />
            </div>
          </aside>

          {/* Middle Column: Themes Pill Boxes */}
          <div className="flex-1 border-r border-border bg-card/20 overflow-y-auto">
            <ThemesColumn onSelectTicker={setSelectedTicker} />
          </div>

          {/* Right Column: Watchlist */}
          <aside className="w-80 bg-card/30 overflow-y-auto flex-shrink-0">
            <WatchlistPanel onSelectTicker={setSelectedTicker} selectedTicker={selectedTicker} />
          </aside>
        </div>

        {/* Bottom Row: Full-width TradingView Chart */}
        <div className="flex-1 min-h-[500px] flex flex-col overflow-hidden bg-background">
          <TradingViewChart ticker={selectedTicker} />
        </div>
      </main>

      {/* Beta / Dashboard Buttons */}
      <div className="border-t border-border bg-card/50 px-4 py-2">
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <Zap className="w-3.5 h-3.5" />
            Join the Beta
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="gap-2 border-theme-gold/30 text-theme-gold hover:bg-theme-gold/10">
              <LayoutDashboard className="w-3.5 h-3.5" />
              View Dashboard
            </Button>
          </Link>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Paper Trading Only
          </Badge>
        </div>
      </div>

      {/* Settings Bar */}
      <SettingsBar />
    </div>
  )
}
