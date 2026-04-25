'use client'

import { TrendingUp, Wallet, BarChart3, Activity } from 'lucide-react'

export function AccountSummary() {
  return (
    <div className="flex items-center gap-4">
      {/* Portfolio Value */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50">
        <Wallet className="w-3.5 h-3.5 text-primary" />
        <div className="text-right">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Portfolio</div>
          <div className="text-sm font-mono font-bold text-foreground">$125,847.32</div>
        </div>
      </div>

      {/* Day P&L */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/5 border border-green-500/20">
        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
        <div className="text-right">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Day P&L</div>
          <div className="text-sm font-mono font-bold text-green-400">+$2,347.89</div>
        </div>
      </div>

      {/* Buying Power */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50">
        <BarChart3 className="w-3.5 h-3.5 text-theme-gold" />
        <div className="text-right">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Buying Power</div>
          <div className="text-sm font-mono font-bold text-foreground">$45,230.00</div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50">
        <Activity className="w-3.5 h-3.5 text-theme-cyan" />
        <div className="text-right">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Positions</div>
          <div className="text-sm font-mono font-bold text-foreground">12 Open</div>
        </div>
      </div>
    </div>
  )
}
