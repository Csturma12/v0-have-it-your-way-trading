'use client'

import { useState } from 'react'
import { AccountSummary } from './account-summary'
import { TradingModeToggle } from './trading-mode-toggle'
import { TopNavBar } from './top-nav-bar'
import { WidgetGrid } from './widget-grid'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

export function TradingDashboard() {
  const [selectedTicker, setSelectedTicker] = useState('NVDA')
  const [tradingMode, setTradingMode] = useState<'autonomous' | 'manual'>('manual')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <TopNavBar />

      {/* Sub-header: Trading Mode + Account Summary + Paper Trading Badge */}
      <div className="border-b border-border bg-card/30 px-4 py-2 flex items-center justify-between gap-4 flex-shrink-0">
        <TradingModeToggle mode={tradingMode} onModeChange={setTradingMode} />
        <div className="flex items-center gap-4">
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-mono uppercase tracking-wider"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Paper Trading Only
          </Badge>
          <AccountSummary />
        </div>
      </div>

      {/* Main workspace — left sidebar sectors + right resizable grid */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <WidgetGrid
          selectedTicker={selectedTicker}
          onSelectTicker={setSelectedTicker}
        />
      </main>
    </div>
  )
}
