'use client'

import { useState } from 'react'
import {
  Briefcase,
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Shield,
  Zap,
  Target,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'

type TradeType = 'options' | 'stocks' | 'hedges'
type AIModel = 'claude' | 'openai'

interface TradeIdea {
  id: string
  ticker: string
  type: TradeType
  action: 'BUY' | 'SELL'
  model: AIModel
  confidence: number
  entry: number
  stop: number
  target: number
  riskReward: number
  thesis: string
  strategy?: string
  legs?: { type: string; strike: number; expiry: string; premium: number }[]
}

const MOCK_IDEAS: TradeIdea[] = [
  {
    id: '1',
    ticker: 'NVDA',
    type: 'options',
    action: 'BUY',
    model: 'claude',
    confidence: 0.92,
    entry: 4.50,
    stop: 2.25,
    target: 9.00,
    riskReward: 2.0,
    thesis: 'Bull call spread ahead of earnings. IV elevated but justified given AI momentum.',
    strategy: 'Bull Call Spread',
    legs: [
      { type: 'BUY CALL', strike: 900, expiry: '2026-05-15', premium: 12.50 },
      { type: 'SELL CALL', strike: 950, expiry: '2026-05-15', premium: 8.00 },
    ],
  },
  {
    id: '2',
    ticker: 'AAPL',
    type: 'stocks',
    action: 'BUY',
    model: 'openai',
    confidence: 0.85,
    entry: 178.50,
    stop: 172.00,
    target: 195.00,
    riskReward: 2.54,
    thesis: 'Services revenue acceleration and iPhone upgrade cycle catalyst. Support at $172 is strong.',
  },
  {
    id: '3',
    ticker: 'SPY',
    type: 'hedges',
    action: 'BUY',
    model: 'claude',
    confidence: 0.88,
    entry: 2.80,
    stop: 1.40,
    target: 7.00,
    riskReward: 3.0,
    thesis: 'Put spread as portfolio hedge against market correction. VIX at historical lows.',
    strategy: 'Bear Put Spread',
    legs: [
      { type: 'BUY PUT', strike: 510, expiry: '2026-05-15', premium: 5.50 },
      { type: 'SELL PUT', strike: 490, expiry: '2026-05-15', premium: 2.70 },
    ],
  },
  {
    id: '4',
    ticker: 'AMD',
    type: 'stocks',
    action: 'BUY',
    model: 'claude',
    confidence: 0.87,
    entry: 164.00,
    stop: 155.00,
    target: 190.00,
    riskReward: 2.89,
    thesis: 'AI GPU competition heating up. MI300X gaining traction in enterprise. Breakout imminent.',
  },
  {
    id: '5',
    ticker: 'META',
    type: 'options',
    action: 'BUY',
    model: 'openai',
    confidence: 0.83,
    entry: 6.20,
    stop: 3.10,
    target: 12.00,
    riskReward: 1.87,
    thesis: 'Long call strategy for Q2 momentum. Ad revenue strong, AI investments paying off.',
    strategy: 'Long Call',
    legs: [
      { type: 'BUY CALL', strike: 520, expiry: '2026-06-20', premium: 6.20 },
    ],
  },
  {
    id: '6',
    ticker: 'QQQ',
    type: 'hedges',
    action: 'BUY',
    model: 'openai',
    confidence: 0.80,
    entry: 1.85,
    stop: 0.90,
    target: 5.50,
    riskReward: 3.84,
    thesis: 'Protective collar on tech exposure. Low cost hedge with limited upside sacrifice.',
    strategy: 'Collar',
    legs: [
      { type: 'BUY PUT', strike: 460, expiry: '2026-05-15', premium: 3.20 },
      { type: 'SELL CALL', strike: 500, expiry: '2026-05-15', premium: 1.35 },
    ],
  },
]

export default function TradeDeskPage() {
  const [activeTab, setActiveTab] = useState<TradeType>('stocks')
  const [modelFilter, setModelFilter] = useState<'all' | AIModel>('all')
  const [ticker, setTicker] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const filtered = MOCK_IDEAS.filter((idea) => {
    if (idea.type !== activeTab) return false
    if (modelFilter !== 'all' && idea.model !== modelFilter) return false
    if (ticker && !idea.ticker.toLowerCase().includes(ticker.toLowerCase())) return false
    return true
  })

  const generateIdeas = async () => {
    setIsGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsGenerating(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <TopNavBar />

      {/* Sub-header with page title and filters */}
      <header className="border-b border-border bg-card/30 sticky top-[49px] z-40">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold font-mono">TRADEDESK</h1>
              <Badge variant="outline" className="bg-theme-gold/10 text-theme-gold border-theme-gold/30 text-[10px]">
                Trading Floor
              </Badge>
            </div>

            {/* Model Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">AI Model:</span>
              <div className="flex items-center bg-muted/30 rounded-lg border border-border/50 p-0.5">
                {(['all', 'claude', 'openai'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModelFilter(m)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                      modelFilter === m
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m === 'claude' && <Brain className="w-3.5 h-3.5" />}
                    {m === 'openai' && <Sparkles className="w-3.5 h-3.5" />}
                    {m === 'all' ? 'All' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/30 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {([
              { id: 'stocks', label: 'Stocks', icon: TrendingUp, color: 'green' },
              { id: 'options', label: 'Options', icon: BarChart3, color: 'gold' },
              { id: 'hedges', label: 'Hedges', icon: Shield, color: 'red' },
            ] as const).map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all ${
                    isActive
                      ? tab.color === 'green'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : tab.color === 'gold'
                          ? 'bg-theme-gold/10 text-theme-gold border border-theme-gold/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <Input
              type="text"
              placeholder="Search ticker..."
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-40 h-8 text-xs bg-muted/30 border-border/50 font-mono"
            />
            <Button
              onClick={generateIdeas}
              disabled={isGenerating}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Generate Ideas
            </Button>
          </div>
        </div>
      </div>

      {/* Trade Ideas Grid */}
      <main className="p-6">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((idea) => {
            const isBuy = idea.action === 'BUY'

            return (
              <div
                key={idea.id}
                className={`rounded-lg border bg-card p-5 transition-all hover:shadow-lg ${
                  idea.type === 'stocks'
                    ? 'border-green-500/30'
                    : idea.type === 'options'
                      ? 'border-theme-gold/30'
                      : 'border-red-500/30'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                      <Badge
                        variant="outline"
                        className={`${
                          isBuy
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {isBuy ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {idea.action}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {idea.type.toUpperCase()}
                      </Badge>
                      {idea.strategy && (
                        <Badge variant="outline" className="text-[10px] border-theme-gold/30 text-theme-gold">
                          {idea.strategy}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* AI Model Badge */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                    idea.model === 'claude'
                      ? 'bg-theme-gold/10 border border-theme-gold/30'
                      : 'bg-primary/10 border border-primary/30'
                  }`}>
                    {idea.model === 'claude' ? (
                      <Brain className="w-3.5 h-3.5 text-theme-gold" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span className={`text-xs font-mono ${
                      idea.model === 'claude' ? 'text-theme-gold' : 'text-primary'
                    }`}>
                      {idea.model === 'claude' ? 'Claude' : 'OpenAI'}
                    </span>
                  </div>
                </div>

                {/* Confidence */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">Confidence</span>
                    <span className={`text-sm font-mono font-bold ${
                      idea.confidence >= 0.85 ? 'text-green-400' :
                      idea.confidence >= 0.75 ? 'text-theme-gold' : 'text-orange-400'
                    }`}>
                      {(idea.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        idea.confidence >= 0.85 ? 'bg-green-500' :
                        idea.confidence >= 0.75 ? 'bg-theme-gold' : 'bg-orange-500'
                      }`}
                      style={{ width: `${idea.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {/* Options Legs (if applicable) */}
                {idea.legs && idea.legs.length > 0 && (
                  <div className="mb-4 p-3 bg-muted/30 rounded border border-border/50">
                    <div className="text-[10px] font-mono text-muted-foreground mb-2 uppercase">Legs</div>
                    <div className="space-y-2">
                      {idea.legs.map((leg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={leg.type.includes('BUY') ? 'text-green-400' : 'text-red-400'}>
                              {leg.type}
                            </span>
                            <span className="text-foreground">${leg.strike}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{leg.expiry}</span>
                            <span className="text-theme-gold">${leg.premium.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Levels */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 bg-muted/30 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">ENTRY</div>
                    <div className="text-sm font-mono font-bold">${idea.entry.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">STOP</div>
                    <div className="text-sm font-mono font-bold text-red-400">${idea.stop.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">TARGET</div>
                    <div className="text-sm font-mono font-bold text-green-400">${idea.target.toFixed(2)}</div>
                  </div>
                </div>

                {/* Risk/Reward */}
                <div className="flex items-center justify-between p-2 bg-primary/5 rounded border border-primary/10 mb-4">
                  <span className="text-xs font-mono text-muted-foreground">Risk/Reward</span>
                  <span className={`text-sm font-mono font-bold ${
                    idea.riskReward >= 2.5 ? 'text-green-400' : 'text-theme-gold'
                  }`}>
                    1:{idea.riskReward.toFixed(2)}
                  </span>
                </div>

                {/* Thesis */}
                <div>
                  <div className="text-xs font-mono text-muted-foreground mb-1">THESIS</div>
                  <p className="text-xs text-foreground leading-relaxed">{idea.thesis}</p>
                </div>

                {/* Stage Trade Button */}
                <Button className="w-full mt-4 gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
                  <Target className="w-4 h-4" />
                  Stage Trade
                </Button>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Trade Ideas</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting filters or generate new ideas
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center">
            <strong className="text-foreground/60">Disclaimer:</strong> Trade ideas are generated by AI (Claude and OpenAI).
            This is for paper trading and educational purposes only. Always do your own research.
          </p>
        </div>
      </main>
    </div>
  )
}
