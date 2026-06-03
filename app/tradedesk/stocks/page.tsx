'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { 
  TrendingUp, TrendingDown, Brain, Sparkles, Clock, Target, CheckCircle, Search, Filter,
  Plus, History, X, Save, ArrowUpRight, Zap, AlertTriangle, RefreshCw, Loader
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'
import { AlpacaTradeUpdates } from '@/components/alpaca/trade-updates'

type Model = 'claude' | 'openai'
type RiskLevel = 'low' | 'medium' | 'high'
type Timeframe = 'short' | 'medium' | 'long'
type SignalType = 'momentum' | 'technical' | 'fundamental' | 'flow' | 'sentiment'

interface StockIdea {
  id: number
  ticker: string
  name: string
  action: 'buy' | 'sell'
  confidence: number
  entry: number
  stop: number
  target: number
  thesis: string
  timeframe: string
  riskReward: string
  model: Model
  riskLevel: RiskLevel
  signal: string
  signalType: SignalType
  currentPrice?: number
  change?: number
  changePercent?: number
}

interface StagedTrade {
  id: string
  ticker: string
  action: 'buy' | 'sell'
  entry: number
  quantity: number
  stagedAt: Date
  status: 'staged' | 'executed' | 'cancelled'
}

interface CustomIdea {
  id: string
  ticker: string
  action: 'buy' | 'sell'
  entry: number
  stop: number
  target: number
  thesis: string
  createdAt: Date
}

const CLAUDE_IDEAS: StockIdea[] = [
  { id: 1, ticker: 'NVDA', name: 'NVIDIA Corp', action: 'buy', confidence: 94, entry: 205.50, stop: 195.00, target: 235.00, thesis: 'AI compute demand surge. Data center revenue +400% YoY. Blackwell architecture launch imminent.', timeframe: '2-4 weeks', riskReward: '2.8:1', model: 'claude', riskLevel: 'medium', signal: 'Unusual call volume 3.2x avg, dark pool accumulation detected', signalType: 'flow', currentPrice: 206.80, change: 5.45, changePercent: 2.71 },
  { id: 2, ticker: 'AAPL', name: 'Apple Inc', action: 'buy', confidence: 87, entry: 182.40, stop: 175.80, target: 198.00, thesis: 'iPhone 16 cycle catalyst. Services revenue at ATH. Buyback support at current levels.', timeframe: '3-5 weeks', riskReward: '2.4:1', model: 'claude', riskLevel: 'low', signal: 'RSI divergence forming, golden cross on daily chart', signalType: 'technical', currentPrice: 183.10, change: 1.85, changePercent: 1.02 },
  { id: 3, ticker: 'TSLA', name: 'Tesla Inc', action: 'sell', confidence: 79, entry: 178.20, stop: 188.00, target: 155.00, thesis: 'EV margin compression. China competition intensifying. Robotaxi timeline uncertain.', timeframe: '2-3 weeks', riskReward: '2.4:1', model: 'claude', riskLevel: 'high', signal: 'Insider selling activity, negative analyst revisions', signalType: 'fundamental', currentPrice: 177.50, change: -3.20, changePercent: -1.77 },
  { id: 4, ticker: 'AMD', name: 'AMD Inc', action: 'buy', confidence: 82, entry: 156.20, stop: 148.00, target: 180.00, thesis: 'MI300X gaining hyperscaler traction. Market share gains vs Intel continuing.', timeframe: '3-4 weeks', riskReward: '2.9:1', model: 'claude', riskLevel: 'medium', signal: 'Volume breakout, sector rotation into semis', signalType: 'momentum', currentPrice: 157.40, change: 2.10, changePercent: 1.35 },
  { id: 5, ticker: 'META', name: 'Meta Platforms', action: 'buy', confidence: 85, entry: 425.80, stop: 408.00, target: 475.00, thesis: 'Reels monetization improving. AI ad targeting efficiency gains. Reality Labs losses narrowing.', timeframe: '4-6 weeks', riskReward: '2.8:1', model: 'claude', riskLevel: 'medium', signal: 'Institutional accumulation, 52-week high breakout', signalType: 'momentum', currentPrice: 428.90, change: 6.20, changePercent: 1.47 },
]

const OPENAI_IDEAS: StockIdea[] = [
  { id: 6, ticker: 'MSFT', name: 'Microsoft Corp', action: 'buy', confidence: 91, entry: 378.50, stop: 365.00, target: 420.00, thesis: 'Azure AI integration driving enterprise adoption. Copilot monetization ramping. Cloud margins expanding.', timeframe: '3-5 weeks', riskReward: '3.1:1', model: 'openai', riskLevel: 'low', signal: 'Record call sweep activity, bullish options flow', signalType: 'flow', currentPrice: 380.20, change: 4.30, changePercent: 1.14 },
  { id: 7, ticker: 'GOOGL', name: 'Alphabet Inc', action: 'buy', confidence: 86, entry: 142.30, stop: 136.00, target: 158.00, thesis: 'Search AI moat intact. YouTube Shorts monetization. Cloud growth reaccelerating.', timeframe: '4-6 weeks', riskReward: '2.5:1', model: 'openai', riskLevel: 'low', signal: 'Undervalued vs peers, positive earnings revision trend', signalType: 'fundamental', currentPrice: 143.50, change: 1.80, changePercent: 1.27 },
  { id: 8, ticker: 'AMZN', name: 'Amazon.com', action: 'buy', confidence: 84, entry: 178.90, stop: 170.00, target: 200.00, thesis: 'AWS growth reaccelerating. Retail margins improving. Advertising segment outperforming.', timeframe: '3-4 weeks', riskReward: '2.4:1', model: 'openai', riskLevel: 'medium', signal: 'Cup and handle pattern, breaking out of consolidation', signalType: 'technical', currentPrice: 180.20, change: 2.50, changePercent: 1.41 },
  { id: 9, ticker: 'CRM', name: 'Salesforce Inc', action: 'buy', confidence: 78, entry: 265.40, stop: 252.00, target: 295.00, thesis: 'AI features driving upsells. Margin expansion story intact. Enterprise spending recovering.', timeframe: '4-8 weeks', riskReward: '2.2:1', model: 'openai', riskLevel: 'medium', signal: 'Social sentiment spike, analyst upgrades', signalType: 'sentiment', currentPrice: 267.80, change: 3.40, changePercent: 1.29 },
  { id: 10, ticker: 'PLTR', name: 'Palantir Tech', action: 'buy', confidence: 75, entry: 22.80, stop: 20.50, target: 28.00, thesis: 'Government AI contracts expanding. Commercial segment inflection point.', timeframe: '2-4 weeks', riskReward: '2.3:1', model: 'openai', riskLevel: 'high', signal: 'Gamma squeeze setup, high short interest', signalType: 'flow', currentPrice: 23.10, change: 0.45, changePercent: 1.99 },
]

const signalTypeColors: Record<SignalType, string> = {
  momentum: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  technical: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fundamental: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  flow: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  sentiment: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

const riskColors: Record<RiskLevel, string> = {
  low: 'text-green-400 border-green-500/40',
  medium: 'text-amber-400 border-amber-500/40',
  high: 'text-red-400 border-red-500/40',
}

export default function StocksPage() {
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState<Model | 'all'>('all')
  const [searchTicker, setSearchTicker] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [timeframeFilter, setTimeframeFilter] = useState<Timeframe | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [broker, setBroker] = useState<'alpaca' | 'tastytrade'>('alpaca')
  const { executeTrade, loading: isExecuting } = useBrokerTrade(broker)
  
  const [ideas, setIdeas] = useState<StockIdea[]>([...CLAUDE_IDEAS, ...OPENAI_IDEAS])
  const [stagedTrades, setStagedTrades] = useState<StagedTrade[]>([])
  const [executionHistory, setExecutionHistory] = useState<StagedTrade[]>([])
  const [customIdeas, setCustomIdeas] = useState<CustomIdea[]>([])
  
  const [showCreateIdea, setShowCreateIdea] = useState(false)
  const [newIdea, setNewIdea] = useState<{ ticker: string; action: 'buy' | 'sell'; entry: string; stop: string; target: string; thesis: string }>({ ticker: '', action: 'buy', entry: '', stop: '', target: '', thesis: '' })
  
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
        change: q.change || idea.change,
        changePercent: q.changePercent || idea.changePercent,
      }
    }))
  }, [liveQuotes])

  const filteredIdeas = ideas.filter(idea => {
    if (selectedModel !== 'all' && idea.model !== selectedModel) return false
    if (searchTicker && !idea.ticker.toLowerCase().includes(searchTicker.toLowerCase())) return false
    if (riskFilter !== 'all' && idea.riskLevel !== riskFilter) return false
    if (timeframeFilter === 'short' && !idea.timeframe.includes('1-') && !idea.timeframe.includes('2-')) return false
    if (timeframeFilter === 'medium' && !idea.timeframe.includes('3-') && !idea.timeframe.includes('4-')) return false
    if (timeframeFilter === 'long' && !idea.timeframe.includes('5-') && !idea.timeframe.includes('6-') && !idea.timeframe.includes('8')) return false
    return true
  }).sort((a, b) => b.confidence - a.confidence)

  const handleStageTrade = (idea: StockIdea) => {
    const existingIdx = stagedTrades.findIndex(t => t.ticker === idea.ticker)
    if (existingIdx >= 0) {
      setStagedTrades(prev => prev.filter((_, i) => i !== existingIdx))
    } else {
      const staged: StagedTrade = {
        id: `staged-${Date.now()}`,
        ticker: idea.ticker,
        action: idea.action,
        entry: idea.entry,
        quantity: 10,
        stagedAt: new Date(),
        status: 'staged',
      }
      setStagedTrades(prev => [...prev, staged])
    }
  }

  const handleExecuteTrade = async (trade: StagedTrade) => {
    // Execute the trade through the broker
    const order = {
      ticker: trade.ticker,
      side: trade.action,
      quantity: trade.quantity,
      orderType: 'market' as const,
    }
    const result = await executeTrade(order)
    
    // Move to execution history
    setStagedTrades(prev => prev.filter(t => t.id !== trade.id))
    setExecutionHistory(prev => [...prev, { ...trade, status: 'executed' }])
  }

  const handleCancelTrade = (trade: StagedTrade) => {
    setStagedTrades(prev => prev.filter(t => t.id !== trade.id))
    setExecutionHistory(prev => [...prev, { ...trade, status: 'cancelled' }])
  }

  const handleSaveCustomIdea = () => {
    if (!newIdea.ticker || !newIdea.entry) return
    const custom: CustomIdea = {
      id: `custom-${Date.now()}`,
      ticker: newIdea.ticker.toUpperCase(),
      action: newIdea.action,
      entry: parseFloat(newIdea.entry),
      stop: parseFloat(newIdea.stop) || 0,
      target: parseFloat(newIdea.target) || 0,
      thesis: newIdea.thesis,
      createdAt: new Date(),
    }
    setCustomIdeas(prev => [...prev, custom])
    setNewIdea({ ticker: '', action: 'buy', entry: '', stop: '', target: '', thesis: '' })
    setShowCreateIdea(false)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }

  const isStaged = (ticker: string) => stagedTrades.some(t => t.ticker === ticker)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavBar />
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-400" />
                Stock Trade Ideas
              </h1>
              <p className="text-sm text-muted-foreground mt-1">AI-powered directional equity plays with real-time signals</p>
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

          {/* Model Toggle */}
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
                <label className="text-xs text-muted-foreground mb-2 block">Timeframe</label>
                <div className="flex gap-1">
                  {[{ k: 'all', l: 'All' }, { k: 'short', l: '1-2 wks' }, { k: 'medium', l: '3-4 wks' }, { k: 'long', l: '5+ wks' }].map(t => (
                    <Button key={t.k} size="sm" variant={timeframeFilter === t.k ? 'default' : 'outline'} onClick={() => setTimeframeFilter(t.k as Timeframe | 'all')} className="text-xs h-7">
                      {t.l}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Broker Selector */}
          <div className="mb-4 p-3 rounded-lg bg-card/50 border border-border flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Paper Trading via:</span>
            <div className="flex gap-2">
              {(['alpaca', 'tastytrade'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBroker(b)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold uppercase transition-colors ${
                    broker === b
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {b === 'alpaca' ? '🦙 Alpaca' : '🥜 Tastytrade'}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border pb-2">
            {[
              { id: 'ideas', label: 'Trade Ideas', count: filteredIdeas.length },
              { id: 'staged', label: 'Staged Trades', count: stagedTrades.length },
              { id: 'history', label: 'Execution History', count: executionHistory.length },
              { id: 'custom', label: 'My Ideas', count: customIdeas.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-4 py-2 text-sm font-mono rounded-t transition-colors ${activeTab === tab.id ? 'bg-green-500/20 text-green-400 border-b-2 border-green-500' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Trade Ideas Tab */}
          {activeTab === 'ideas' && (
            <div className="grid gap-4">
              {filteredIdeas.map((idea, index) => (
                <div key={idea.id} className={`relative p-5 rounded-xl border transition-all ${isStaged(idea.ticker) ? 'bg-green-500/10 border-green-500/40' : 'bg-card/50 border-border hover:border-green-500/30'}`}>
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-green-500 text-black text-xs font-bold flex items-center justify-center">{index + 1}</div>
                  <div className="absolute top-3 right-3">
                    {idea.model === 'claude' ? <Brain className="w-4 h-4 text-amber-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${idea.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{idea.action}</span>
                        <Badge variant="outline" className={riskColors[idea.riskLevel]}>{idea.riskLevel}</Badge>
                        <span className="text-xs text-muted-foreground">{idea.name}</span>
                      </div>

                      {/* Live Price */}
                      <div className="flex items-center gap-3 mb-3 text-sm">
                        <span className="font-mono font-bold">${idea.currentPrice?.toFixed(2)}</span>
                        <span className={`flex items-center gap-1 ${idea.change! >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {idea.change! >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {idea.change! >= 0 ? '+' : ''}{idea.change?.toFixed(2)} ({idea.changePercent?.toFixed(2)}%)
                        </span>
                      </div>

                      {/* Signal Context - Why It's Moving */}
                      <div className="mb-3 p-3 rounded-lg bg-card/80 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">Why It&apos;s Moving</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${signalTypeColors[idea.signalType]}`}>{idea.signalType}</Badge>
                        </div>
                        <p className="text-sm text-foreground/90">{idea.signal}</p>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{idea.thesis}</p>
                      
                      <div className="flex items-center gap-6 text-xs font-mono">
                        <div><span className="text-muted-foreground">Entry:</span><span className="ml-1 text-foreground">${idea.entry.toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Stop:</span><span className="ml-1 text-red-400">${idea.stop.toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Target:</span><span className="ml-1 text-green-400">${idea.target.toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">R:R</span><span className="ml-1 text-cyan-400">{idea.riskReward}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold font-mono ${idea.confidence >= 85 ? 'text-green-400' : idea.confidence >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{idea.confidence}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{idea.timeframe}</div>
                      <button onClick={() => handleStageTrade(idea)} className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${isStaged(idea.ticker) ? 'bg-green-500 text-black' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40'}`}>
                        {isStaged(idea.ticker) ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Staged</span> : <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Stage Trade</span>}
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
                      <Badge variant="outline" className={trade.action === 'buy' ? 'text-green-400 border-green-500/40' : 'text-red-400 border-red-500/40'}>{trade.action.toUpperCase()}</Badge>
                      <span className="text-sm text-muted-foreground">Entry: ${trade.entry.toFixed(2)} | Qty: {trade.quantity} | Staged: {trade.stagedAt.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-400 border-green-500/40 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isExecuting} onClick={() => handleExecuteTrade(trade)}>
                        {isExecuting ? (
                          <>
                            <Loader className="w-4 h-4 mr-1 animate-spin" /> Executing...
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-4 h-4 mr-1" /> Execute
                          </>
                        )}
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
                      <Badge variant="outline" className={trade.action === 'buy' ? 'text-green-400' : 'text-red-400'}>{trade.action.toUpperCase()}</Badge>
                      <span className="text-sm text-muted-foreground">Entry: ${trade.entry.toFixed(2)} | Qty: {trade.quantity}</span>
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
            <div className="space-y-4">
              {customIdeas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No custom ideas. Create your own trade idea.</p>
                  <Button variant="outline" size="sm" onClick={() => setShowCreateIdea(true)} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Create Idea</Button>
                </div>
              ) : (
                customIdeas.map(idea => (
                  <div key={idea.id} className={`p-4 rounded-lg border ${idea.action === 'buy' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold font-mono">{idea.ticker}</span>
                      <Badge variant="outline" className={idea.action === 'buy' ? 'text-green-400' : 'text-red-400'}>{idea.action.toUpperCase()}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2 text-center text-sm">
                      <div className="p-1 rounded bg-muted/30">Entry: ${idea.entry.toFixed(2)}</div>
                      <div className="p-1 rounded bg-red-500/10 text-red-400">Stop: ${idea.stop.toFixed(2)}</div>
                      <div className="p-1 rounded bg-green-500/10 text-green-400">Target: ${idea.target.toFixed(2)}</div>
                    </div>
                    {idea.thesis && <p className="text-xs text-muted-foreground">{idea.thesis}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Create Custom Idea Modal */}
          {showCreateIdea && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold font-mono">Create Custom Stock Idea</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateIdea(false)}><X className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="TICKER" value={newIdea.ticker} onChange={e => setNewIdea(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} className="flex-1" />
                    <Button variant={newIdea.action === 'buy' ? 'default' : 'outline'} onClick={() => setNewIdea(p => ({ ...p, action: 'buy' }))} className="text-green-400">BUY</Button>
                    <Button variant={newIdea.action === 'sell' ? 'default' : 'outline'} onClick={() => setNewIdea(p => ({ ...p, action: 'sell' }))} className="text-red-400">SELL</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="Entry" type="number" value={newIdea.entry} onChange={e => setNewIdea(p => ({ ...p, entry: e.target.value }))} />
                    <Input placeholder="Stop" type="number" value={newIdea.stop} onChange={e => setNewIdea(p => ({ ...p, stop: e.target.value }))} />
                    <Input placeholder="Target" type="number" value={newIdea.target} onChange={e => setNewIdea(p => ({ ...p, target: e.target.value }))} />
                  </div>
                  <Input placeholder="Thesis / Reasoning" value={newIdea.thesis} onChange={e => setNewIdea(p => ({ ...p, thesis: e.target.value }))} />
                  <Button className="w-full gap-2" onClick={handleSaveCustomIdea}><Save className="w-4 h-4" /> Save Idea</Button>
                </div>
              </div>
            </div>
          )}

          {/* Signal Legend */}
          <div className="mt-8 p-4 rounded-lg border border-border bg-card/30">
            <h3 className="text-sm font-mono font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Signal Types (Why It&apos;s Moving)
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(signalTypeColors).map(([type, colors]) => (
                <Badge key={type} variant="outline" className={`${colors} capitalize`}>{type}</Badge>
              ))}
            </div>
          </div>
        </div>
        
        {/* Live Trade Updates */}
        {broker === 'alpaca' && (
          <div className="fixed bottom-4 right-4 w-80 z-40">
            <AlpacaTradeUpdates maxUpdates={5} />
          </div>
        )}
      </main>
    </div>
  )
}
