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
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'

type TradeType = 'stocks' | 'options' | 'multileg' | 'hedges'
type AIModel = 'claude' | 'openai'

interface Leg {
  type: string
  strike: number
  expiry: string
  premium: number
}

interface TradeIdea {
  id: string
  rank: number
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
  timeframe?: string
  legs?: Leg[]
}

const MOCK_IDEAS: TradeIdea[] = [
  // ── STOCKS (5) ──────────────────────────────────────────────────────────────
  {
    id: 's1', rank: 1, ticker: 'NVDA', type: 'stocks', action: 'BUY',
    model: 'claude', confidence: 0.94, entry: 205.10, stop: 192.00, target: 238.00,
    riskReward: 2.51, timeframe: '2–3 weeks',
    thesis: 'AI infrastructure buildout accelerating. Jensen guidance ahead of consensus. Strong support at $192 confluence zone.',
  },
  {
    id: 's2', rank: 2, ticker: 'AAPL', type: 'stocks', action: 'BUY',
    model: 'openai', confidence: 0.87, entry: 178.50, stop: 172.00, target: 196.00,
    riskReward: 2.54, timeframe: '3–4 weeks',
    thesis: 'Services revenue mix shift accelerating. iPhone upgrade cycle catalyst in Q3. $172 is a multi-month support shelf.',
  },
  {
    id: 's3', rank: 3, ticker: 'AMD', type: 'stocks', action: 'BUY',
    model: 'claude', confidence: 0.85, entry: 164.00, stop: 155.00, target: 192.00,
    riskReward: 3.11, timeframe: '2–4 weeks',
    thesis: 'MI300X datacenter traction gaining on NVDA. Cup-and-handle forming on daily. Breakout above $167 triggers next leg.',
  },
  {
    id: 's4', rank: 4, ticker: 'META', type: 'stocks', action: 'BUY',
    model: 'openai', confidence: 0.82, entry: 512.00, stop: 495.00, target: 560.00,
    riskReward: 2.82, timeframe: '3–5 weeks',
    thesis: 'Ad revenue re-acceleration + AI Llama adoption. Threads monetization upside not priced in. RSI reset from overbought.',
  },
  {
    id: 's5', rank: 5, ticker: 'MSFT', type: 'stocks', action: 'SELL',
    model: 'claude', confidence: 0.78, entry: 415.00, stop: 428.00, target: 388.00,
    riskReward: 2.08, timeframe: '2–3 weeks',
    thesis: 'Azure growth decelerating vs estimates. Stock at 32x forward P/E near historical resistance. Distribution pattern forming on weekly.',
  },

  // ── OPTIONS (5) ─────────────────────────────────────────────────────────────
  {
    id: 'o1', rank: 1, ticker: 'NVDA', type: 'options', action: 'BUY',
    model: 'claude', confidence: 0.92, entry: 4.50, stop: 2.25, target: 9.00,
    riskReward: 2.0, strategy: 'Bull Call Spread', timeframe: '3 weeks',
    thesis: 'IV elevated but justified pre-earnings. Defined risk spread captures upside with reduced premium outlay.',
    legs: [
      { type: 'BUY CALL', strike: 210, expiry: '2026-05-16', premium: 8.20 },
      { type: 'SELL CALL', strike: 240, expiry: '2026-05-16', premium: 3.70 },
    ],
  },
  {
    id: 'o2', rank: 2, ticker: 'SPY', type: 'options', action: 'BUY',
    model: 'openai', confidence: 0.88, entry: 3.10, stop: 1.55, target: 7.80,
    riskReward: 3.03, strategy: 'Long Put', timeframe: '2 weeks',
    thesis: 'Macro risk premium at lows. Fed pivot narrative weakening. Tactical put for portfolio protection before FOMC.',
    legs: [
      { type: 'BUY PUT', strike: 510, expiry: '2026-05-09', premium: 3.10 },
    ],
  },
  {
    id: 'o3', rank: 3, ticker: 'TSLA', type: 'options', action: 'BUY',
    model: 'claude', confidence: 0.84, entry: 5.80, stop: 2.90, target: 13.50,
    riskReward: 2.66, strategy: 'Straddle', timeframe: '1 week',
    thesis: 'Earnings week — IV crush risk but move expected to exceed options pricing. Catalyst binary; direction unclear.',
    legs: [
      { type: 'BUY CALL', strike: 260, expiry: '2026-05-02', premium: 5.80 },
      { type: 'BUY PUT',  strike: 260, expiry: '2026-05-02', premium: 5.80 },
    ],
  },
  {
    id: 'o4', rank: 4, ticker: 'META', type: 'options', action: 'BUY',
    model: 'openai', confidence: 0.83, entry: 6.20, stop: 3.10, target: 12.00,
    riskReward: 1.87, strategy: 'Long Call', timeframe: '4 weeks',
    thesis: 'Long call strategy for Q2 momentum continuation. Ad revenue strong, AI investments paying off in margins.',
    legs: [
      { type: 'BUY CALL', strike: 540, expiry: '2026-06-20', premium: 6.20 },
    ],
  },
  {
    id: 'o5', rank: 5, ticker: 'AMZN', type: 'options', action: 'BUY',
    model: 'claude', confidence: 0.81, entry: 3.40, stop: 1.70, target: 8.20,
    riskReward: 2.88, strategy: 'Bull Call Spread', timeframe: '3 weeks',
    thesis: 'AWS re-acceleration narrative + Prime pricing power. Spread captures move while capping premium risk pre-earnings.',
    legs: [
      { type: 'BUY CALL', strike: 190, expiry: '2026-05-16', premium: 5.60 },
      { type: 'SELL CALL', strike: 210, expiry: '2026-05-16', premium: 2.20 },
    ],
  },

  // ── MULTI LEG (5) ───────────────────────────────────────────────────────────
  {
    id: 'm1', rank: 1, ticker: 'NVDA', type: 'multileg', action: 'BUY',
    model: 'claude', confidence: 0.91, entry: 5.20, stop: 2.60, target: 14.00,
    riskReward: 3.38, strategy: 'Iron Condor', timeframe: '2 weeks',
    thesis: 'Post-earnings IV crush play. Wide wings capture premium decay in range-bound consolidation after the binary event.',
    legs: [
      { type: 'SELL PUT',  strike: 175, expiry: '2026-05-09', premium: 3.10 },
      { type: 'BUY PUT',   strike: 160, expiry: '2026-05-09', premium: 1.40 },
      { type: 'SELL CALL', strike: 240, expiry: '2026-05-09', premium: 3.80 },
      { type: 'BUY CALL',  strike: 255, expiry: '2026-05-09', premium: 1.30 },
    ],
  },
  {
    id: 'm2', rank: 2, ticker: 'AAPL', type: 'multileg', action: 'BUY',
    model: 'openai', confidence: 0.87, entry: 4.80, stop: 2.40, target: 11.00,
    riskReward: 2.58, strategy: 'Calendar Spread', timeframe: '4 weeks',
    thesis: 'Sell near-term IV, own longer dated exposure. Theta-positive structure while maintaining directional bias into product cycle.',
    legs: [
      { type: 'SELL CALL', strike: 185, expiry: '2026-05-09', premium: 2.60 },
      { type: 'BUY CALL',  strike: 185, expiry: '2026-06-20', premium: 7.40 },
    ],
  },
  {
    id: 'm3', rank: 3, ticker: 'SPY', type: 'multileg', action: 'BUY',
    model: 'claude', confidence: 0.86, entry: 6.10, stop: 3.05, target: 15.00,
    riskReward: 2.93, strategy: 'Butterfly Spread', timeframe: '2 weeks',
    thesis: 'Pinning behavior expected at $520 into opex. Butterfly centered on max pain captures concentrated gamma exposure.',
    legs: [
      { type: 'BUY CALL',  strike: 510, expiry: '2026-05-16', premium: 9.80 },
      { type: 'SELL CALL', strike: 520, expiry: '2026-05-16', premium: 5.60 },
      { type: 'SELL CALL', strike: 520, expiry: '2026-05-16', premium: 5.60 },
      { type: 'BUY CALL',  strike: 530, expiry: '2026-05-16', premium: 2.40 },
    ],
  },
  {
    id: 'm4', rank: 4, ticker: 'TSLA', type: 'multileg', action: 'BUY',
    model: 'openai', confidence: 0.82, entry: 7.30, stop: 3.65, target: 18.00,
    riskReward: 2.97, strategy: 'Risk Reversal', timeframe: '3 weeks',
    thesis: 'Bullish bias with low premium outlay. Sell OTM put to fund OTM call. Net debit minimal; upside participation retained.',
    legs: [
      { type: 'SELL PUT',  strike: 230, expiry: '2026-05-16', premium: 4.90 },
      { type: 'BUY CALL',  strike: 290, expiry: '2026-05-16', premium: 4.20 },
    ],
  },
  {
    id: 'm5', rank: 5, ticker: 'QQQ', type: 'multileg', action: 'BUY',
    model: 'claude', confidence: 0.80, entry: 3.90, stop: 1.95, target: 9.50,
    riskReward: 2.87, strategy: 'Diagonal Spread', timeframe: '5 weeks',
    thesis: 'Sell near ATM weekly calls against longer dated LEAPS. Generates income while preserving core tech exposure through volatility.',
    legs: [
      { type: 'BUY CALL',  strike: 450, expiry: '2026-09-19', premium: 18.40 },
      { type: 'SELL CALL', strike: 465, expiry: '2026-05-09', premium: 4.10 },
    ],
  },

  // ── HEDGES (5) ──────────────────────────────────────────────────────────────
  {
    id: 'h1', rank: 1, ticker: 'SPY', type: 'hedges', action: 'BUY',
    model: 'claude', confidence: 0.90, entry: 2.80, stop: 1.40, target: 7.00,
    riskReward: 3.0, strategy: 'Bear Put Spread', timeframe: '2 weeks',
    thesis: 'Portfolio hedge against broad market correction. VIX at 6-month lows signals complacency. Defined risk debit spread.',
    legs: [
      { type: 'BUY PUT',  strike: 510, expiry: '2026-05-16', premium: 5.50 },
      { type: 'SELL PUT', strike: 490, expiry: '2026-05-16', premium: 2.70 },
    ],
  },
  {
    id: 'h2', rank: 2, ticker: 'QQQ', type: 'hedges', action: 'BUY',
    model: 'openai', confidence: 0.85, entry: 1.85, stop: 0.90, target: 5.50,
    riskReward: 3.84, strategy: 'Collar', timeframe: '4 weeks',
    thesis: 'Protective collar on concentrated tech exposure. Sell OTM call to fund downside put. Low cost with limited upside sacrifice.',
    legs: [
      { type: 'BUY PUT',   strike: 440, expiry: '2026-05-16', premium: 3.20 },
      { type: 'SELL CALL', strike: 480, expiry: '2026-05-16', premium: 1.35 },
    ],
  },
  {
    id: 'h3', rank: 3, ticker: 'GLD', type: 'hedges', action: 'BUY',
    model: 'claude', confidence: 0.83, entry: 192.00, stop: 185.00, target: 215.00,
    riskReward: 3.29, strategy: 'Long Position', timeframe: '4–6 weeks',
    thesis: 'Dollar weakness + geopolitical risk premium re-pricing. Gold breaking multi-year resistance. Classic flight-to-safety allocation.',
  },
  {
    id: 'h4', rank: 4, ticker: 'TLT', type: 'hedges', action: 'BUY',
    model: 'openai', confidence: 0.79, entry: 88.50, stop: 84.00, target: 98.00,
    riskReward: 2.11, strategy: 'Long Position', timeframe: '6–8 weeks',
    thesis: 'Duration exposure as recession hedge. If growth slows faster than Fed pivot timeline, long bonds outperform significantly.',
  },
  {
    id: 'h5', rank: 5, ticker: 'VIX', type: 'hedges', action: 'BUY',
    model: 'claude', confidence: 0.77, entry: 3.60, stop: 1.80, target: 9.20,
    riskReward: 3.11, strategy: 'Long Call', timeframe: '3 weeks',
    thesis: 'Volatility at historical lows. Long VIX calls provide convex payoff if tail risk materializes. Cheap insurance at current IV levels.',
    legs: [
      { type: 'BUY CALL', strike: 18, expiry: '2026-05-21', premium: 3.60 },
    ],
  },
]

const TABS = [
  { id: 'stocks',   label: 'Stocks',    icon: TrendingUp, colorClass: 'text-green-400',     activeBg: 'bg-green-500/10',    activeBorder: 'border-green-500/30',    cardBorder: 'border-green-500/20' },
  { id: 'options',  label: 'Options',   icon: BarChart3,  colorClass: 'text-theme-gold',    activeBg: 'bg-theme-gold/10',   activeBorder: 'border-theme-gold/30',   cardBorder: 'border-theme-gold/20' },
  { id: 'multileg', label: 'Multi Leg', icon: Layers,     colorClass: 'text-blue-400',      activeBg: 'bg-blue-500/10',     activeBorder: 'border-blue-500/30',     cardBorder: 'border-blue-500/20' },
  { id: 'hedges',   label: 'Hedges',    icon: Shield,     colorClass: 'text-red-400',       activeBg: 'bg-red-500/10',      activeBorder: 'border-red-500/30',      cardBorder: 'border-red-500/20' },
] as const

export default function TradeDeskPage() {
  const [activeTab, setActiveTab] = useState<TradeType>('stocks')
  const [modelFilter, setModelFilter] = useState<'all' | AIModel>('all')
  const [ticker, setTicker] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const activeTabMeta = TABS.find(t => t.id === activeTab)!

  const filtered = MOCK_IDEAS.filter((idea) => {
    if (idea.type !== activeTab) return false
    if (modelFilter !== 'all' && idea.model !== modelFilter) return false
    if (ticker && !idea.ticker.toLowerCase().includes(ticker.toLowerCase())) return false
    return true
  }).sort((a, b) => a.rank - b.rank)

  const generateIdeas = async () => {
    setIsGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsGenerating(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />

      {/* Sub-header */}
      <header className="border-b border-border bg-card/30 sticky top-[49px] z-40">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold font-mono">TRADEDESK</h1>
            <Badge variant="outline" className="bg-theme-gold/10 text-theme-gold border-theme-gold/30 text-[10px]">
              Trading Floor
            </Badge>
          </div>

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
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/30 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all border ${
                    isActive
                      ? `${tab.activeBg} ${tab.colorClass} ${tab.activeBorder}`
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
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
            <Button onClick={generateIdeas} disabled={isGenerating} className="gap-2 bg-primary hover:bg-primary/90">
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Generate Ideas
            </Button>
          </div>
        </div>
      </div>

      {/* Trade Ideas */}
      <main className="p-6">

        {/* Section label */}
        <div className="flex items-center gap-3 mb-5">
          <activeTabMeta.icon className={`w-5 h-5 ${activeTabMeta.colorClass}`} />
          <h2 className={`text-sm font-mono font-bold uppercase tracking-widest ${activeTabMeta.colorClass}`}>
            Top 5 {activeTabMeta.label} Ideas
          </h2>
          <div className={`flex-1 h-px ${activeTabMeta.colorClass} opacity-20`} />
          <span className="text-[10px] font-mono text-muted-foreground">{filtered.length} ideas</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((idea) => {
            const isBuy = idea.action === 'BUY'
            const tabMeta = TABS.find(t => t.id === idea.type)!

            return (
              <div
                key={idea.id}
                className={`rounded-lg border bg-card p-5 transition-all hover:shadow-lg hover:shadow-black/20 flex flex-col ${tabMeta.cardBorder}`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {/* Rank badge */}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold border ${tabMeta.activeBorder} ${tabMeta.activeBg} ${tabMeta.colorClass}`}>
                      {idea.rank}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                        <Badge
                          variant="outline"
                          className={isBuy
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'}
                        >
                          {isBuy ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {idea.action}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {idea.strategy && (
                          <Badge variant="outline" className={`text-[10px] ${tabMeta.activeBorder} ${tabMeta.colorClass}`}>
                            {idea.strategy}
                          </Badge>
                        )}
                        {idea.timeframe && (
                          <span className="text-[10px] font-mono text-muted-foreground">{idea.timeframe}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Model badge */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded flex-shrink-0 ${
                    idea.model === 'claude'
                      ? 'bg-theme-gold/10 border border-theme-gold/30'
                      : 'bg-primary/10 border border-primary/30'
                  }`}>
                    {idea.model === 'claude'
                      ? <Brain className="w-3.5 h-3.5 text-theme-gold" />
                      : <Sparkles className="w-3.5 h-3.5 text-primary" />}
                    <span className={`text-xs font-mono ${idea.model === 'claude' ? 'text-theme-gold' : 'text-primary'}`}>
                      {idea.model === 'claude' ? 'Claude' : 'OpenAI'}
                    </span>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">Confidence</span>
                    <span className={`text-sm font-mono font-bold ${
                      idea.confidence >= 0.88 ? 'text-green-400' :
                      idea.confidence >= 0.78 ? 'text-theme-gold' : 'text-orange-400'
                    }`}>
                      {(idea.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idea.confidence >= 0.88 ? 'bg-green-500' :
                        idea.confidence >= 0.78 ? 'bg-theme-gold' : 'bg-orange-500'
                      }`}
                      style={{ width: `${idea.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {/* Option/Multi-leg legs */}
                {idea.legs && idea.legs.length > 0 && (
                  <div className="mb-4 p-3 bg-muted/30 rounded border border-border/50">
                    <div className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-wide">Legs</div>
                    <div className="space-y-1.5">
                      {idea.legs.map((leg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={leg.type.includes('BUY') ? 'text-green-400' : 'text-red-400'}>{leg.type}</span>
                            <span className="text-foreground">${leg.strike}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>{leg.expiry}</span>
                            <span className="text-theme-gold">${leg.premium.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price levels */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 bg-muted/30 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-0.5">ENTRY</div>
                    <div className="text-sm font-mono font-bold">${idea.entry.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-0.5">STOP</div>
                    <div className="text-sm font-mono font-bold text-red-400">${idea.stop.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-0.5">TARGET</div>
                    <div className="text-sm font-mono font-bold text-green-400">${idea.target.toFixed(2)}</div>
                  </div>
                </div>

                {/* R/R ratio */}
                <div className="flex items-center justify-between p-2 bg-primary/5 rounded border border-primary/10 mb-4">
                  <span className="text-xs font-mono text-muted-foreground">Risk / Reward</span>
                  <span className={`text-sm font-mono font-bold ${idea.riskReward >= 2.5 ? 'text-green-400' : 'text-theme-gold'}`}>
                    1 : {idea.riskReward.toFixed(2)}
                  </span>
                </div>

                {/* Thesis */}
                <div className="flex-1 mb-4">
                  <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wide">Thesis</div>
                  <p className="text-xs text-foreground leading-relaxed">{idea.thesis}</p>
                </div>

                {/* Stage Trade */}
                <Button className={`w-full gap-2 bg-card border hover:opacity-90 ${tabMeta.activeBorder} ${tabMeta.colorClass}`}>
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
            <h3 className="text-base font-medium text-muted-foreground">No ideas match filters</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or generate new ideas.</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center">
            <strong className="text-foreground/60">Disclaimer:</strong> Trade ideas are AI-generated (Claude & OpenAI) for paper trading and educational purposes only. Not financial advice. Always conduct your own research.
          </p>
        </div>
      </main>
    </div>
  )
}
