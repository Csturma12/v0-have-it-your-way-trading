'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { 
  Shield, Brain, Sparkles, Clock, Target, CheckCircle, Search, Filter,
  Plus, History, X, ArrowUpRight, Zap, AlertTriangle, RefreshCw, TrendingDown, Loader
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'

type Model = 'claude' | 'openai'
type RiskLevel = 'low' | 'medium' | 'high'
type HedgeType = 'portfolio' | 'position' | 'tail-risk' | 'correlation'
type SignalType = 'vix' | 'correlation' | 'drawdown' | 'macro' | 'positioning'

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
  hedgeType: HedgeType
  confidence: number
  legs: HedgeLeg[]
  protection: string
  cost: string
  breakeven: string
  thesis: string
  timeframe: string
  portfolioImpact: string
  model: Model
  riskLevel: RiskLevel
  signal: string
  signalType: SignalType
  vixLevel?: number
}

interface StagedTrade {
  id: string
  ticker: string
  strategy: string
  hedgeType: HedgeType
  legs: HedgeLeg[]
  stagedAt: Date
  status: 'staged' | 'executed' | 'cancelled'
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
    thesis: 'Portfolio protection with capped upside. Collar finances put spread. Ideal for 60/40 portfolio.', 
    timeframe: '8 weeks', portfolioImpact: '-0.42% drag', model: 'claude', riskLevel: 'low',
    signal: 'VIX term structure inverting, smart money buying protection', signalType: 'vix', vixLevel: 18.5
  },
  { 
    id: 2, ticker: 'VIX', strategy: 'VIX Call Spread', hedgeType: 'tail-risk', confidence: 85,
    legs: [
      { action: 'buy', type: 'call', strike: 20, expiry: 'May 22', qty: 20, price: 1.80 },
      { action: 'sell', type: 'call', strike: 35, expiry: 'May 22', qty: 20, price: 0.45 },
    ],
    protection: 'VIX 20-35 spike', cost: '$2,700 debit', breakeven: 'VIX > 21.35',
    thesis: 'Tail risk protection. Pays off in market stress. Low cost relative to notional.', 
    timeframe: '4 weeks', portfolioImpact: '-0.27% drag', model: 'claude', riskLevel: 'medium',
    signal: 'VIX at 52-week lows, VVIX elevated showing vol-of-vol demand', signalType: 'vix', vixLevel: 14.2
  },
  { 
    id: 3, ticker: 'TLT', strategy: 'Long TLT Calls', hedgeType: 'correlation', confidence: 78,
    legs: [
      { action: 'buy', type: 'call', strike: 95, expiry: 'Jul 19', qty: 15, price: 2.80 },
    ],
    protection: 'Flight to safety', cost: '$4,200 debit', breakeven: '$97.80',
    thesis: 'Bond rally hedge. Negative correlation to equities in risk-off. Rate cut potential.', 
    timeframe: '10 weeks', portfolioImpact: '-0.42% drag', model: 'claude', riskLevel: 'medium',
    signal: 'Yield curve dynamics shifting, bond positioning extremely short', signalType: 'positioning', vixLevel: 18.5
  },
  { 
    id: 4, ticker: 'GLD', strategy: 'Gold Call Spread', hedgeType: 'correlation', confidence: 82,
    legs: [
      { action: 'buy', type: 'call', strike: 220, expiry: 'Jun 21', qty: 10, price: 4.20 },
      { action: 'sell', type: 'call', strike: 235, expiry: 'Jun 21', qty: 10, price: 1.80 },
    ],
    protection: 'Inflation/geopolitical hedge', cost: '$2,400 debit', breakeven: '$222.40',
    thesis: 'Gold as macro hedge. Central bank buying. Geopolitical uncertainty premium.', 
    timeframe: '6 weeks', portfolioImpact: '-0.24% drag', model: 'claude', riskLevel: 'low',
    signal: 'Central bank gold buying at record levels, real rates declining', signalType: 'macro', vixLevel: 18.5
  },
  { 
    id: 5, ticker: 'QQQ', strategy: 'Protective Put', hedgeType: 'position', confidence: 76,
    legs: [
      { action: 'buy', type: 'put', strike: 420, expiry: 'Jun 21', qty: 5, price: 12.40 },
    ],
    protection: '-5% to floor', cost: '$6,200 debit', breakeven: '$407.60',
    thesis: 'Direct QQQ protection. Asymmetric payoff. Sleep at night hedge.', 
    timeframe: '6 weeks', portfolioImpact: '-0.62% drag', model: 'claude', riskLevel: 'low',
    signal: 'Tech concentration risk elevated, mean reversion signals appearing', signalType: 'drawdown', vixLevel: 18.5
  },
]

const OPENAI_IDEAS: HedgeIdea[] = [
  { 
    id: 6, ticker: 'UVXY', strategy: 'UVXY Call Spread', hedgeType: 'tail-risk', confidence: 79,
    legs: [
      { action: 'buy', type: 'call', strike: 15, expiry: 'May 17', qty: 30, price: 1.20 },
      { action: 'sell', type: 'call', strike: 25, expiry: 'May 17', qty: 30, price: 0.35 },
    ],
    protection: 'Volatility spike 50%+', cost: '$2,550 debit', breakeven: 'UVXY > 15.85',
    thesis: 'Leveraged vol hedge. High payoff in crash. Short-dated for efficiency.', 
    timeframe: '3 weeks', portfolioImpact: '-0.26% drag', model: 'openai', riskLevel: 'high',
    signal: 'UVXY at contango lows, cheap relative to VIX term structure', signalType: 'vix', vixLevel: 14.2
  },
  { 
    id: 7, ticker: 'IWM', strategy: 'Put Ratio Backspread', hedgeType: 'tail-risk', confidence: 74,
    legs: [
      { action: 'sell', type: 'put', strike: 200, expiry: 'Jun 21', qty: 1, price: 4.80 },
      { action: 'buy', type: 'put', strike: 190, expiry: 'Jun 21', qty: 2, price: 2.80 },
    ],
    protection: 'Crash protection IWM < 185', cost: '$80 debit', breakeven: '$199.20 / $180.80',
    thesis: 'Near-zero cost crash hedge. Small caps lead in selloffs. Pays in tail events.', 
    timeframe: '6 weeks', portfolioImpact: '-0.01% drag', model: 'openai', riskLevel: 'high',
    signal: 'Small cap underperformance signals risk-off rotation beginning', signalType: 'correlation', vixLevel: 18.5
  },
  { 
    id: 8, ticker: 'XLU', strategy: 'Long XLU Shares + Put', hedgeType: 'correlation', confidence: 81,
    legs: [
      { action: 'buy', type: 'stock', ticker: 'XLU', qty: 100, price: 68.50 },
      { action: 'buy', type: 'put', strike: 65, expiry: 'Jul 19', qty: 1, price: 1.40 },
    ],
    protection: 'Defensive sector rotation', cost: '$6,990 total', breakeven: 'N/A',
    thesis: 'Utilities as defensive play. Dividend yield + put protection. Rate sensitive but defensive.', 
    timeframe: '8-12 weeks', portfolioImpact: '+0.80% yield', model: 'openai', riskLevel: 'low',
    signal: 'Defensive sector rotation beginning, utilities outperforming', signalType: 'correlation', vixLevel: 18.5
  },
  { 
    id: 9, ticker: 'SH', strategy: 'Long Inverse S&P', hedgeType: 'portfolio', confidence: 72,
    legs: [
      { action: 'buy', type: 'etf', ticker: 'SH', qty: 200, price: 13.80 },
    ],
    protection: '-1x S&P inverse', cost: '$2,760 total', breakeven: 'N/A',
    thesis: 'Direct inverse exposure. No decay. Simple hedge for market decline.', 
    timeframe: '2-6 weeks', portfolioImpact: '-100% correlated', model: 'openai', riskLevel: 'medium',
    signal: 'Breadth deterioration, new highs/lows ratio declining sharply', signalType: 'drawdown', vixLevel: 18.5
  },
  { 
    id: 10, ticker: 'XLP', strategy: 'Consumer Staples Rotation', hedgeType: 'correlation', confidence: 77,
    legs: [
      { action: 'buy', type: 'call', strike: 78, expiry: 'Jun 21', qty: 10, price: 2.20 },
    ],
    protection: 'Defensive rotation play', cost: '$2,200 debit', breakeven: '$80.20',
    thesis: 'Staples outperform in slowdown. Earnings stability. Dividend support.', 
    timeframe: '6 weeks', portfolioImpact: '-0.22% drag', model: 'openai', riskLevel: 'low',
    signal: 'Consumer sentiment weakening, staples showing relative strength', signalType: 'macro', vixLevel: 18.5
  },
]

const signalTypeColors: Record<SignalType, string> = {
  vix: 'bg-red-500/20 text-red-400 border-red-500/30',
  correlation: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  drawdown: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  macro: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  positioning: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const hedgeTypeColors: Record<HedgeType, string> = {
  portfolio: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  position: 'bg-green-500/20 text-green-400 border-green-500/40',
  'tail-risk': 'bg-red-500/20 text-red-400 border-red-500/40',
  correlation: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
}

const riskColors: Record<RiskLevel, string> = {
  low: 'text-green-400 border-green-500/40',
  medium: 'text-amber-400 border-amber-500/40',
  high: 'text-red-400 border-red-500/40',
}

export default function HedgesPage() {
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState<Model | 'all'>('all')
  const [searchTicker, setSearchTicker] = useState('')
  const [hedgeTypeFilter, setHedgeTypeFilter] = useState<HedgeType | 'all'>('all')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const { executeTrade, loading: isExecuting } = useBrokerTrade('alpaca')
  
  const [ideas, setIdeas] = useState<HedgeIdea[]>([...CLAUDE_IDEAS, ...OPENAI_IDEAS])
  const [stagedTrades, setStagedTrades] = useState<StagedTrade[]>([])
  const [executionHistory, setExecutionHistory] = useState<StagedTrade[]>([])
  
  const [activeTab, setActiveTab] = useState<'ideas' | 'staged' | 'history' | 'custom'>('ideas')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch live prices including VIX from Polygon API
  const tickers = [...new Set([...CLAUDE_IDEAS, ...OPENAI_IDEAS].map(i => i.ticker))]
  const { quotes: liveQuotes } = useLiveQuotes([...tickers, 'VIX'], { refreshInterval: 30000 })

  // Update VIX level from live data
  useEffect(() => {
    const vixQuote = liveQuotes['VIX']
    if (!vixQuote || vixQuote.loading) return
    setIdeas(prev => prev.map(idea => ({
      ...idea,
      vixLevel: vixQuote.price || idea.vixLevel,
    })))
  }, [liveQuotes])

  const filteredIdeas = ideas.filter(idea => {
    if (selectedModel !== 'all' && idea.model !== selectedModel) return false
    if (searchTicker && !idea.ticker.toLowerCase().includes(searchTicker.toLowerCase())) return false
    if (hedgeTypeFilter !== 'all' && idea.hedgeType !== hedgeTypeFilter) return false
    if (riskFilter !== 'all' && idea.riskLevel !== riskFilter) return false
    return true
  }).sort((a, b) => b.confidence - a.confidence)

  const handleStageTrade = (idea: HedgeIdea) => {
    const existingIdx = stagedTrades.findIndex(t => t.ticker === idea.ticker && t.strategy === idea.strategy)
    if (existingIdx >= 0) {
      setStagedTrades(prev => prev.filter((_, i) => i !== existingIdx))
    } else {
      const staged: StagedTrade = {
        id: `staged-${Date.now()}`,
        ticker: idea.ticker,
        strategy: idea.strategy,
        hedgeType: idea.hedgeType,
        legs: idea.legs,
        stagedAt: new Date(),
        status: 'staged',
      }
      setStagedTrades(prev => [...prev, staged])
    }
  }

  const handleExecuteTrade = async (trade: StagedTrade) => {
    // Execute the first leg as a market order on Alpaca
    const firstLeg = trade.legs[0]
    await executeTrade({
      ticker: firstLeg.ticker || trade.ticker,
      side: firstLeg.action,
      quantity: firstLeg.qty,
      orderType: 'market',
    })
    setStagedTrades(prev => prev.filter(t => t.id !== trade.id))
    setExecutionHistory(prev => [...prev, { ...trade, status: 'executed' }])
  }

  const handleCancelTrade = (trade: StagedTrade) => {
    setStagedTrades(prev => prev.filter(t => t.id !== trade.id))
    setExecutionHistory(prev => [...prev, { ...trade, status: 'cancelled' }])
  }

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }

  const isStaged = (ticker: string, strategy: string) => stagedTrades.some(t => t.ticker === ticker && t.strategy === strategy)

  // Portfolio Risk Summary
  const totalProtectionCost = filteredIdeas.slice(0, 3).reduce((sum, idea) => {
    const cost = parseFloat(idea.cost.replace(/[^0-9.]/g, '')) || 0
    return sum + cost
  }, 0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavBar />
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-400" />
                Hedge Strategies
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Portfolio protection and tail-risk hedging with real-time VIX tracking</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                <Filter className="w-4 h-4" /> Filters
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Portfolio Risk Summary */}
          <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">VIX Level</div>
                  <div className="text-2xl font-bold font-mono text-red-400">{ideas[0]?.vixLevel?.toFixed(2) || '18.50'}</div>
                </div>
                <div className="h-10 border-l border-border" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Top 3 Hedge Cost</div>
                  <div className="text-lg font-bold font-mono text-foreground">${totalProtectionCost.toLocaleString()}</div>
                </div>
                <div className="h-10 border-l border-border" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Portfolio Drag</div>
                  <div className="text-lg font-bold font-mono text-amber-400">-0.91%</div>
                </div>
              </div>
              <Badge variant="outline" className="text-red-400 border-red-500/40">
                <TrendingDown className="w-3 h-3 mr-1" /> Protection Mode
              </Badge>
            </div>
          </div>

          {/* Model Toggle + Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 p-1 bg-card/50 border border-border rounded-lg">
              <button onClick={() => setSelectedModel('all')} className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${selectedModel === 'all' ? 'bg-primary/20 text-primary border border-primary/40' : 'text-muted-foreground hover:text-foreground'}`}>All</button>
              <button onClick={() => setSelectedModel('claude')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono transition-all ${selectedModel === 'claude' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-muted-foreground hover:text-foreground'}`}>
                <Brain className="w-3 h-3" /> Claude
              </button>
              <button onClick={() => setSelectedModel('openai')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono transition-all ${selectedModel === 'openai' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-muted-foreground hover:text-foreground'}`}>
                <Sparkles className="w-3 h-3" /> OpenAI
              </button>
            </div>
            
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search ticker..." value={searchTicker} onChange={(e) => setSearchTicker(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-card/50 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary" />
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-6 p-4 rounded-lg border border-border bg-card/50 flex flex-wrap gap-6">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Hedge Type</label>
                <div className="flex gap-1">
                  {(['all', 'portfolio', 'position', 'tail-risk', 'correlation'] as const).map(h => (
                    <Button key={h} size="sm" variant={hedgeTypeFilter === h ? 'default' : 'outline'} onClick={() => setHedgeTypeFilter(h)} className={`text-xs h-7 capitalize ${h !== 'all' ? hedgeTypeColors[h]?.replace('bg-', 'border-').replace('/20', '/40') : ''}`}>
                      {h.replace('-', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Risk Level</label>
                <div className="flex gap-1">
                  {(['all', 'low', 'medium', 'high'] as const).map(r => (
                    <Button key={r} size="sm" variant={riskFilter === r ? 'default' : 'outline'} onClick={() => setRiskFilter(r)} className={`text-xs h-7 capitalize ${r !== 'all' ? riskColors[r] : ''}`}>
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border pb-2">
            {[
              { id: 'ideas', label: 'Hedge Ideas', count: filteredIdeas.length },
              { id: 'staged', label: 'Staged Hedges', count: stagedTrades.length },
              { id: 'history', label: 'Execution History', count: executionHistory.length },
              { id: 'custom', label: 'Custom Hedge', count: 0 },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-4 py-2 text-sm font-mono rounded-t transition-colors ${activeTab === tab.id ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Trade Ideas Tab */}
          {activeTab === 'ideas' && (
            <div className="grid gap-4">
              {filteredIdeas.map((idea, index) => (
                <div key={idea.id} className={`relative p-5 rounded-xl border transition-all ${isStaged(idea.ticker, idea.strategy) ? 'bg-red-500/10 border-red-500/40' : 'bg-card/50 border-border hover:border-red-500/30'}`}>
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{index + 1}</div>
                  <div className="absolute top-3 right-3">
                    {idea.model === 'claude' ? <Brain className="w-4 h-4 text-amber-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                        <span className="text-sm font-mono text-red-400">{idea.strategy}</span>
                        <Badge variant="outline" className={hedgeTypeColors[idea.hedgeType]}>{idea.hedgeType}</Badge>
                        <Badge variant="outline" className={riskColors[idea.riskLevel]}>{idea.riskLevel}</Badge>
                      </div>

                      {/* Signal Context */}
                      <div className="mb-3 p-3 rounded-lg bg-card/80 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3 h-3 text-red-400" />
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">Why This Hedge</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${signalTypeColors[idea.signalType]}`}>{idea.signalType}</Badge>
                        </div>
                        <p className="text-sm text-foreground/90">{idea.signal}</p>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{idea.thesis}</p>

                      {/* Legs */}
                      <div className="mb-3 p-2 rounded bg-muted/20 border border-border/30">
                        <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Legs</div>
                        <div className="flex flex-wrap gap-2">
                          {idea.legs.map((leg, i) => (
                            <span key={i} className={`px-2 py-1 rounded text-xs font-mono ${leg.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {leg.action.toUpperCase()} {leg.qty}x {leg.ticker || ''} {leg.strike ? `${leg.strike} ${leg.type?.toUpperCase()}` : leg.type?.toUpperCase()} {leg.expiry || ''} @ ${leg.price}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-xs font-mono">
                        <div><span className="text-muted-foreground">Protection:</span><span className="ml-1 text-green-400">{idea.protection}</span></div>
                        <div><span className="text-muted-foreground">Cost:</span><span className="ml-1 text-red-400">{idea.cost}</span></div>
                        <div><span className="text-muted-foreground">Portfolio Impact:</span><span className="ml-1 text-amber-400">{idea.portfolioImpact}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold font-mono ${idea.confidence >= 85 ? 'text-green-400' : idea.confidence >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{idea.confidence}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{idea.timeframe}</div>
                      <button onClick={() => handleStageTrade(idea)} className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${isStaged(idea.ticker, idea.strategy) ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40'}`}>
                        {isStaged(idea.ticker, idea.strategy) ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Staged</span> : <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Stage Hedge</span>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Staged Trades Tab */}
          {activeTab === 'staged' && (
            <div className="space-y-4">
              {stagedTrades.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No staged hedges. Stage a hedge from the Ideas tab.</p>
                </div>
              ) : (
                stagedTrades.map(trade => (
                  <div key={trade.id} className="p-4 rounded-lg border border-border bg-card/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold font-mono">{trade.ticker}</span>
                      <span className="text-sm text-red-400">{trade.strategy}</span>
                      <Badge variant="outline" className={hedgeTypeColors[trade.hedgeType]}>{trade.hedgeType}</Badge>
                      <span className="text-sm text-muted-foreground">{trade.legs.length} legs | Staged: {trade.stagedAt.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-red-400 border-red-500/40 hover:bg-red-500/20" onClick={() => handleExecuteTrade(trade)} disabled={isExecuting}>
                        {isExecuting ? <Loader className="w-4 h-4 mr-1 animate-spin" /> : <ArrowUpRight className="w-4 h-4 mr-1" />} Execute
                      </Button>
                      <Button size="sm" variant="outline" className="text-muted-foreground border-border hover:bg-muted/20" onClick={() => handleCancelTrade(trade)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {executionHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No execution history yet.</p>
                </div>
              ) : (
                executionHistory.map(trade => (
                  <div key={trade.id} className="p-4 rounded-lg border border-border bg-card/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold font-mono">{trade.ticker}</span>
                      <span className="text-sm text-red-400">{trade.strategy}</span>
                      <Badge variant="outline" className={hedgeTypeColors[trade.hedgeType]}>{trade.hedgeType}</Badge>
                    </div>
                    <Badge variant="outline" className={trade.status === 'executed' ? 'text-green-400 border-green-500/40' : 'text-red-400 border-red-500/40'}>
                      {trade.status === 'executed' ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      {trade.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Custom Hedge Tab */}
          {activeTab === 'custom' && (
            <div className="text-center py-12 text-muted-foreground">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Custom hedge builder coming soon.</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" disabled><Plus className="w-4 h-4" /> Build Custom Hedge</Button>
            </div>
          )}

          {/* Signal Legend */}
          <div className="mt-8 p-4 rounded-lg border border-border bg-card/30">
            <h3 className="text-sm font-mono font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Hedge Signal Types
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(signalTypeColors).map(([type, colors]) => (
                <Badge key={type} variant="outline" className={`${colors} capitalize`}>{type}</Badge>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
