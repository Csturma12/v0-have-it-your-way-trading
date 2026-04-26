'use client'

import { useState } from 'react'
import { AccountSummary } from './account-summary'
import { TradingModeToggle } from './trading-mode-toggle'
import { SettingsBar } from './settings-bar'
import { WidgetGrid } from './widget-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, LayoutDashboard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export function TradingDashboard() {
  const [selectedTicker, setSelectedTicker] = useState('NVDA')
  const [tradingMode, setTradingMode] = useState<'autonomous' | 'manual'>('manual')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
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
            <AccountSummary />
          </div>
        </div>
      </header>

      {/* Beta / Dashboard pill row */}
      <div className="border-b border-border bg-card/20 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-7 text-[11px] font-mono uppercase tracking-wider border-primary/30 text-primary hover:bg-primary/10 bg-transparent"
        >
          <Zap className="w-3 h-3" />
          Join the Beta
        </Button>
        <Link href="/dashboard">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-7 text-[11px] font-mono uppercase tracking-wider border-theme-gold/30 text-theme-gold hover:bg-theme-gold/10 bg-transparent"
          >
            <LayoutDashboard className="w-3 h-3" />
            View Dashboard
          </Button>
        </Link>
        <Badge
          variant="outline"
          className="ml-auto bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-mono uppercase tracking-wider"
        >
          <AlertTriangle className="w-3 h-3 mr-1" />
          Paper Trading Only
        </Badge>
      </div>

      {/* Main workspace — left sidebar sectors + right resizable grid */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <WidgetGrid
          selectedTicker={selectedTicker}
          onSelectTicker={setSelectedTicker}
        />
      </main>

      {/* Settings Bar */}
      <SettingsBar />
    </div>
  )
}
