'use client'

import { Bot, Hand } from 'lucide-react'

interface TradingModeToggleProps {
  mode: 'autonomous' | 'manual'
  onModeChange: (mode: 'autonomous' | 'manual') => void
}

export function TradingModeToggle({ mode, onModeChange }: TradingModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        Have it your way trading:
      </span>
      <div className="flex items-center bg-muted/30 rounded-lg border border-border/50 p-0.5">
        <button
          onClick={() => onModeChange('autonomous')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
            mode === 'autonomous'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Autonomous
        </button>
        <button
          onClick={() => onModeChange('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
            mode === 'manual'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          Manual Entry
        </button>
      </div>
    </div>
  )
}
