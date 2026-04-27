'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { 
  BarChart3, Brain, Sparkles, Clock, Target, CheckCircle, Search, Filter,
  Plus, History, X, Save, ArrowUpRight, Zap, AlertTriangle, RefreshCw, TrendingUp, TrendingDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'

type Model = 'claude' | 'openai'
type RiskLevel = 'low' | 'medium' | 'high'
type SignalType = 'iv-crush' | 'gamma' | 'theta-decay' | 'skew' | 'flow'

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
  riskLevel: RiskLevel
  signal: string
  signalType: SignalType
  ivPercentile?: number
  currentPrice?: number
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

interface CustomIdea {
  id: string
  ticker: string
  strategy: string
  action: 'bullish' | 'bearish' | 'neutral'
  legs: OptionLeg[]
  thesis: string
  createdAt: Date
}

const CLAUDE_IDEAS: OptionIdea[] = [
  { 
    id: 1, ticker: 'NVDA', strategy: 'Bull Call Spread', action: 'bullish', confidence: 92,
    legs: [
      { action: 'buy', type: 'call', strike: 210, expiry: 'May 17', price: 12.50 },
      { action: 'sell', type: 'call', strike: 230, expiry: 'May 17', price: 5.20 },
    ],
    maxProfit: '$1,270', maxLoss: '$730', breakeven: '$217.30',
    thesis: 'Defined risk play on AI momentum. Earnings catalyst ahead. IV percentile at 45%.', 
    timeframe: '3 weeks', riskReward: '1.74:1', model: 'claude', riskLevel: 'medium',
    signal: 'IV skew favors calls, unusual 220C sweep activity detected', signalType: 'flow', ivPercentile: 45, currentPrice: 206.80
  },
  { 
    id: 2, ticker: 'AAPL', strategy: 'Long Call', action: 'bullish', confidence: 85,
    legs: [
      { action: 'buy', type: 'call', strike: 185, expiry: 'Jun 21', price: 6.40 },
    ],
    maxProfit: 'Unlimited', maxLoss: '$640', breakeven: '$191.40',
    thesis: 'WWDC catalyst. Services growth. Low IV environment favorable for long premium.', 
    timeframe: '6 weeks', riskReward: '3:1+', model: 'claude', riskLevel: 'medium',
    signal: 'IV at 52-week low, theta decay minimal 45+ DTE', signalType: 'iv-crush', ivPercentile: 18, currentPrice: 183.10
  },
  { 
    id: 3, ticker: 'TSLA', strategy: 'Bear Put Spread', action: 'bearish', confidence: 78,
    legs: [
      { action: 'buy', type: 'put', strike: 175, expiry: 'May 17', price: 8.90 },
      { action: 'sell', type: 'put', strike: 160, expiry: 'May 17', price: 4.30 },
    ],
    maxProfit: '$1,040', maxLoss: '$460', breakeven: '$170.40',
    thesis: 'EV margin compression. Defined risk bearish play ahead of delivery numbers.', 
    timeframe: '3 weeks', riskReward: '2.26:1', model: 'claude', riskLevel: 'medium',
    signal: 'Put skew elevated, dealer gamma negative below 170', signalType: 'gamma', ivPercentile: 62, currentPrice: 177.50
  },
  { 
    id: 4, ticker: 'AMD', strategy: 'Long Call', action: 'bullish', confidence: 80,
    legs: [
      { action: 'buy', type: 'call', strike: 160, expiry: 'May 31', price: 5.80 },
    ],
    maxProfit: 'Unlimited', maxLoss: '$580', breakeven: '$165.80',
    thesis: 'MI300X momentum. Breakout above resistance with volume.', 
    timeframe: '4 weeks', riskReward: '2.5:1+', model: 'claude', riskLevel: 'medium',
    signal: 'Call/put ratio 2.8x, gamma flip level at 155', signalType: 'flow', ivPercentile: 38, currentPrice: 157.40
  },
  { 
    id: 5, ticker: 'SPY', strategy: 'Iron Butterfly', action: 'neutral', confidence: 75,
    legs: [
      { action: 'sell', type: 'call', strike: 510, expiry: 'May 10', price: 4.20 },
      { action: 'sell', type: 'put', strike: 510, expiry: 'May 10', price: 4.10 },
      { action: 'buy', type: 'call', strike: 520, expiry: 'May 10', price: 1.30 },
      { action: 'buy', type: 'put', strike: 500, expiry: 'May 10', price: 1.20 },
    ],
    maxProfit: '$580', maxLoss: '$420', breakeven: '$504.20 / $515.80',
    thesis: 'Range-bound market. Theta collection strategy with defined risk.', 
    timeframe: '2 weeks', riskReward: '1.38:1', model: 'claude', riskLevel: 'low',
    signal: 'VIX term structure in contango, theta decay accelerating', signalType: 'theta-decay', ivPercentile: 28, currentPrice: 509.50
  },
]

const OPENAI_IDEAS: OptionIdea[] = [
  { 
    id: 6, ticker: 'MSFT', strategy: 'Bull Call Spread', action: 'bullish', confidence: 89,
    legs: [
      { action: 'buy', type: 'call', strike: 380, expiry: 'Jun 21', price: 18.40 },
      { action: 'sell', type: 'call', strike: 410, expiry: 'Jun 21', price: 8.20 },
    ],
    maxProfit: '$1,980', maxLoss: '$1,020', breakeven: '$390.20',
    thesis: 'Azure AI momentum. Copilot enterprise rollout. Defined risk into earnings.', 
    timeframe: '5 weeks', riskReward: '1.94:1', model: 'openai', riskLevel: 'medium',
    signal: 'Massive call sweep at 400 strike, smart money accumulation', signalType: 'flow', ivPercentile: 35, currentPrice: 380.20
  },
  { 
    id: 7, ticker: 'GOOGL', strategy: 'Long Call', action: 'bullish', confidence: 84,
    legs: [
      { action: 'buy', type: 'call', strike: 145, expiry: 'Jun 21', price: 7.20 },
    ],
    maxProfit: 'Unlimited', maxLoss: '$720', breakeven: '$152.20',
    thesis: 'Search AI moat. Cloud growth reaccelerating. Undervalued vs peers.', 
    timeframe: '5 weeks', riskReward: '2.5:1+', model: 'openai', riskLevel: 'medium',
    signal: 'IV percentile low, positive skew developing', signalType: 'skew', ivPercentile: 22, currentPrice: 143.50
  },
  { 
    id: 8, ticker: 'AMZN', strategy: 'Call Diagonal', action: 'bullish', confidence: 82,
    legs: [
      { action: 'buy', type: 'call', strike: 180, expiry: 'Jul 19', price: 12.80 },
      { action: 'sell', type: 'call', strike: 190, expiry: 'May 17', price: 4.60 },
    ],
    maxProfit: '$1,280+', maxLoss: '$820', breakeven: '$188.20',
    thesis: 'AWS growth. Retail margin expansion. Calendar reduces cost basis.', 
    timeframe: '3-8 weeks', riskReward: '1.56:1', model: 'openai', riskLevel: 'medium',
    signal: 'Front-month IV elevated, calendar spread advantage', signalType: 'iv-crush', ivPercentile: 42, currentPrice: 180.20
  },
  { 
    id: 9, ticker: 'META', strategy: 'Bull Put Spread', action: 'bullish', confidence: 86,
    legs: [
      { action: 'sell', type: 'put', strike: 420, expiry: 'May 17', price: 8.40 },
      { action: 'buy', type: 'put', strike: 400, expiry: 'May 17', price: 3.60 },
    ],
    maxProfit: '$480', maxLoss: '$1,520', breakeven: '$415.20',
    thesis: 'Support at 410 strong. Theta positive strategy. High probability trade.', 
    timeframe: '3 weeks', riskReward: '0.32:1', model: 'openai', riskLevel: 'low',
    signal: 'Put skew rich, premium selling environment favorable', signalType: 'theta-decay', ivPercentile: 48, currentPrice: 428.90
  },
  { 
    id: 10, ticker: 'QQQ', strategy: 'Straddle', action: 'neutral', confidence: 72,
    legs: [
      { action: 'buy', type: 'call', strike: 440, expiry: 'May 24', price: 9.80 },
      { action: 'buy', type: 'put', strike: 440, expiry: 'May 24', price: 8.60 },
    ],
    maxProfit: 'Unlimited', maxLoss: '$1,840', breakeven: '$421.60 / $458.40',
    thesis: 'FOMC volatility play. Expecting large move either direction.', 
    timeframe: '3 weeks', riskReward: 'Variable', model: 'openai', riskLevel: 'high',
    signal: 'IV crush expected post-FOMC, gamma scalping opportunity', signalType: 'gamma', ivPercentile: 55, currentPrice: 438.70
  },
]

const signalTypeColors: Record<SignalType, string> = {
  'iv-crush': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gamma: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'theta-decay': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  skew: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  flow: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
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

export default function OptionsPage() {
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState<Model | 'all'>('all')
  const [searchTicker, setSearchTicker] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [strategyFilter, setStrategyFilter] = useState<'all' | 'spreads' | 'singles' | 'premium'>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  const [ideas, setIdeas] = useState<OptionIdea[]>([...CLAUDE_IDEAS, ...OPENAI_IDEAS])
  const [stagedTrades, setStagedTrades] = useState<StagedTrade[]>([])
  const [executionHistory, setExecutionHistory] = useState<StagedTrade[]>([])
  const [customIdeas, setCustomIdeas] = useState<CustomIdea[]>([])
  
  const [showCreateIdea, setShowCreateIdea] = useState(false)
  const [activeTab, setActiveTab] = useState<'ideas' | 'staged' | 'history' | 'custom'>('ideas')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch live prices from Polygon API
  const tickers = [...CLAUDE_IDEAS, ...OPENAI_IDEAS].map(i => i.ticker)
  const { quotes: liveQuotes, lastUpdated } = useLiveQuotes(tickers, { refreshInterval: 30000 })

  // Update ideas with live prices when quotes change
  useEffect(() => {
    if (Object.keys(liveQuotes).length === 0) return
    setIdeas(prev => prev.map(idea => {
      const q = liveQuotes[idea.ticker]
      if (!q || q.loading) return idea
      return {
        ...idea,
        currentPrice: q.price || idea.currentPrice,
      }
    }))
  }, [liveQuotes])

  const filteredIdeas = ideas.filter(idea => {
    if (selectedModel !== 'all' && idea.model !== selectedModel) return false
    if (searchTicker && !idea.ticker.toLowerCase().includes(searchTicker.toLowerCase())) return false
    if (riskFilter !== 'all' && idea.riskLevel !== riskFilter) return false
    if (strategyFilter === 'spreads' && idea.legs.length < 2) return false
    if (strategyFilter === 'singles' && idea.legs.length > 1) return false
    if (strategyFilter === 'premium' && !idea.legs.some(l => l.action === 'sell')) return false
    return true
  }).sort((a, b) => b.confidence - a.confidence)

  const handleStageTrade = (idea: OptionIdea) => {
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

  const handleExecuteTrade = (trade: StagedTrade) => {
    setStagedTrades(prev => prev.filter(t => t.id !== trade.id))
    setExecutionHistory(prev => [...prev, { ...trade, status: 'executed' }])
    router.push(`/quicktrade?ticker=${trade.ticker}&strategy=${encodeURIComponent(trade.strategy)}`)
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
                <BarChart3 className="w-6 h-6 text-amber-400" />
                Options Trade Ideas
              </h1>
              <p className="text-sm text-muted-foreground mt-1">AI-powered options strategies with real-time IV and Greeks</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                <Filter className="w-4 h-4" /> Filters
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreateIdea(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create Idea
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
                <label className="text-xs text-muted-foreground mb-2 block">Strategy Type</label>
                <div className="flex gap-1">
                  {[{ k: 'all', l: 'All' }, { k: 'spreads', l: 'Spreads' }, { k: 'singles', l: 'Single Leg' }, { k: 'premium', l: 'Premium Selling' }].map(t => (
                    <Button key={t.k} size="sm" variant={strategyFilter === t.k ? 'default' : 'outline'} onClick={() => setStrategyFilter(t.k as typeof strategyFilter)} className="text-xs h-7">
                      {t.l}
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
              { id: 'custom', label: 'My Ideas', count: customIdeas.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-4 py-2 text-sm font-mono rounded-t transition-colors ${activeTab === tab.id ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Trade Ideas Tab */}
          {activeTab === 'ideas' && (
            <div className="grid gap-4">
              {filteredIdeas.map((idea, index) => (
                <div key={idea.id} className={`relative p-5 rounded-xl border transition-all ${isStaged(idea.ticker, idea.strategy) ? 'bg-amber-500/10 border-amber-500/40' : 'bg-card/50 border-border hover:border-amber-500/30'}`}>
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center">{index + 1}</div>
                  <div className="absolute top-3 right-3">
                    {idea.model === 'claude' ? <Brain className="w-4 h-4 text-amber-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                        <span className="text-sm font-mono text-muted-foreground">{idea.strategy}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${actionColors[idea.action]}`}>{idea.action}</span>
                        <Badge variant="outline" className={riskColors[idea.riskLevel]}>{idea.riskLevel}</Badge>
                      </div>

                      {/* Live Price + IV */}
                      <div className="flex items-center gap-4 mb-3 text-sm">
                        <span className="font-mono">${idea.currentPrice?.toFixed(2)}</span>
                        <span className="text-muted-foreground">IV Rank: <span className={idea.ivPercentile! > 50 ? 'text-red-400' : 'text-green-400'}>{idea.ivPercentile?.toFixed(0)}%</span></span>
                      </div>

                      {/* Signal Context */}
                      <div className="mb-3 p-3 rounded-lg bg-card/80 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">Why This Setup</span>
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
                              {leg.action.toUpperCase()} {leg.strike} {leg.type.toUpperCase()} {leg.expiry} @ ${leg.price}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-xs font-mono">
                        <div><span className="text-muted-foreground">Max Profit:</span><span className="ml-1 text-green-400">{idea.maxProfit}</span></div>
                        <div><span className="text-muted-foreground">Max Loss:</span><span className="ml-1 text-red-400">{idea.maxLoss}</span></div>
                        <div><span className="text-muted-foreground">Breakeven:</span><span className="ml-1 text-foreground">{idea.breakeven}</span></div>
                        <div><span className="text-muted-foreground">R:R</span><span className="ml-1 text-cyan-400">{idea.riskReward}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold font-mono ${idea.confidence >= 85 ? 'text-green-400' : idea.confidence >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{idea.confidence}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{idea.timeframe}</div>
                      <button onClick={() => handleStageTrade(idea)} className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${isStaged(idea.ticker, idea.strategy) ? 'bg-amber-500 text-black' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40'}`}>
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
                  <p>No staged trades. Stage a trade from the Ideas tab to execute.</p>
                </div>
              ) : (
                stagedTrades.map(trade => (
                  <div key={trade.id} className="p-4 rounded-lg border border-border bg-card/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold font-mono">{trade.ticker}</span>
                      <span className="text-sm text-muted-foreground">{trade.strategy}</span>
                      <Badge variant="outline" className={actionColors[trade.action]}>{trade.action}</Badge>
                      <span className="text-sm text-muted-foreground">Staged: {trade.stagedAt.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/40 hover:bg-amber-500/20" onClick={() => handleExecuteTrade(trade)}>
                        <ArrowUpRight className="w-4 h-4 mr-1" /> Execute
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

          {/* Execution History Tab */}
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
                      <span className="text-sm text-muted-foreground">{trade.strategy}</span>
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

          {/* Custom Ideas Tab */}
          {activeTab === 'custom' && (
            <div className="text-center py-12 text-muted-foreground">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Custom options idea builder coming soon.</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" disabled><Plus className="w-4 h-4" /> Create Options Idea</Button>
            </div>
          )}

          {/* Signal Legend */}
          <div className="mt-8 p-4 rounded-lg border border-border bg-card/30">
            <h3 className="text-sm font-mono font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Options Signal Types
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(signalTypeColors).map(([type, colors]) => (
                <Badge key={type} variant="outline" className={`${colors} capitalize`}>{type.replace('-', ' ')}</Badge>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
