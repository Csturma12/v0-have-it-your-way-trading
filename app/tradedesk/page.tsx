'use client'

import { useState } from 'react'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  RefreshCw,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'

interface TradeIdea {
  id: string
  rank: number
  ticker: string
  action: 'BUY' | 'SELL'
  confidence: number
  entry: number
  stop: number
  target: number
  riskReward: number
  thesis: string
  timeframe: string
  signal: string
  signalType: 'momentum' | 'technical' | 'fundamental' | 'flow' | 'sentiment'
}

const CLAUDE_IDEAS: TradeIdea[] = [
  {
    id: 'claude-1',
    rank: 1,
    ticker: 'NVDA',
    action: 'BUY',
    confidence: 94,
    entry: 205.50,
    stop: 195.00,
    target: 235.00,
    riskReward: 2.8,
    thesis: 'AI infrastructure spending accelerating, data center demand surge',
    timeframe: '2-4 weeks',
    signal: 'Unusual call volume 3.2x avg, dark pool accumulation detected',
    signalType: 'flow',
  },
  {
    id: 'claude-2',
    rank: 2,
    ticker: 'AAPL',
    action: 'BUY',
    confidence: 87,
    entry: 182.40,
    stop: 175.80,
    target: 198.00,
    riskReward: 2.4,
    thesis: 'iPhone 16 pre-order data exceeding expectations, Services growth',
    timeframe: '3-5 weeks',
    signal: 'RSI divergence, golden cross forming on daily',
    signalType: 'technical',
  },
  {
    id: 'claude-3',
    rank: 3,
    ticker: 'TSLA',
    action: 'SELL',
    confidence: 79,
    entry: 178.20,
    stop: 188.00,
    target: 155.00,
    riskReward: 2.4,
    thesis: 'Price cuts eroding margins, competition intensifying in EV space',
    timeframe: '2-3 weeks',
    signal: 'Insider selling activity, negative analyst revisions',
    signalType: 'fundamental',
  },
  {
    id: 'claude-4',
    rank: 4,
    ticker: 'META',
    action: 'BUY',
    confidence: 85,
    entry: 425.80,
    stop: 408.00,
    target: 475.00,
    riskReward: 2.8,
    thesis: 'AI ad targeting improvements driving ROAS, Reels monetization up',
    timeframe: '4-6 weeks',
    signal: 'Institutional accumulation, 52-week high breakout',
    signalType: 'momentum',
  },
  {
    id: 'claude-5',
    rank: 5,
    ticker: 'AMD',
    action: 'BUY',
    confidence: 82,
    entry: 156.20,
    stop: 148.00,
    target: 180.00,
    riskReward: 2.9,
    thesis: 'MI300 datacenter GPU gaining market share, enterprise AI adoption',
    timeframe: '3-4 weeks',
    signal: 'Volume breakout, sector rotation into semis',
    signalType: 'momentum',
  },
]

const OPENAI_IDEAS: TradeIdea[] = [
  {
    id: 'openai-1',
    rank: 1,
    ticker: 'MSFT',
    action: 'BUY',
    confidence: 91,
    entry: 378.50,
    stop: 365.00,
    target: 420.00,
    riskReward: 3.1,
    thesis: 'Copilot enterprise adoption accelerating, Azure AI revenue surge',
    timeframe: '3-5 weeks',
    signal: 'Record call sweep activity, bullish options flow',
    signalType: 'flow',
  },
  {
    id: 'openai-2',
    rank: 2,
    ticker: 'GOOGL',
    action: 'BUY',
    confidence: 86,
    entry: 142.30,
    stop: 136.00,
    target: 158.00,
    riskReward: 2.5,
    thesis: 'Search AI integration boosting engagement, Cloud growth reaccelerating',
    timeframe: '4-6 weeks',
    signal: 'Undervalued vs peers, positive earnings revision trend',
    signalType: 'fundamental',
  },
  {
    id: 'openai-3',
    rank: 3,
    ticker: 'AMZN',
    action: 'BUY',
    confidence: 84,
    entry: 178.90,
    stop: 170.00,
    target: 200.00,
    riskReward: 2.4,
    thesis: 'AWS AI services demand, Prime membership growth, margin expansion',
    timeframe: '3-4 weeks',
    signal: 'Cup and handle pattern, breaking out of consolidation',
    signalType: 'technical',
  },
  {
    id: 'openai-4',
    rank: 4,
    ticker: 'CRM',
    action: 'BUY',
    confidence: 78,
    entry: 265.40,
    stop: 252.00,
    target: 295.00,
    riskReward: 2.2,
    thesis: 'Einstein AI driving upsells, enterprise cloud consolidation',
    timeframe: '4-8 weeks',
    signal: 'Social sentiment spike, analyst upgrades',
    signalType: 'sentiment',
  },
  {
    id: 'openai-5',
    rank: 5,
    ticker: 'PLTR',
    action: 'BUY',
    confidence: 75,
    entry: 22.80,
    stop: 20.50,
    target: 28.00,
    riskReward: 2.3,
    thesis: 'Government AI contracts expanding, commercial segment inflection',
    timeframe: '2-4 weeks',
    signal: 'Gamma squeeze setup, high short interest',
    signalType: 'flow',
  },
]

const signalTypeColors: Record<string, string> = {
  momentum: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  technical: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fundamental: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  flow: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  sentiment: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

function TradeCard({ idea, accent, executeTrade, isExecuting }: { idea: TradeIdea; accent: string; executeTrade: (order: { ticker: string; side: 'buy' | 'sell'; quantity: number; orderType: 'market' | 'limit' | 'stop' }) => Promise<{ success: boolean; orderId?: string; message?: string }>; isExecuting: boolean }) {
  const [staged, setStaged] = useState(false)
  const [tradeResult, setTradeResult] = useState<{ success: boolean; message?: string } | null>(null)

  const handleStageTrade = async () => {
    if (staged) {
      setStaged(false)
      return
    }
    setStaged(true)
    const result = await executeTrade({
      ticker: idea.ticker,
      side: idea.action === 'BUY' ? 'buy' : 'sell',
      quantity: 10,
      orderType: 'market',
    })
    setTradeResult({ success: result.success, message: result.message })
    setTimeout(() => setTradeResult(null), 3000)
  }

  return (
    <div className={`p-4 rounded-lg border ${idea.action === 'BUY' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'} relative`}>
      {/* Rank Badge */}
      <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full ${accent} flex items-center justify-center text-[10px] font-bold text-white`}>
        {idea.rank}
      </div>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono">{idea.ticker}</span>
          <Badge variant="outline" className={idea.action === 'BUY' ? 'text-green-400 border-green-500/40' : 'text-red-400 border-red-500/40'}>
            {idea.action === 'BUY' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {idea.action}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Confidence</div>
          <div className={`text-lg font-bold font-mono ${idea.confidence >= 85 ? 'text-green-400' : idea.confidence >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
            {idea.confidence}%
          </div>
        </div>
      </div>

      {/* Signal Context */}
      <div className="mb-3 p-2 rounded bg-card/50 border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-mono uppercase text-muted-foreground">Why It&apos;s Moving</span>
          <Badge variant="outline" className={`text-[8px] px-1.5 py-0 ${signalTypeColors[idea.signalType]}`}>
            {idea.signalType}
          </Badge>
        </div>
        <p className="text-xs text-foreground/80">{idea.signal}</p>
      </div>

      {/* Thesis */}
      <p className="text-xs text-muted-foreground mb-3">{idea.thesis}</p>

      {/* Price Levels */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="p-1.5 rounded bg-muted/30">
          <div className="text-[9px] text-muted-foreground uppercase">Entry</div>
          <div className="text-sm font-mono font-bold text-foreground">${idea.entry.toFixed(2)}</div>
        </div>
        <div className="p-1.5 rounded bg-red-500/10">
          <div className="text-[9px] text-red-400 uppercase">Stop</div>
          <div className="text-sm font-mono font-bold text-red-400">${idea.stop.toFixed(2)}</div>
        </div>
        <div className="p-1.5 rounded bg-green-500/10">
          <div className="text-[9px] text-green-400 uppercase">Target</div>
          <div className="text-sm font-mono font-bold text-green-400">${idea.target.toFixed(2)}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" /> R:R {idea.riskReward.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {idea.timeframe}
          </span>
        </div>
        <Button
          size="sm"
          variant={staged ? 'default' : 'outline'}
          className={`h-7 text-[10px] ${staged ? 'bg-green-500 hover:bg-green-600' : ''}`}
          onClick={handleStageTrade}
          disabled={isExecuting}
        >
          {isExecuting ? <Loader className="w-3 h-3 animate-spin" /> : staged ? 'Staged' : 'Stage Trade'}
        </Button>
        {tradeResult && (
          <div className={`absolute bottom-2 right-2 text-[9px] px-2 py-1 rounded ${tradeResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {tradeResult.success ? 'Order placed!' : tradeResult.message || 'Failed'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TradeDeskPage() {
  const [refreshing, setRefreshing] = useState(false)
  const { executeTrade, loading: isExecuting } = useBrokerTrade('alpaca')

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavBar />

      <main className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              Trading Floor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-generated trade ideas from Claude and OpenAI models
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Ideas
          </Button>
        </div>

        {/* Two Column Layout - Claude vs OpenAI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Claude Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono text-amber-400">Claude Analysis</h2>
                <p className="text-xs text-muted-foreground">Top 5 trades by Anthropic Claude</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
                <div className="text-lg font-bold font-mono text-amber-400">
                  {Math.round(CLAUDE_IDEAS.reduce((a, b) => a + b.confidence, 0) / CLAUDE_IDEAS.length)}%
                </div>
              </div>
            </div>
            {CLAUDE_IDEAS.map((idea) => (
              <TradeCard key={idea.id} idea={idea} accent="bg-amber-500" executeTrade={executeTrade} isExecuting={isExecuting} />
            ))}
          </div>

          {/* OpenAI Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono text-emerald-400">OpenAI Analysis</h2>
                <p className="text-xs text-muted-foreground">Top 5 trades by OpenAI GPT</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {Math.round(OPENAI_IDEAS.reduce((a, b) => a + b.confidence, 0) / OPENAI_IDEAS.length)}%
                </div>
              </div>
            </div>
            {OPENAI_IDEAS.map((idea) => (
              <TradeCard key={idea.id} idea={idea} accent="bg-emerald-500" executeTrade={executeTrade} isExecuting={isExecuting} />
            ))}
          </div>
        </div>

        {/* Signal Legend */}
        <div className="mt-8 p-4 rounded-lg border border-border bg-card/30">
          <h3 className="text-sm font-mono font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Signal Types
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(signalTypeColors).map(([type, colors]) => (
              <Badge key={type} variant="outline" className={`${colors} capitalize`}>
                {type === 'flow' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                {type === 'momentum' && <TrendingUp className="w-3 h-3 mr-1" />}
                {type === 'technical' && <Target className="w-3 h-3 mr-1" />}
                {type === 'fundamental' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                {type === 'sentiment' && <Sparkles className="w-3 h-3 mr-1" />}
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
