'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { 
  Layers, Brain, Sparkles, Clock, Target, CheckCircle, Search, Filter,
  Plus, History, X, ArrowUpRight, Zap, AlertTriangle, RefreshCw, Loader
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'

type Model = 'claude' | 'openai'
type RiskLevel = 'low' | 'medium' | 'high'
type SignalType = 'volatility' | 'gamma' | 'theta' | 'vega' | 'structure'

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
  riskLevel: RiskLevel
  signal: string
  signalType: SignalType
  pop?: number
}

interface StagedTrade {
  id: string
  ticker: string
  strategy: string
  action: 'bullish' | 'bearish' | 'neutral'
  legs: OptionLeg[]
  stagedAt: Date
  status: 'staged' | 'executed' | 'cancelled'
}

const CLAUDE_IDEAS: MultiLegIdea[] = [
  { 
    id: 1, ticker: 'SPY', strategy: 'Iron Condor', action: 'neutral', confidence: 88,
    legs: [
      { action: 'sell', type: 'put', strike: 500, expiry: 'May 17', qty: 1, price: 2.45 },
      { action: 'buy', type: 'put', strike: 495, expiry: 'May 17', qty: 1, price: 1.60 },
      { action: 'sell', type: 'call', strike: 520, expiry: 'May 17', qty: 1, price: 1.95 },
      { action: 'buy', type: 'call', strike: 525, expiry: 'May 17', qty: 1, price: 1.10 },
    ],
    maxProfit: '$170', maxLoss: '$330', breakeven: '$498.30 / $521.70',
    thesis: 'Range-bound SPY. VIX at 18 supports premium selling. High probability of profit setup.', 
    timeframe: '3 weeks', riskReward: '0.52:1',
    greeks: { delta: '0.02', theta: '+$8.50/day', vega: '-$12.30' }, model: 'claude', riskLevel: 'low',
    signal: 'VIX term structure in contango, realized vol below implied', signalType: 'volatility', pop: 78
  },
  { 
    id: 2, ticker: 'NVDA', strategy: 'Call Calendar Spread', action: 'bullish', confidence: 84,
    legs: [
      { action: 'sell', type: 'call', strike: 220, expiry: 'May 10', qty: 1, price: 8.40 },
      { action: 'buy', type: 'call', strike: 220, expiry: 'Jun 21', qty: 1, price: 18.60 },
    ],
    maxProfit: '$840+', maxLoss: '$1,020', breakeven: 'Variable',
    thesis: 'IV differential between front/back month. Theta collection while maintaining upside.', 
    timeframe: '4-6 weeks', riskReward: '0.82:1',
    greeks: { delta: '0.15', theta: '+$12.20/day', vega: '+$8.40' }, model: 'claude', riskLevel: 'medium',
    signal: 'Front-month IV elevated vs back-month, calendar spread advantage', signalType: 'structure', pop: 62
  },
  { 
    id: 3, ticker: 'QQQ', strategy: 'Iron Butterfly', action: 'neutral', confidence: 76,
    legs: [
      { action: 'buy', type: 'put', strike: 430, expiry: 'May 17', qty: 1, price: 1.80 },
      { action: 'sell', type: 'put', strike: 440, expiry: 'May 17', qty: 1, price: 4.20 },
      { action: 'sell', type: 'call', strike: 440, expiry: 'May 17', qty: 1, price: 4.40 },
      { action: 'buy', type: 'call', strike: 450, expiry: 'May 17', qty: 1, price: 1.60 },
    ],
    maxProfit: '$520', maxLoss: '$480', breakeven: '$434.80 / $445.20',
    thesis: 'Pinning at 440 level expected. Maximum theta decay at ATM strikes.', 
    timeframe: '2 weeks', riskReward: '1.08:1',
    greeks: { delta: '-0.03', theta: '+$18.40/day', vega: '-$22.10' }, model: 'claude', riskLevel: 'medium',
    signal: 'Gamma risk concentrated at 440, dealer hedging flows supportive', signalType: 'gamma', pop: 55
  },
  { 
    id: 4, ticker: 'AAPL', strategy: 'Put Credit Spread', action: 'bullish', confidence: 82,
    legs: [
      { action: 'sell', type: 'put', strike: 180, expiry: 'May 24', qty: 2, price: 3.40 },
      { action: 'buy', type: 'put', strike: 175, expiry: 'May 24', qty: 2, price: 2.10 },
    ],
    maxProfit: '$260', maxLoss: '$740', breakeven: '$178.70',
    thesis: 'Strong support at 175. Bullish bias with defined risk. Premium collection.', 
    timeframe: '3 weeks', riskReward: '0.35:1',
    greeks: { delta: '0.22', theta: '+$6.80/day', vega: '-$4.20' }, model: 'claude', riskLevel: 'low',
    signal: 'Put skew elevated, theta decay accelerating into expiry', signalType: 'theta', pop: 72
  },
  { 
    id: 5, ticker: 'AMZN', strategy: 'Broken Wing Butterfly', action: 'bullish', confidence: 74,
    legs: [
      { action: 'buy', type: 'call', strike: 180, expiry: 'Jun 21', qty: 1, price: 12.40 },
      { action: 'sell', type: 'call', strike: 190, expiry: 'Jun 21', qty: 2, price: 7.20 },
      { action: 'buy', type: 'call', strike: 195, expiry: 'Jun 21', qty: 1, price: 5.40 },
    ],
    maxProfit: '$340', maxLoss: '$160 down / $660 up', breakeven: '$181.60 / $193.40',
    thesis: 'Skewed fly for upside bias. Reduced cost vs standard butterfly.', 
    timeframe: '5 weeks', riskReward: '2.13:1 down',
    greeks: { delta: '0.18', theta: '+$2.40/day', vega: '+$1.80' }, model: 'claude', riskLevel: 'medium',
    signal: 'Call vega cheap, structure benefits from IV expansion', signalType: 'vega', pop: 58
  },
]

const OPENAI_IDEAS: MultiLegIdea[] = [
  { 
    id: 6, ticker: 'MSFT', strategy: 'Jade Lizard', action: 'bullish', confidence: 86,
    legs: [
      { action: 'sell', type: 'put', strike: 370, expiry: 'May 17', qty: 1, price: 4.80 },
      { action: 'sell', type: 'call', strike: 400, expiry: 'May 17', qty: 1, price: 2.40 },
      { action: 'buy', type: 'call', strike: 410, expiry: 'May 17', qty: 1, price: 1.20 },
    ],
    maxProfit: '$600', maxLoss: '$3,400 (put side)', breakeven: '$364.00',
    thesis: 'No upside risk above 400. Bullish bias with premium collection. Naked put risk defined.', 
    timeframe: '3 weeks', riskReward: '0.18:1',
    greeks: { delta: '0.28', theta: '+$14.20/day', vega: '-$8.60' }, model: 'openai', riskLevel: 'medium',
    signal: 'Put premium rich, call spread finances downside protection', signalType: 'structure', pop: 75
  },
  { 
    id: 7, ticker: 'META', strategy: 'Diagonal Spread', action: 'bullish', confidence: 83,
    legs: [
      { action: 'buy', type: 'call', strike: 420, expiry: 'Jul 19', qty: 1, price: 32.40 },
      { action: 'sell', type: 'call', strike: 450, expiry: 'May 17', qty: 1, price: 8.20 },
    ],
    maxProfit: '$3,220+', maxLoss: '$2,420', breakeven: '$444.20',
    thesis: 'LEAPS-like exposure with front-month premium reduction. Rolling opportunity.', 
    timeframe: '2-8 weeks', riskReward: '1.33:1',
    greeks: { delta: '0.52', theta: '+$4.80/day', vega: '+$18.40' }, model: 'openai', riskLevel: 'medium',
    signal: 'Back-month vega attractive, front-month theta collection', signalType: 'vega', pop: 58
  },
  { 
    id: 8, ticker: 'GOOGL', strategy: 'Short Strangle', action: 'neutral', confidence: 79,
    legs: [
      { action: 'sell', type: 'put', strike: 135, expiry: 'May 24', qty: 1, price: 2.80 },
      { action: 'sell', type: 'call', strike: 155, expiry: 'May 24', qty: 1, price: 2.40 },
    ],
    maxProfit: '$520', maxLoss: 'Unlimited', breakeven: '$129.80 / $160.20',
    thesis: 'Wide range expected. High IV percentile favors premium selling.', 
    timeframe: '3 weeks', riskReward: 'Undefined',
    greeks: { delta: '0.05', theta: '+$16.40/day', vega: '-$28.20' }, model: 'openai', riskLevel: 'high',
    signal: 'IV rank at 68%, theta decay accelerating', signalType: 'theta', pop: 68
  },
  { 
    id: 9, ticker: 'AMD', strategy: 'Call Ratio Spread', action: 'bullish', confidence: 77,
    legs: [
      { action: 'buy', type: 'call', strike: 155, expiry: 'Jun 21', qty: 1, price: 12.80 },
      { action: 'sell', type: 'call', strike: 175, expiry: 'Jun 21', qty: 2, price: 4.40 },
    ],
    maxProfit: '$1,600', maxLoss: 'Unlimited above $195', breakeven: '$159.00 / $195.00',
    thesis: 'Bullish with cap. Free or credit entry. Risk above $195.', 
    timeframe: '5 weeks', riskReward: '4:1 to max profit',
    greeks: { delta: '0.32', theta: '+$3.20/day', vega: '-$2.40' }, model: 'openai', riskLevel: 'high',
    signal: 'Call skew steep, ratio structure advantageous', signalType: 'structure', pop: 52
  },
  { 
    id: 10, ticker: 'TSLA', strategy: 'Put Butterfly', action: 'bearish', confidence: 72,
    legs: [
      { action: 'buy', type: 'put', strike: 180, expiry: 'May 31', qty: 1, price: 8.40 },
      { action: 'sell', type: 'put', strike: 170, expiry: 'May 31', qty: 2, price: 5.20 },
      { action: 'buy', type: 'put', strike: 160, expiry: 'May 31', qty: 1, price: 3.10 },
    ],
    maxProfit: '$890', maxLoss: '$110', breakeven: '$178.90 / $161.10',
    thesis: 'Targeting 170 pin. Defined risk bearish play. Low cost entry.', 
    timeframe: '4 weeks', riskReward: '8.09:1',
    greeks: { delta: '-0.18', theta: '+$1.80/day', vega: '-$0.60' }, model: 'openai', riskLevel: 'low',
    signal: 'Gamma concentrated at 170 strike, pinning likely', signalType: 'gamma', pop: 35
  },
]

const signalTypeColors: Record<SignalType, string> = {
  volatility: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gamma: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  theta: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  vega: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  structure: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

const riskColors: Record<RiskLevel, string> = {
  low: 'text-green-400 border-green-500/40',
  medium: 'text-amber-400 border-amber-500/40',
  high: 'text-red-400 border-red-500/40',
}

const actionColors: Record<string, string> = {
  bullish: 'bg-green-500/20 text-green-400',
  bearish: 'bg-red-500/20 text-red-400',
  neutral: 'bg-blue-500/20 text-blue-400',
}

export default function MultiLegPage() {
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState<Model | 'all'>('all')
  const [searchTicker, setSearchTicker] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [directionFilter, setDirectionFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const { executeTrade, loading: isExecuting } = useBrokerTrade('alpaca')
  
  const [ideas, setIdeas] = useState<MultiLegIdea[]>([...CLAUDE_IDEAS, ...OPENAI_IDEAS])
  const [stagedTrades, setStagedTrades] = useState<StagedTrade[]>([])
  const [executionHistory, setExecutionHistory] = useState<StagedTrade[]>([])
  
  const [activeTab, setActiveTab] = useState<'ideas' | 'staged' | 'history' | 'custom'>('ideas')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch live prices from Polygon API
  const tickers = [...CLAUDE_IDEAS, ...OPENAI_IDEAS].map(i => i.ticker)
  const { quotes: liveQuotes } = useLiveQuotes(tickers, { refreshInterval: 30000 })

  const filteredIdeas = ideas.filter(idea => {
    if (selectedModel !== 'all' && idea.model !== selectedModel) return false
    if (searchTicker && !idea.ticker.toLowerCase().includes(searchTicker.toLowerCase())) return false
    if (riskFilter !== 'all' && idea.riskLevel !== riskFilter) return false
    if (directionFilter !== 'all' && idea.action !== directionFilter) return false
    return true
  }).sort((a, b) => b.confidence - a.confidence)

  const handleStageTrade = (idea: MultiLegIdea) => {
    const existingIdx = stagedTrades.findIndex(t => t.ticker === idea.ticker && t.strategy === idea.strategy)
    if (existingIdx >= 0) {
      setStagedTrades(prev => prev.filter((_, i) => i !== existingIdx))
    } else {
      const staged: StagedTrade = {
        id: `staged-${Date.now()}`,
        ticker: idea.ticker,
        strategy: idea.strategy,
        action: idea.action,
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
      ticker: trade.ticker,
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavBar />
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
                <Layers className="w-6 h-6 text-cyan-400" />
                Multi-Leg Strategies
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Complex options structures with real-time Greeks and POP</p>
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
                <label className="text-xs text-muted-foreground mb-2 block">Risk Level</label>
                <div className="flex gap-1">
                  {(['all', 'low', 'medium', 'high'] as const).map(r => (
                    <Button key={r} size="sm" variant={riskFilter === r ? 'default' : 'outline'} onClick={() => setRiskFilter(r)} className={`text-xs h-7 capitalize ${r !== 'all' ? riskColors[r] : ''}`}>
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Direction</label>
                <div className="flex gap-1">
                  {(['all', 'bullish', 'bearish', 'neutral'] as const).map(d => (
                    <Button key={d} size="sm" variant={directionFilter === d ? 'default' : 'outline'} onClick={() => setDirectionFilter(d)} className={`text-xs h-7 capitalize ${d !== 'all' ? actionColors[d]?.replace('bg-', 'border-').replace('/20', '/40') : ''}`}>
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border pb-2">
            {[
              { id: 'ideas', label: 'Trade Ideas', count: filteredIdeas.length },
              { id: 'staged', label: 'Staged Trades', count: stagedTrades.length },
              { id: 'history', label: 'Execution History', count: executionHistory.length },
              { id: 'custom', label: 'Builder', count: 0 },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-4 py-2 text-sm font-mono rounded-t transition-colors ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Trade Ideas Tab */}
          {activeTab === 'ideas' && (
            <div className="grid gap-4">
              {filteredIdeas.map((idea, index) => (
                <div key={idea.id} className={`relative p-5 rounded-xl border transition-all ${isStaged(idea.ticker, idea.strategy) ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-card/50 border-border hover:border-cyan-500/30'}`}>
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-cyan-500 text-black text-xs font-bold flex items-center justify-center">{index + 1}</div>
                  <div className="absolute top-3 right-3">
                    {idea.model === 'claude' ? <Brain className="w-4 h-4 text-amber-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                        <span className="text-sm font-mono text-cyan-400">{idea.strategy}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${actionColors[idea.action]}`}>{idea.action}</span>
                        <Badge variant="outline" className={riskColors[idea.riskLevel]}>{idea.riskLevel}</Badge>
                        {idea.pop && <Badge variant="outline" className="text-cyan-400 border-cyan-500/40">{idea.pop.toFixed(0)}% POP</Badge>}
                      </div>

                      {/* Signal Context */}
                      <div className="mb-3 p-3 rounded-lg bg-card/80 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">Why This Structure</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${signalTypeColors[idea.signalType]}`}>{idea.signalType}</Badge>
                        </div>
                        <p className="text-sm text-foreground/90">{idea.signal}</p>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{idea.thesis}</p>

                      {/* Legs */}
                      <div className="mb-3 p-2 rounded bg-muted/20 border border-border/30">
                        <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Legs ({idea.legs.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {idea.legs.map((leg, i) => (
                            <span key={i} className={`px-2 py-1 rounded text-xs font-mono ${leg.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {leg.action.toUpperCase()} {leg.qty}x {leg.strike} {leg.type.toUpperCase()} {leg.expiry} @ ${leg.price}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Greeks */}
                      <div className="mb-3 flex gap-4 text-xs font-mono">
                        <span className="text-muted-foreground">Delta: <span className="text-foreground">{idea.greeks.delta}</span></span>
                        <span className="text-muted-foreground">Theta: <span className="text-green-400">{idea.greeks.theta}</span></span>
                        <span className="text-muted-foreground">Vega: <span className={idea.greeks.vega.startsWith('+') ? 'text-green-400' : 'text-red-400'}>{idea.greeks.vega}</span></span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-xs font-mono">
                        <div><span className="text-muted-foreground">Max Profit:</span><span className="ml-1 text-green-400">{idea.maxProfit}</span></div>
                        <div><span className="text-muted-foreground">Max Loss:</span><span className="ml-1 text-red-400">{idea.maxLoss}</span></div>
                        <div><span className="text-muted-foreground">Breakeven:</span><span className="ml-1 text-foreground">{idea.breakeven}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold font-mono ${idea.confidence >= 85 ? 'text-green-400' : idea.confidence >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{idea.confidence}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{idea.timeframe}</div>
                      <button onClick={() => handleStageTrade(idea)} className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${isStaged(idea.ticker, idea.strategy) ? 'bg-cyan-500 text-black' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40'}`}>
                        {isStaged(idea.ticker, idea.strategy) ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Staged</span> : <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Stage Trade</span>}
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
                  <p>No staged trades. Stage a trade from the Ideas tab.</p>
                </div>
              ) : (
                stagedTrades.map(trade => (
                  <div key={trade.id} className="p-4 rounded-lg border border-border bg-card/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold font-mono">{trade.ticker}</span>
                      <span className="text-sm text-cyan-400">{trade.strategy}</span>
                      <Badge variant="outline" className={actionColors[trade.action]}>{trade.action}</Badge>
                      <span className="text-sm text-muted-foreground">{trade.legs.length} legs | Staged: {trade.stagedAt.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/20" onClick={() => handleExecuteTrade(trade)} disabled={isExecuting}>
                        {isExecuting ? <Loader className="w-4 h-4 mr-1 animate-spin" /> : <ArrowUpRight className="w-4 h-4 mr-1" />} Execute
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400 border-red-500/40 hover:bg-red-500/20" onClick={() => handleCancelTrade(trade)}>
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
                      <span className="text-sm text-cyan-400">{trade.strategy}</span>
                      <Badge variant="outline" className={actionColors[trade.action]}>{trade.action}</Badge>
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

          {/* Custom Builder Tab */}
          {activeTab === 'custom' && (
            <div className="text-center py-12 text-muted-foreground">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Multi-leg strategy builder coming soon.</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" disabled><Plus className="w-4 h-4" /> Build Strategy</Button>
            </div>
          )}

          {/* Signal Legend */}
          <div className="mt-8 p-4 rounded-lg border border-border bg-card/30">
            <h3 className="text-sm font-mono font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-cyan-400" />
              Multi-Leg Signal Types
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
