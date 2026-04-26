'use client'

import { useState } from 'react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { Layers, Brain, Sparkles, Clock, Target, CheckCircle, Search, Filter } from 'lucide-react'

type Model = 'claude' | 'openai'

interface OptionLeg {
  action: 'buy' | 'sell'
  type: 'call' | 'put'
  strike: number
  expiry: string
  qty: number
  price: number
}

interface MultiLegIdea {
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
  greeks: { delta: string; theta: string; vega: string }
  model: Model
}

const CLAUDE_IDEAS: MultiLegIdea[] = [
  { 
    id: 1, ticker: 'SPY', strategy: 'Iron Condor', action: 'neutral', confidence: 88,
    legs: [
      { action: 'sell', type: 'put', strike: 495, expiry: 'May 17', qty: 1, price: 2.45 },
      { action: 'buy', type: 'put', strike: 490, expiry: 'May 17', qty: 1, price: 1.60 },
      { action: 'sell', type: 'call', strike: 525, expiry: 'May 17', qty: 1, price: 1.95 },
      { action: 'buy', type: 'call', strike: 530, expiry: 'May 17', qty: 1, price: 1.10 },
    ],
    maxProfit: '$170', maxLoss: '$330', breakeven: '$493.30 / $526.70',
    thesis: 'Range-bound SPY. VIX at 18 supports premium selling. 80% POP with current wings.', timeframe: '3 weeks', riskReward: '0.52:1',
    greeks: { delta: '0.02', theta: '+$8.50', vega: '-$12.30' }, model: 'claude'
  },
  { 
    id: 2, ticker: 'NVDA', strategy: 'Call Calendar Spread', action: 'bullish', confidence: 84,
    legs: [
      { action: 'sell', type: 'call', strike: 920, expiry: 'May 10', qty: 1, price: 18.40 },
      { action: 'buy', type: 'call', strike: 920, expiry: 'Jun 21', qty: 1, price: 42.80 },
    ],
    maxProfit: '$1,840', maxLoss: '$2,440', breakeven: '$895 / $945',
    thesis: 'Exploit IV differential. Front month elevated pre-earnings. Back month holds value.', timeframe: '2 weeks', riskReward: '0.75:1',
    greeks: { delta: '0.15', theta: '+$22.00', vega: '+$18.50' }, model: 'claude'
  },
  { 
    id: 3, ticker: 'QQQ', strategy: 'Broken Wing Butterfly', action: 'bearish', confidence: 79,
    legs: [
      { action: 'buy', type: 'put', strike: 445, expiry: 'May 24', qty: 1, price: 6.20 },
      { action: 'sell', type: 'put', strike: 435, expiry: 'May 24', qty: 2, price: 3.80 },
      { action: 'buy', type: 'put', strike: 420, expiry: 'May 24', qty: 1, price: 1.90 },
    ],
    maxProfit: '$850', maxLoss: '$150', breakeven: '$443.50',
    thesis: 'Asymmetric downside play. No upside risk. Max profit at 435 target.', timeframe: '4 weeks', riskReward: '5.67:1',
    greeks: { delta: '-0.22', theta: '+$4.20', vega: '+$6.80' }, model: 'claude'
  },
  { 
    id: 4, ticker: 'AAPL', strategy: 'Jade Lizard', action: 'bullish', confidence: 82,
    legs: [
      { action: 'sell', type: 'put', strike: 175, expiry: 'May 17', qty: 1, price: 3.20 },
      { action: 'sell', type: 'call', strike: 190, expiry: 'May 17', qty: 1, price: 1.85 },
      { action: 'buy', type: 'call', strike: 195, expiry: 'May 17', qty: 1, price: 0.90 },
    ],
    maxProfit: '$415', maxLoss: '$1,085', breakeven: '$170.85',
    thesis: 'No upside risk above 190. Premium collection on slight bullish bias. iPhone catalyst.', timeframe: '3 weeks', riskReward: '0.38:1',
    greeks: { delta: '0.28', theta: '+$12.40', vega: '-$8.90' }, model: 'claude'
  },
  { 
    id: 5, ticker: 'TSLA', strategy: 'Double Diagonal', action: 'neutral', confidence: 76,
    legs: [
      { action: 'buy', type: 'put', strike: 220, expiry: 'Jun 21', qty: 1, price: 14.50 },
      { action: 'sell', type: 'put', strike: 230, expiry: 'May 17', qty: 1, price: 8.20 },
      { action: 'buy', type: 'call', strike: 270, expiry: 'Jun 21', qty: 1, price: 12.80 },
      { action: 'sell', type: 'call', strike: 260, expiry: 'May 17', qty: 1, price: 7.40 },
    ],
    maxProfit: '$1,210', maxLoss: '$1,170', breakeven: '$228 / $262',
    thesis: 'Double calendar for IV crush post-earnings. Roll short legs monthly.', timeframe: '3 weeks', riskReward: '1.03:1',
    greeks: { delta: '0.05', theta: '+$18.60', vega: '+$24.20' }, model: 'claude'
  },
]

const OPENAI_IDEAS: MultiLegIdea[] = [
  { 
    id: 1, ticker: 'IWM', strategy: 'Iron Butterfly', action: 'neutral', confidence: 86,
    legs: [
      { action: 'buy', type: 'put', strike: 195, expiry: 'May 17', qty: 1, price: 1.20 },
      { action: 'sell', type: 'put', strike: 205, expiry: 'May 17', qty: 1, price: 3.80 },
      { action: 'sell', type: 'call', strike: 205, expiry: 'May 17', qty: 1, price: 4.20 },
      { action: 'buy', type: 'call', strike: 215, expiry: 'May 17', qty: 1, price: 1.40 },
    ],
    maxProfit: '$540', maxLoss: '$460', breakeven: '$199.60 / $210.40',
    thesis: 'Small caps range-bound. Pin to 205. Higher POP than iron condor.', timeframe: '3 weeks', riskReward: '1.17:1',
    greeks: { delta: '0.01', theta: '+$14.80', vega: '-$16.40' }, model: 'openai'
  },
  { 
    id: 2, ticker: 'META', strategy: 'Skip Strike Butterfly', action: 'bullish', confidence: 81,
    legs: [
      { action: 'buy', type: 'call', strike: 490, expiry: 'May 24', qty: 1, price: 18.60 },
      { action: 'sell', type: 'call', strike: 510, expiry: 'May 24', qty: 2, price: 9.20 },
      { action: 'buy', type: 'call', strike: 540, expiry: 'May 24', qty: 1, price: 3.40 },
    ],
    maxProfit: '$1,780', maxLoss: '$220', breakeven: '$492.20',
    thesis: 'Bullish butterfly with reduced cost. Target 510-520 range. Reels monetization.', timeframe: '4 weeks', riskReward: '8.09:1',
    greeks: { delta: '0.18', theta: '+$6.20', vega: '+$4.80' }, model: 'openai'
  },
  { 
    id: 3, ticker: 'GOOGL', strategy: 'Ratio Spread', action: 'bullish', confidence: 77,
    legs: [
      { action: 'buy', type: 'call', strike: 155, expiry: 'May 24', qty: 1, price: 5.80 },
      { action: 'sell', type: 'call', strike: 165, expiry: 'May 24', qty: 2, price: 2.10 },
    ],
    maxProfit: '$1,160', maxLoss: 'Unlimited above $176.60', breakeven: '$153.40',
    thesis: 'Reduced cost bullish play. Cap gains at 165. Risk above 176.60.', timeframe: '4 weeks', riskReward: '3:1 to target',
    greeks: { delta: '0.35', theta: '+$3.40', vega: '-$2.80' }, model: 'openai'
  },
  { 
    id: 4, ticker: 'AMD', strategy: 'Put Credit Ladder', action: 'bullish', confidence: 83,
    legs: [
      { action: 'sell', type: 'put', strike: 155, expiry: 'May 10', qty: 1, price: 3.20 },
      { action: 'sell', type: 'put', strike: 150, expiry: 'May 17', qty: 1, price: 2.80 },
      { action: 'buy', type: 'put', strike: 145, expiry: 'May 24', qty: 2, price: 1.60 },
    ],
    maxProfit: '$280', maxLoss: '$720', breakeven: '$147.80',
    thesis: 'Staggered expiry ladder. Theta decay on front shorts. MI300X momentum.', timeframe: '4 weeks', riskReward: '0.39:1',
    greeks: { delta: '0.42', theta: '+$16.20', vega: '-$10.40' }, model: 'openai'
  },
  { 
    id: 5, ticker: 'XLF', strategy: 'Box Spread Arb', action: 'neutral', confidence: 95,
    legs: [
      { action: 'buy', type: 'call', strike: 40, expiry: 'Jun 21', qty: 1, price: 3.20 },
      { action: 'sell', type: 'call', strike: 42, expiry: 'Jun 21', qty: 1, price: 1.80 },
      { action: 'buy', type: 'put', strike: 42, expiry: 'Jun 21', qty: 1, price: 1.40 },
      { action: 'sell', type: 'put', strike: 40, expiry: 'Jun 21', qty: 1, price: 0.60 },
    ],
    maxProfit: '$20', maxLoss: '$0', breakeven: 'N/A - Riskless',
    thesis: 'Synthetic loan at 4.2% APR. Box mispricing detected. Risk-free arbitrage.', timeframe: '6 weeks', riskReward: 'Infinite',
    greeks: { delta: '0.00', theta: '+$0.80', vega: '$0.00' }, model: 'openai'
  },
]

export default function MultiLegPage() {
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
                <Layers className="w-6 h-6 text-cyan-400" />
                Multi-Leg Strategies
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Complex multi-leg structures with advanced greeks</p>
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
                className="w-full pl-10 pr-4 py-2 bg-card/50 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Filter className="w-3 h-3" />
              <span>{filteredIdeas.length} ideas</span>
              <span className="text-cyan-400">|</span>
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
                    ? 'bg-cyan-500/10 border-cyan-500/40'
                    : 'bg-card/50 border-border hover:border-cyan-500/30'
                }`}
              >
                {/* Rank Badge */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-cyan-500 text-black text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>

                <div className="flex items-start justify-between">
                  {/* Left: Strategy & Legs */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-cyan-500/20 text-cyan-400">
                        {idea.strategy}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        idea.action === 'bullish' ? 'bg-green-500/20 text-green-400' :
                        idea.action === 'bearish' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {idea.action}
                      </span>
                    </div>
                    
                    {/* Legs */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {idea.legs.map((leg, i) => (
                        <div key={i} className="px-2 py-1 rounded bg-muted/30 text-xs font-mono">
                          <span className={leg.action === 'buy' ? 'text-green-400' : 'text-red-400'}>
                            {leg.action.toUpperCase()} {leg.qty}x
                          </span>
                          <span className="text-muted-foreground"> {leg.strike} </span>
                          <span className={leg.type === 'call' ? 'text-cyan-400' : 'text-amber-400'}>
                            {leg.type.toUpperCase()}
                          </span>
                          <span className="text-muted-foreground"> {leg.expiry}</span>
                          <span className="text-foreground"> @${leg.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 max-w-2xl">{idea.thesis}</p>
                    
                    {/* P&L Levels */}
                    <div className="flex items-center gap-6 text-xs font-mono mb-2">
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

                    {/* Greeks */}
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-muted-foreground">Greeks:</span>
                      <span>Δ <span className="text-cyan-400">{idea.greeks.delta}</span></span>
                      <span>Θ <span className={idea.greeks.theta.startsWith('+') ? 'text-green-400' : 'text-red-400'}>{idea.greeks.theta}</span></span>
                      <span>ν <span className={idea.greeks.vega.startsWith('+') ? 'text-green-400' : idea.greeks.vega.startsWith('-') ? 'text-red-400' : 'text-muted-foreground'}>{idea.greeks.vega}</span></span>
                    </div>
                  </div>

                  {/* Right: Confidence & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-cyan-400">{idea.confidence}%</div>
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
                          ? 'bg-cyan-500 text-black'
                          : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40'
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
              No multi-leg trades executed yet. Stage a trade above to get started.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
