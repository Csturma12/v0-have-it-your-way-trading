'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Zap, Flame, Target, ArrowRight } from 'lucide-react'

interface TradeIdea {
  ticker: string
  action: 'buy' | 'sell'
  reason: string
  strength: 'high' | 'medium' | 'low'
  price?: number
  change?: number
}

interface QuickTradeIdeasProps {
  onSelectIdea?: (ticker: string, action: 'buy' | 'sell') => void
}

export function QuickTradeIdeas({ onSelectIdea }: QuickTradeIdeasProps) {
  const [ideas, setIdeas] = useState<TradeIdea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulated trade ideas - in production, fetch from AI/signals API
    const mockIdeas: TradeIdea[] = [
      { ticker: 'NVDA', action: 'buy', reason: 'AI momentum', strength: 'high', price: 205.10, change: 4.04 },
      { ticker: 'TSLA', action: 'buy', reason: 'Breakout setup', strength: 'medium', price: 178.50, change: 2.15 },
      { ticker: 'META', action: 'buy', reason: 'Dark pool activity', strength: 'high', price: 512.30, change: 1.82 },
      { ticker: 'AMD', action: 'sell', reason: 'Resistance hit', strength: 'medium', price: 162.40, change: -1.25 },
      { ticker: 'AAPL', action: 'buy', reason: 'Earnings play', strength: 'low', price: 189.20, change: 0.75 },
    ]
    
    setTimeout(() => {
      setIdeas(mockIdeas)
      setLoading(false)
    }, 500)
  }, [])

  const strengthColors = {
    high: 'bg-green-500/20 border-green-500/40 text-green-400',
    medium: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
    low: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  }

  const strengthIcons = {
    high: Flame,
    medium: Target,
    low: Zap,
  }

  if (loading) {
    return (
      <div className="p-2 border-t border-border">
        <div className="text-[9px] font-mono font-bold text-foreground/70 uppercase tracking-wide mb-2">
          Trade Ideas
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 w-20 bg-muted/20 rounded animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-mono font-bold text-foreground/70 uppercase tracking-wide flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" />
          Trade Ideas
        </div>
        <span className="text-[8px] font-mono text-muted-foreground">{ideas.length} active</span>
      </div>

      {/* Horizontal scrollable pill box */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {ideas.map((idea) => {
          const StrengthIcon = strengthIcons[idea.strength]
          const isPositive = idea.action === 'buy'
          
          return (
            <button
              key={idea.ticker}
              onClick={() => onSelectIdea?.(idea.ticker, idea.action)}
              className={`flex-shrink-0 p-1.5 rounded border transition-all hover:scale-105 cursor-pointer ${
                isPositive 
                  ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' 
                  : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {/* Action indicator */}
                <div className={`p-0.5 rounded ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {isPositive 
                    ? <TrendingUp className="w-2.5 h-2.5 text-green-400" />
                    : <TrendingDown className="w-2.5 h-2.5 text-red-400" />
                  }
                </div>
                
                {/* Ticker + info */}
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-foreground">{idea.ticker}</span>
                    <span className={`text-[8px] font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{idea.change?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <StrengthIcon className={`w-2 h-2 ${strengthColors[idea.strength].split(' ')[2]}`} />
                    <span className="text-[7px] font-mono text-muted-foreground truncate max-w-[60px]">
                      {idea.reason}
                    </span>
                  </div>
                </div>
                
                {/* Arrow */}
                <ArrowRight className={`w-2.5 h-2.5 ${isPositive ? 'text-green-400/50' : 'text-red-400/50'}`} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border/30">
        <div className="flex items-center gap-0.5">
          <Flame className="w-2 h-2 text-green-400" />
          <span className="text-[7px] font-mono text-muted-foreground">High</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Target className="w-2 h-2 text-yellow-400" />
          <span className="text-[7px] font-mono text-muted-foreground">Med</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Zap className="w-2 h-2 text-blue-400" />
          <span className="text-[7px] font-mono text-muted-foreground">Low</span>
        </div>
      </div>
    </div>
  )
}
