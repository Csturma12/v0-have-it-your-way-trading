'use client'

import { useState } from 'react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { BarChart3, Brain, Sparkles, Clock, Target, CheckCircle, Search, Filter } from 'lucide-react'

type Model = 'claude' | 'openai'

interface OptionLeg {
  action: 'buy' | 'sell'
  type: 'call' | 'put'
  strike: number
  expiry: string
  price: number
}

interface OptionIdea {
  id: number
  ticker: string
  strategy: string
  action: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  legs: OptionLeg[]
  maxProfit: string
  maxLoss: string
  breakeven: string
  thesis: string
  timeframe: string
  riskReward: string
  model: Model
}

const CLAUDE_IDEAS: OptionIdea[] = [
  { 
    id: 1, ticker: 'NVDA', strategy: 'Bull Call Spread', action: 'bullish', confidence: 92,
    legs: [
      { action: 'buy', type: 'call', strike: 880, expiry: 'May 17', price: 28.50 },
      { action: 'sell', type: 'call', strike: 920, expiry: 'May 17', price: 14.20 },
    ],
    maxProfit: '$2,570', maxLoss: '$1,430', breakeven: '$894.30',
    thesis: 'Defined risk play on AI momentum. Earnings catalyst ahead. IV percentile at 45%.', timeframe: '3 weeks', riskReward: '1.8:1', model: 'claude'
  },
  { 
    id: 2, ticker: 'AAPL', strategy: 'Long Call', action: 'bullish', confidence: 85,
    legs: [
      { action: 'buy', type: 'call', strike: 180, expiry: 'Jun 21', price: 8.40 },
    ],
    maxProfit: 'Unlimited', maxLoss: '$840', breakeven: '$188.40',
    thesis: 'WWDC catalyst. Services growth. Low IV environment favorable for long premium.', timeframe: '6 weeks', riskReward: '3:1+', model: 'claude'
  },
  { 
    id: 3, ticker: 'SPY', strategy: 'Iron Condor', action: 'neutral', confidence: 78,
    legs: [
      { action: 'sell', type: 'put', strike: 495, expiry: 'May 10', price: 2.10 },
      { action: 'buy', type: 'put', strike: 490, expiry: 'May 10', price: 1.35 },
      { action: 'sell', type: 'call', strike: 520, expiry: 'May 10', price: 1.80 },
      { action: 'buy', type: 'call', strike: 525, expiry: 'May 10', price: 0.95 },
    ],
    maxProfit: '$160', maxLoss: '$340', breakeven: '$493.40 / $521.60',
    thesis: 'Range-bound market. VIX elevated. Collect premium in low-catalyst week.', timeframe: '2 weeks', riskReward: '0.47:1', model: 'claude'
  },
  { 
    id: 4, ticker: 'TSLA', strategy: 'Long Put', action: 'bearish', confidence: 74,
    legs: [
      { action: 'buy', type: 'put', strike: 240, expiry: 'May 24', price: 12.80 },
    ],
    maxProfit: '$24,000', maxLoss: '$1,280', breakeven: '$227.20',
    thesis: 'Delivery miss concerns. China competition. Technical breakdown below 250.', timeframe: '4 weeks', riskReward: '3:1', model: 'claude'
  },
  { 
    id: 5, ticker: 'META', strategy: 'Call Diagonal', action: 'bullish', confidence: 81,
    legs: [
      { action: 'buy', type: 'call', strike: 480, expiry: 'Jul 19', price: 32.50 },
      { action: 'sell', type: 'call', strike: 510, expiry: 'May 17', price: 8.20 },
    ],
    maxProfit: '$2,470', maxLoss: '$2,430', breakeven: '$504.30',
    thesis: 'Reduce cost basis via short call. Reels monetization tailwind. Calendar decay advantage.', timeframe: '3 weeks', riskReward: '1.02:1', model: 'claude'
  },
]

const OPENAI_IDEAS: OptionIdea[] = [
  { 
    id: 1, ticker: 'MSFT', strategy: 'Bull Put Spread', action: 'bullish', confidence: 89,
    legs: [
      { action: 'sell', type: 'put', strike: 410, expiry: 'May 17', price: 6.80 },
      { action: 'buy', type: 'put', strike: 400, expiry: 'May 17', price: 4.20 },
    ],
    maxProfit: '$260', maxLoss: '$740', breakeven: '$407.40',
    thesis: 'Azure strength. Support at 400. Premium collection with defined risk.', timeframe: '3 weeks', riskReward: '0.35:1', model: 'openai'
  },
  { 
    id: 2, ticker: 'GOOGL', strategy: 'Straddle', action: 'neutral', confidence: 82,
    legs: [
      { action: 'buy', type: 'call', strike: 155, expiry: 'May 24', price: 5.40 },
      { action: 'buy', type: 'put', strike: 155, expiry: 'May 24', price: 4.80 },
    ],
    maxProfit: 'Unlimited', maxLoss: '$1,020', breakeven: '$144.80 / $165.20',
    thesis: 'Earnings volatility play. Expected move underpriced. Big move either direction.', timeframe: '4 weeks', riskReward: '2:1+', model: 'openai'
  },
  { 
    id: 3, ticker: 'AMZN', strategy: 'Call Butterfly', action: 'bullish', confidence: 76,
    legs: [
      { action: 'buy', type: 'call', strike: 175, expiry: 'Jun 21', price: 10.20 },
      { action: 'sell', type: 'call', strike: 185, expiry: 'Jun 21', price: 5.80 },
      { action: 'sell', type: 'call', strike: 185, expiry: 'Jun 21', price: 5.80 },
      { action: 'buy', type: 'call', strike: 195, expiry: 'Jun 21', price: 3.10 },
    ],
    maxProfit: '$830', maxLoss: '$170', breakeven: '$176.70 / $193.30',
    thesis: 'Target 185 by expiration. Low cost entry. AWS re-acceleration thesis.', timeframe: '6 weeks', riskReward: '4.9:1', model: 'openai'
  },
  { 
    id: 4, ticker: 'AMD', strategy: 'Covered Call', action: 'bullish', confidence: 84,
    legs: [
      { action: 'buy', type: 'call', strike: 155, expiry: 'Stock', price: 155.00 },
      { action: 'sell', type: 'call', strike: 165, expiry: 'May 17', price: 4.20 },
    ],
    maxProfit: '$1,420', maxLoss: '$15,080', breakeven: '$150.80',
    thesis: 'Income generation. Cap gains at 165. MI300X momentum continues.', timeframe: '3 weeks', riskReward: '0.09:1', model: 'openai'
  },
  { 
    id: 5, ticker: 'QQQ', strategy: 'Bear Put Spread', action: 'bearish', confidence: 71,
    legs: [
      { action: 'buy', type: 'put', strike: 440, expiry: 'May 24', price: 8.60 },
      { action: 'sell', type: 'put', strike: 425, expiry: 'May 24', price: 4.40 },
    ],
    maxProfit: '$1,080', maxLoss: '$420', breakeven: '$435.80',
    thesis: 'Tech rotation risk. Rates higher for longer. Hedge existing long exposure.', timeframe: '4 weeks', riskReward: '2.57:1', model: 'openai'
  },
]

export default function OptionsPage() {
  const [selectedModel, setSelectedModel] = useState<Model>('claude')
  const [searchTicker, setSearchTicker] = useState('')
  const [stagedTrades, setStagedTrades] = useState<number[]>([])

  const ideas = selectedModel === 'claude' ? CLAUDE_IDEAS : OPENAI_IDEAS
  const filteredIdeas = searchTicker 
    ? ideas.filter(i => i.ticker.toLowerCase().includes(searchTicker.toLowerCase()))
    : ideas

  const stageTrade = (id: number) => {
    if (stagedTrades.includes(id)) {
      setStagedTrades(stagedTrades.filter(t => t !== id))
    } else {
      setStagedTrades([...stagedTrades, id])
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavBar />
      
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-amber-400" />
                Options Trade Ideas
              </h1>
              <p className="text-sm text-muted-foreground mt-1">AI-powered options strategies with defined risk</p>
            </div>
            
            {/* Model Toggle */}
            <div className="flex items-center gap-2 p-1 bg-card/50 border border-border rounded-lg">
              <button
                onClick={() => setSelectedModel('claude')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                  selectedModel === 'claude'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Brain className="w-4 h-4" />
                Claude
              </button>
              <button
                onClick={() => setSelectedModel('openai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                  selectedModel === 'openai'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                OpenAI
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ticker..."
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card/50 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Filter className="w-3 h-3" />
              <span>{filteredIdeas.length} ideas</span>
              <span className="text-amber-400">|</span>
              <span>{stagedTrades.length} staged</span>
            </div>
          </div>

          {/* Trade Ideas Grid */}
          <div className="grid gap-4">
            {filteredIdeas.map((idea, index) => (
              <div
                key={idea.id}
                className={`relative p-5 rounded-xl border transition-all ${
                  stagedTrades.includes(idea.id)
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-card/50 border-border hover:border-amber-500/30'
                }`}
              >
                {/* Rank Badge */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>

                <div className="flex items-start justify-between">
                  {/* Left: Strategy & Legs */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-500/20 text-amber-400">
                        {idea.strategy}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        idea.action === 'bullish' ? 'bg-green-500/20 text-green-400' :
                        idea.action === 'bearish' ? 'bg-red-500/20 text-red-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {idea.action}
                      </span>
                    </div>
                    
                    {/* Legs */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {idea.legs.map((leg, i) => (
                        <div key={i} className="px-2 py-1 rounded bg-muted/30 text-xs font-mono">
                          <span className={leg.action === 'buy' ? 'text-green-400' : 'text-red-400'}>
                            {leg.action.toUpperCase()}
                          </span>
                          <span className="text-muted-foreground"> {leg.strike} </span>
                          <span className={leg.type === 'call' ? 'text-cyan-400' : 'text-amber-400'}>
                            {leg.type.toUpperCase()}
                          </span>
                          <span className="text-muted-foreground"> {leg.expiry}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 max-w-2xl">{idea.thesis}</p>
                    
                    {/* P&L Levels */}
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <div>
                        <span className="text-muted-foreground">Max Profit:</span>
                        <span className="ml-1 text-green-400">{idea.maxProfit}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Loss:</span>
                        <span className="ml-1 text-red-400">{idea.maxLoss}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Breakeven:</span>
                        <span className="ml-1 text-foreground">{idea.breakeven}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">R:R</span>
                        <span className="ml-1 text-cyan-400">{idea.riskReward}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Confidence & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-amber-400">{idea.confidence}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {idea.timeframe}
                    </div>

                    <button
                      onClick={() => stageTrade(idea.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        stagedTrades.includes(idea.id)
                          ? 'bg-amber-500 text-black'
                          : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40'
                      }`}
                    >
                      {stagedTrades.includes(idea.id) ? (
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Staged</span>
                      ) : (
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Stage Trade</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trade History */}
          <div className="mt-8 p-6 rounded-xl border border-border bg-card/30">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Execution History
            </h2>
            <div className="text-sm text-muted-foreground text-center py-8">
              No options trades executed yet. Stage a trade above to get started.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
