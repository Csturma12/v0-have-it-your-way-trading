'use client'

import { useState } from 'react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { Shield, Brain, Sparkles, Clock, Target, CheckCircle, Search, Filter, AlertTriangle } from 'lucide-react'

type Model = 'claude' | 'openai'

interface HedgeLeg {
  action: 'buy' | 'sell'
  type: 'call' | 'put' | 'stock' | 'etf'
  strike?: number
  expiry?: string
  ticker?: string
  qty: number
  price: number
}

interface HedgeIdea {
  id: number
  ticker: string
  strategy: string
  hedgeType: 'portfolio' | 'position' | 'tail-risk' | 'correlation'
  confidence: number
  legs: HedgeLeg[]
  protection: string
  cost: string
  breakeven: string
  thesis: string
  timeframe: string
  portfolioImpact: string
  model: Model
}

const CLAUDE_IDEAS: HedgeIdea[] = [
  { 
    id: 1, ticker: 'SPY', strategy: 'Put Spread Collar', hedgeType: 'portfolio', confidence: 91,
    legs: [
      { action: 'buy', type: 'put', strike: 490, expiry: 'Jun 21', qty: 10, price: 8.40 },
      { action: 'sell', type: 'put', strike: 470, expiry: 'Jun 21', qty: 10, price: 4.20 },
      { action: 'sell', type: 'call', strike: 540, expiry: 'Jun 21', qty: 10, price: 3.80 },
    ],
    protection: '-10% to -14%', cost: '$4,200 net debit', breakeven: '$485.80',
    thesis: 'Portfolio protection with capped upside. Collar finances put spread. 60/40 portfolio hedge.', timeframe: '8 weeks', portfolioImpact: '-0.42% drag', model: 'claude'
  },
  { 
    id: 2, ticker: 'VIX', strategy: 'VIX Call Spread', hedgeType: 'tail-risk', confidence: 85,
    legs: [
      { action: 'buy', type: 'call', strike: 20, expiry: 'May 22', qty: 20, price: 1.80 },
      { action: 'sell', type: 'call', strike: 35, expiry: 'May 22', qty: 20, price: 0.45 },
    ],
    protection: 'VIX 20-35 spike', cost: '$2,700 debit', breakeven: 'VIX > 21.35',
    thesis: 'Tail risk hedge for volatility spike. Pays off in market panic. Low cost catastrophe insurance.', timeframe: '4 weeks', portfolioImpact: '-0.27% drag', model: 'claude'
  },
  { 
    id: 3, ticker: 'GLD', strategy: 'Gold Allocation', hedgeType: 'correlation', confidence: 82,
    legs: [
      { action: 'buy', type: 'etf', ticker: 'GLD', qty: 50, price: 215.80 },
    ],
    protection: 'Inflation/geopolitical', cost: '$10,790 allocation', breakeven: 'N/A - hedge',
    thesis: 'Negative equity correlation. Geopolitical hedge. Real yield compression play.', timeframe: 'Ongoing', portfolioImpact: '5% allocation', model: 'claude'
  },
  { 
    id: 4, ticker: 'TLT', strategy: 'Bond Duration Hedge', hedgeType: 'correlation', confidence: 78,
    legs: [
      { action: 'buy', type: 'etf', ticker: 'TLT', qty: 100, price: 92.40 },
      { action: 'buy', type: 'put', strike: 88, expiry: 'Jun 21', qty: 1, price: 2.10 },
    ],
    protection: 'Rate shock / flight to safety', cost: '$9,450 total', breakeven: 'TLT > $94.50',
    thesis: 'Duration exposure with downside protection. Flight-to-quality hedge. Fed pivot optionality.', timeframe: '8 weeks', portfolioImpact: '9% allocation', model: 'claude'
  },
  { 
    id: 5, ticker: 'NVDA', strategy: 'Protective Put', hedgeType: 'position', confidence: 87,
    legs: [
      { action: 'buy', type: 'put', strike: 850, expiry: 'May 24', qty: 2, price: 24.60 },
    ],
    protection: 'NVDA below $850', cost: '$4,920 debit', breakeven: '$825.40',
    thesis: 'Protect concentrated NVDA position. Earnings vol hedge. 15% downside protection.', timeframe: '4 weeks', portfolioImpact: '-0.49% drag', model: 'claude'
  },
]

const OPENAI_IDEAS: HedgeIdea[] = [
  { 
    id: 1, ticker: 'QQQ', strategy: 'Ratio Put Spread', hedgeType: 'portfolio', confidence: 88,
    legs: [
      { action: 'buy', type: 'put', strike: 440, expiry: 'Jun 21', qty: 5, price: 10.20 },
      { action: 'sell', type: 'put', strike: 420, expiry: 'Jun 21', qty: 10, price: 4.80 },
    ],
    protection: '-5% to -10%', cost: '$300 credit', breakeven: '$418.50',
    thesis: 'Free hedge via ratio. Max protection at 420. Risk below 398.50. Tech-heavy portfolio.', timeframe: '8 weeks', portfolioImpact: '+$300 credit', model: 'openai'
  },
  { 
    id: 2, ticker: 'UVXY', strategy: 'Long Vol Allocation', hedgeType: 'tail-risk', confidence: 79,
    legs: [
      { action: 'buy', type: 'call', strike: 30, expiry: 'May 17', qty: 50, price: 0.85 },
    ],
    protection: 'Vol spike > 50%', cost: '$4,250 debit', breakeven: 'UVXY > $30.85',
    thesis: 'Leveraged vol exposure. Massive payoff in crash. Accept decay for tail protection.', timeframe: '3 weeks', portfolioImpact: '-0.43% drag', model: 'openai'
  },
  { 
    id: 3, ticker: 'XLP', strategy: 'Defensive Rotation', hedgeType: 'correlation', confidence: 84,
    legs: [
      { action: 'buy', type: 'etf', ticker: 'XLP', qty: 150, price: 77.20 },
    ],
    protection: 'Sector rotation / defensive', cost: '$11,580 allocation', breakeven: 'N/A - rotation',
    thesis: 'Low beta defensive exposure. Consumer staples outperform in drawdowns. Dividend yield 2.8%.', timeframe: 'Ongoing', portfolioImpact: '12% allocation', model: 'openai'
  },
  { 
    id: 4, ticker: 'UUP', strategy: 'Dollar Hedge', hedgeType: 'correlation', confidence: 76,
    legs: [
      { action: 'buy', type: 'etf', ticker: 'UUP', qty: 400, price: 28.60 },
    ],
    protection: 'Dollar strength / EM weakness', cost: '$11,440 allocation', breakeven: 'N/A - hedge',
    thesis: 'USD strength hedge. Flight to dollar in risk-off. Negative EM equity correlation.', timeframe: 'Ongoing', portfolioImpact: '11% allocation', model: 'openai'
  },
  { 
    id: 5, ticker: 'AAPL', strategy: 'Zero-Cost Collar', hedgeType: 'position', confidence: 90,
    legs: [
      { action: 'buy', type: 'put', strike: 170, expiry: 'Jun 21', qty: 3, price: 4.80 },
      { action: 'sell', type: 'call', strike: 195, expiry: 'Jun 21', qty: 3, price: 4.80 },
    ],
    protection: 'AAPL below $170', cost: '$0 (zero cost)', breakeven: '$170 / $195',
    thesis: 'Free protection. Cap gains at 195. Protect concentrated long. WWDC risk management.', timeframe: '8 weeks', portfolioImpact: '$0 cost', model: 'openai'
  },
]

export default function HedgesPage() {
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

  const hedgeTypeColor = (type: string) => {
    switch (type) {
      case 'portfolio': return 'bg-red-500/20 text-red-400'
      case 'position': return 'bg-amber-500/20 text-amber-400'
      case 'tail-risk': return 'bg-purple-500/20 text-purple-400'
      case 'correlation': return 'bg-cyan-500/20 text-cyan-400'
      default: return 'bg-muted/20 text-muted-foreground'
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
                <Shield className="w-6 h-6 text-red-400" />
                Hedge Strategies
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Portfolio protection and risk management plays</p>
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
                className="w-full pl-10 pr-4 py-2 bg-card/50 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Filter className="w-3 h-3" />
              <span>{filteredIdeas.length} ideas</span>
              <span className="text-red-400">|</span>
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
                    ? 'bg-red-500/10 border-red-500/40'
                    : 'bg-card/50 border-border hover:border-red-500/30'
                }`}
              >
                {/* Rank Badge */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>

                <div className="flex items-start justify-between">
                  {/* Left: Strategy & Legs */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-500/20 text-red-400">
                        {idea.strategy}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${hedgeTypeColor(idea.hedgeType)}`}>
                        {idea.hedgeType}
                      </span>
                    </div>
                    
                    {/* Legs */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {idea.legs.map((leg, i) => (
                        <div key={i} className="px-2 py-1 rounded bg-muted/30 text-xs font-mono">
                          <span className={leg.action === 'buy' ? 'text-green-400' : 'text-red-400'}>
                            {leg.action.toUpperCase()} {leg.qty}x
                          </span>
                          {leg.type === 'etf' || leg.type === 'stock' ? (
                            <span className="text-foreground"> {leg.ticker}</span>
                          ) : (
                            <>
                              <span className="text-muted-foreground"> {leg.strike} </span>
                              <span className={leg.type === 'call' ? 'text-cyan-400' : 'text-amber-400'}>
                                {leg.type.toUpperCase()}
                              </span>
                              <span className="text-muted-foreground"> {leg.expiry}</span>
                            </>
                          )}
                          <span className="text-foreground"> @${leg.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 max-w-2xl">{idea.thesis}</p>
                    
                    {/* Protection Levels */}
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <div>
                        <span className="text-muted-foreground">Protection:</span>
                        <span className="ml-1 text-red-400">{idea.protection}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="ml-1 text-foreground">{idea.cost}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Breakeven:</span>
                        <span className="ml-1 text-cyan-400">{idea.breakeven}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Impact:</span>
                        <span className={`ml-1 ${idea.portfolioImpact.includes('-') ? 'text-red-400' : idea.portfolioImpact.includes('+') ? 'text-green-400' : 'text-amber-400'}`}>
                          {idea.portfolioImpact}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Confidence & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-red-400">{idea.confidence}%</div>
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
                          ? 'bg-red-500 text-white'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40'
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

          {/* Risk Summary */}
          <div className="mt-8 p-6 rounded-xl border border-red-500/30 bg-red-500/5">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Portfolio Risk Summary
            </h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold font-mono text-red-400">-12.4%</div>
                <div className="text-[10px] text-muted-foreground uppercase">Max Drawdown</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-amber-400">0.85</div>
                <div className="text-[10px] text-muted-foreground uppercase">Portfolio Beta</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-cyan-400">18.2%</div>
                <div className="text-[10px] text-muted-foreground uppercase">Vol (30d)</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-green-400">$8.2K</div>
                <div className="text-[10px] text-muted-foreground uppercase">Hedge Cost</div>
              </div>
            </div>
          </div>

          {/* Trade History */}
          <div className="mt-6 p-6 rounded-xl border border-border bg-card/30">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Execution History
            </h2>
            <div className="text-sm text-muted-foreground text-center py-8">
              No hedge trades executed yet. Stage a trade above to get started.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
