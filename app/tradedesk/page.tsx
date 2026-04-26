'use client'

import { useState } from 'react'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Shield,
  Zap,
  Target,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'

type TradeType = 'stocks' | 'options' | 'multileg' | 'hedges'

interface TradeIdea {
  id: string
  rank: number
  ticker: string
  type: TradeType
  action: 'BUY' | 'SELL'
  confidence: number
  entry: number
  stop: number
  target: number
  riskReward: number
  thesis: string
  strategy?: string
  timeframe?: string
  legs?: string[]
  color?: string
}

const MOCK_IDEAS: TradeIdea[] = [
  // STOCKS - 5 ideas
  {
    id: 'stock-1',
    rank: 1,
    ticker: 'NVDA',
    type: 'stocks',
    action: 'BUY',
    confidence: 92,
    entry: 205.50,
    stop: 195.00,
    target: 230.00,
    riskReward: 3.1,
    thesis: 'Breakout above resistance, AI momentum strong',
    strategy: 'Long Stock',
    timeframe: '2-4 weeks',
    color: 'bg-green-500/10 border-green-500/30',
  },
  {
    id: 'stock-2',
    rank: 2,
    ticker: 'AAPL',
    type: 'stocks',
    action: 'BUY',
    confidence: 85,
    entry: 182.40,
    stop: 175.80,
    target: 200.00,
    riskReward: 2.8,
    thesis: 'Support hold, earnings catalyst approaching',
    strategy: 'Long Stock',
    timeframe: '3-5 weeks',
    color: 'bg-green-500/10 border-green-500/30',
  },
  {
    id: 'stock-3',
    rank: 3,
    ticker: 'AMD',
    type: 'stocks',
    action: 'BUY',
    confidence: 78,
    entry: 156.20,
    stop: 148.50,
    target: 175.00,
    riskReward: 2.5,
    thesis: 'Technical breakout, chip sector rotation',
    strategy: 'Long Stock',
    timeframe: '1-3 weeks',
    color: 'bg-green-500/10 border-green-500/30',
  },
  {
    id: 'stock-4',
    rank: 4,
    ticker: 'META',
    type: 'stocks',
    action: 'BUY',
    confidence: 88,
    entry: 425.80,
    stop: 410.00,
    target: 480.00,
    riskReward: 3.5,
    thesis: 'AI infrastructure build-out, strong fundamentals',
    strategy: 'Long Stock',
    timeframe: '2-3 weeks',
    color: 'bg-green-500/10 border-green-500/30',
  },
  {
    id: 'stock-5',
    rank: 5,
    ticker: 'MSFT',
    type: 'stocks',
    action: 'SELL',
    confidence: 82,
    entry: 440.00,
    stop: 455.00,
    target: 400.00,
    riskReward: 2.7,
    thesis: 'Overbought at resistance, profit taking expected',
    strategy: 'Short Stock',
    timeframe: '1-2 weeks',
    color: 'bg-red-500/10 border-red-500/30',
  },
  // OPTIONS - 5 ideas
  {
    id: 'opt-1',
    rank: 1,
    ticker: 'SPY',
    type: 'options',
    action: 'BUY',
    confidence: 86,
    entry: 2.45,
    stop: 0.80,
    target: 6.50,
    riskReward: 2.2,
    thesis: 'Bull call spread, upside breakout play',
    strategy: 'Bull Call Spread',
    timeframe: '14 DTE',
    legs: ['Long 500 Call', 'Short 510 Call'],
    color: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'opt-2',
    rank: 2,
    ticker: 'QQQ',
    type: 'options',
    action: 'BUY',
    confidence: 79,
    entry: 1.85,
    stop: 0.50,
    target: 4.80,
    riskReward: 2.6,
    thesis: 'Long put for downside protection',
    strategy: 'Long Put',
    timeframe: '21 DTE',
    legs: ['Long 380 Put'],
    color: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'opt-3',
    rank: 3,
    ticker: 'IWM',
    type: 'options',
    action: 'BUY',
    confidence: 81,
    entry: 3.20,
    stop: 1.00,
    target: 8.50,
    riskReward: 2.3,
    thesis: 'Short straddle for range-bound trading',
    strategy: 'Short Straddle',
    timeframe: '7 DTE',
    legs: ['Short 200 Call', 'Short 200 Put'],
    color: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'opt-4',
    rank: 4,
    ticker: 'TLT',
    type: 'options',
    action: 'BUY',
    confidence: 75,
    entry: 1.60,
    stop: 0.40,
    target: 4.20,
    riskReward: 2.0,
    thesis: 'Butterfly spread, precision timing needed',
    strategy: 'Butterfly Spread',
    timeframe: '28 DTE',
    legs: ['Long 100 Call', 'Short 2x 105 Call', 'Long 110 Call'],
    color: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'opt-5',
    rank: 5,
    ticker: 'GLD',
    type: 'options',
    action: 'SELL',
    confidence: 83,
    entry: 2.10,
    stop: 3.80,
    target: 0.30,
    riskReward: 1.8,
    thesis: 'Call spread for income, bearish bias',
    strategy: 'Bear Call Spread',
    timeframe: '10 DTE',
    legs: ['Short 195 Call', 'Long 200 Call'],
    color: 'bg-red-500/10 border-red-500/30',
  },
  // MULTI LEG - 5 ideas
  {
    id: 'multi-1',
    rank: 1,
    ticker: 'SPY',
    type: 'multileg',
    action: 'BUY',
    confidence: 89,
    entry: 3.50,
    stop: 0.80,
    target: 9.20,
    riskReward: 2.8,
    thesis: 'Iron condor for defined risk, high probability',
    strategy: 'Iron Condor',
    timeframe: '21 DTE',
    legs: ['Short 520 Call', 'Long 530 Call', 'Short 480 Put', 'Long 470 Put'],
    color: 'bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'multi-2',
    rank: 2,
    ticker: 'QQQ',
    type: 'multileg',
    action: 'BUY',
    confidence: 84,
    entry: 2.80,
    stop: 0.60,
    target: 7.40,
    riskReward: 2.6,
    thesis: 'Calendar spread with rolling adjustments',
    strategy: 'Calendar Spread',
    timeframe: '45 DTE',
    legs: ['Short 30 DTE Call', 'Long 60 DTE Call'],
    color: 'bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'multi-3',
    rank: 3,
    ticker: 'IWM',
    type: 'multileg',
    action: 'BUY',
    confidence: 77,
    entry: 2.40,
    stop: 0.50,
    target: 6.50,
    riskReward: 2.2,
    thesis: 'Butterfly spread for precision entry',
    strategy: 'Butterfly Spread',
    timeframe: '14 DTE',
    legs: ['Long 200 Call', 'Short 2x 205 Call', 'Long 210 Call'],
    color: 'bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'multi-4',
    rank: 4,
    ticker: 'XLK',
    type: 'multileg',
    action: 'BUY',
    confidence: 81,
    entry: 1.95,
    stop: 0.45,
    target: 5.80,
    riskReward: 2.4,
    thesis: 'Risk reversal for directional + protection',
    strategy: 'Risk Reversal',
    timeframe: '30 DTE',
    legs: ['Long 150 Call', 'Short 140 Put'],
    color: 'bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'multi-5',
    rank: 5,
    ticker: 'DIA',
    type: 'multileg',
    action: 'BUY',
    confidence: 79,
    entry: 3.20,
    stop: 0.70,
    target: 8.10,
    riskReward: 2.5,
    thesis: 'Diagonal spread for income + capital appreciation',
    strategy: 'Diagonal Spread',
    timeframe: '35 DTE',
    legs: ['Long 380 Call far-month', 'Short 375 Call near-month'],
    color: 'bg-purple-500/10 border-purple-500/30',
  },
  // HEDGES - 5 ideas
  {
    id: 'hedge-1',
    rank: 1,
    ticker: 'SPY',
    type: 'hedges',
    action: 'BUY',
    confidence: 87,
    entry: 2.60,
    stop: 0.50,
    target: 7.20,
    riskReward: 2.3,
    thesis: 'Bear put spread for portfolio protection',
    strategy: 'Bear Put Spread',
    timeframe: '28 DTE',
    legs: ['Short 480 Put', 'Long 470 Put'],
    color: 'bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'hedge-2',
    rank: 2,
    ticker: 'QQQ',
    type: 'hedges',
    action: 'BUY',
    confidence: 85,
    entry: 3.10,
    stop: 0.80,
    target: 8.50,
    riskReward: 2.5,
    thesis: 'Protective collar strategy for downside',
    strategy: 'Protective Collar',
    timeframe: '60 DTE',
    legs: ['Long 380 Put', 'Short 420 Call'],
    color: 'bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'hedge-3',
    rank: 3,
    ticker: 'GLD',
    type: 'hedges',
    action: 'BUY',
    confidence: 82,
    entry: 1.85,
    stop: 0.40,
    target: 5.20,
    riskReward: 2.1,
    thesis: 'Gold long for economic uncertainty hedge',
    strategy: 'Long Gold',
    timeframe: '6-8 weeks',
    color: 'bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'hedge-4',
    rank: 4,
    ticker: 'TLT',
    type: 'hedges',
    action: 'BUY',
    confidence: 80,
    entry: 2.40,
    stop: 0.60,
    target: 6.80,
    riskReward: 2.4,
    thesis: 'Bond futures for rate volatility protection',
    strategy: 'Long Bonds',
    timeframe: '4-6 weeks',
    color: 'bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'hedge-5',
    rank: 5,
    ticker: 'UVXY',
    type: 'hedges',
    action: 'BUY',
    confidence: 76,
    entry: 12.50,
    stop: 8.00,
    target: 22.80,
    riskReward: 1.9,
    thesis: 'VIX call spreads for tail risk protection',
    strategy: 'VIX Calls',
    timeframe: '14 DTE',
    color: 'bg-orange-500/10 border-orange-500/30',
  },
]

export default function TradeDeskPage() {
  const [activeTab, setActiveTab] = useState<TradeType>('stocks')
  const [searchTicker, setSearchTicker] = useState('')
  const [model] = useState<'claude' | 'openai'>('claude')

  const ideas = MOCK_IDEAS.filter((idea) => idea.type === activeTab)

  const tabs: { label: string; value: TradeType; icon: React.ReactNode; color: string }[] = [
    { label: 'STOCKS', value: 'stocks', icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-400' },
    { label: 'OPTIONS', value: 'options', icon: <Layers className="w-4 h-4" />, color: 'text-blue-400' },
    { label: 'MULTI LEG', value: 'multileg', icon: <BarChart3 className="w-4 h-4" />, color: 'text-purple-400' },
    { label: 'HEDGES', value: 'hedges', icon: <Shield className="w-4 h-4" />, color: 'text-orange-400' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />

      <header className="border-b border-border bg-card/30 sticky top-0 z-40">
        <div className="px-6 py-3">
          <h1 className="text-lg font-mono font-bold tracking-wide uppercase text-foreground">Trade Desk</h1>
        </div>

        {/* Filter Bar */}
        <div className="border-t border-border px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] font-mono text-muted-foreground">Model:</span>
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
              {model === 'claude' ? 'Claude' : 'OpenAI'}
            </Badge>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search ticker..."
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              className="h-7 text-xs bg-muted/30 border-border/50"
            />
          </div>

          <Button size="sm" className="gap-1.5 h-7 text-xs bg-primary/20 hover:bg-primary/30 border-primary/30">
            <RefreshCw className="w-3 h-3" />
            Generate Ideas
          </Button>
        </div>

        {/* Tab Bar */}
        <div className="border-t border-border px-6 py-2 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-colors ${
                activeTab === tab.value
                  ? `${tab.color} bg-muted/40 border border-muted/50`
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6">
        <div className="grid gap-4">
          {ideas.map((idea) => {
            const isStock = idea.type === 'stocks'
            const isOptions = idea.type === 'options'
            const isMultiLeg = idea.type === 'multileg'
            const isHedge = idea.type === 'hedges'

            return (
              <div
                key={idea.id}
                className={`rounded-lg p-5 border transition-all hover:shadow-lg ${idea.color || 'bg-card/50 border-border'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/20 border-primary/30 text-primary font-bold">
                      #{idea.rank}
                    </Badge>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-foreground">{idea.ticker}</span>
                        <Badge variant="outline" className="text-[9px] bg-muted/30">
                          {idea.strategy}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{idea.thesis}</p>
                    </div>
                  </div>
                  <Badge className={idea.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                    {idea.action}
                  </Badge>
                </div>

                {/* Confidence Bar */}
                <div className="mb-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-mono font-bold text-foreground">{idea.confidence}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        idea.confidence >= 85 ? 'bg-green-500' : idea.confidence >= 75 ? 'bg-yellow-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${idea.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Price Levels */}
                <div className="grid grid-cols-4 gap-2 mb-3 text-[10px]">
                  <div className="bg-muted/30 rounded p-2">
                    <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Entry</div>
                    <div className="font-mono font-bold text-foreground">${idea.entry.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-2">
                    <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Stop</div>
                    <div className="font-mono font-bold text-red-400">${idea.stop.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-2">
                    <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Target</div>
                    <div className="font-mono font-bold text-green-400">${idea.target.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted/30 rounded p-2">
                    <div className="text-muted-foreground uppercase tracking-wide mb-0.5">R:R</div>
                    <div className="font-mono font-bold text-blue-400">{idea.riskReward.toFixed(1)}:1</div>
                  </div>
                </div>

                {/* Legs (for options/multi-leg) */}
                {(isOptions || isMultiLeg) && idea.legs && (
                  <div className="mb-3 space-y-1 text-[9px]">
                    <span className="text-muted-foreground uppercase tracking-wide">Legs</span>
                    <div className="flex flex-wrap gap-1">
                      {idea.legs.map((leg, i) => (
                        <Badge key={i} variant="outline" className="bg-muted/30">
                          {leg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info Bar */}
                <div className="flex items-center justify-between text-[9px] mb-3 p-2 bg-muted/20 rounded">
                  <div className="flex items-center gap-3">
                    {idea.timeframe && (
                      <div>
                        <span className="text-muted-foreground">Timeframe:</span>
                        <span className="ml-1 text-foreground font-mono">{idea.timeframe}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    AI Generated
                  </div>
                </div>

                {/* Stage Trade Button */}
                <Button className="w-full gap-2 h-8 text-sm font-mono font-semibold rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary">
                  <Target className="w-3.5 h-3.5" />
                  Stage Trade
                </Button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
