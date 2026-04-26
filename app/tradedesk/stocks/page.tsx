'use client'

import { useState } from 'react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { TrendingUp, TrendingDown, Brain, Sparkles, Clock, Target, AlertTriangle, CheckCircle, Search, Filter } from 'lucide-react'

type Model = 'claude' | 'openai'

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
}

const CLAUDE_IDEAS: StockIdea[] = [
  { id: 1, ticker: 'NVDA', name: 'NVIDIA Corp', action: 'buy', confidence: 94, entry: 875.50, stop: 840.00, target: 950.00, thesis: 'AI compute demand surge. Data center revenue +400% YoY. Blackwell architecture launch imminent.', timeframe: '2-4 weeks', riskReward: '2.1:1', model: 'claude' },
  { id: 2, ticker: 'AAPL', name: 'Apple Inc', action: 'buy', confidence: 87, entry: 178.25, stop: 170.00, target: 195.00, thesis: 'iPhone 16 cycle catalyst. Services revenue at ATH. Buyback support at current levels.', timeframe: '4-6 weeks', riskReward: '2.0:1', model: 'claude' },
  { id: 3, ticker: 'TSLA', name: 'Tesla Inc', action: 'sell', confidence: 82, entry: 245.00, stop: 265.00, target: 200.00, thesis: 'EV margin compression. China competition intensifying. Robotaxi timeline uncertain.', timeframe: '3-5 weeks', riskReward: '2.25:1', model: 'claude' },
  { id: 4, ticker: 'AMD', name: 'AMD Inc', action: 'buy', confidence: 79, entry: 155.00, stop: 145.00, target: 180.00, thesis: 'MI300X gaining hyperscaler traction. Market share gains vs Intel continuing.', timeframe: '4-8 weeks', riskReward: '2.5:1', model: 'claude' },
  { id: 5, ticker: 'META', name: 'Meta Platforms', action: 'buy', confidence: 75, entry: 485.00, stop: 460.00, target: 540.00, thesis: 'Reels monetization improving. AI ad targeting efficiency gains. Reality Labs losses narrowing.', timeframe: '3-6 weeks', riskReward: '2.2:1', model: 'claude' },
]

const OPENAI_IDEAS: StockIdea[] = [
  { id: 1, ticker: 'MSFT', name: 'Microsoft Corp', action: 'buy', confidence: 91, entry: 415.00, stop: 395.00, target: 460.00, thesis: 'Azure AI integration driving enterprise adoption. Copilot monetization ramping. Cloud margins expanding.', timeframe: '3-5 weeks', riskReward: '2.25:1', model: 'openai' },
  { id: 2, ticker: 'GOOGL', name: 'Alphabet Inc', action: 'buy', confidence: 85, entry: 155.00, stop: 145.00, target: 175.00, thesis: 'Search AI moat intact. YouTube Shorts monetization. Cloud growth reaccelerating.', timeframe: '4-6 weeks', riskReward: '2.0:1', model: 'openai' },
  { id: 3, ticker: 'NFLX', name: 'Netflix Inc', action: 'sell', confidence: 78, entry: 625.00, stop: 660.00, target: 560.00, thesis: 'Password sharing crackdown tailwind fading. Content cost inflation. Competitive pressure rising.', timeframe: '4-8 weeks', riskReward: '1.86:1', model: 'openai' },
  { id: 4, ticker: 'AMZN', name: 'Amazon.com', action: 'buy', confidence: 88, entry: 178.50, stop: 168.00, target: 200.00, thesis: 'AWS growth reaccelerating. Retail margins improving. Advertising segment outperforming.', timeframe: '3-6 weeks', riskReward: '2.05:1', model: 'openai' },
  { id: 5, ticker: 'CRM', name: 'Salesforce Inc', action: 'buy', confidence: 72, entry: 265.00, stop: 250.00, target: 300.00, thesis: 'AI features driving upsells. Margin expansion story intact. Enterprise spending recovering.', timeframe: '4-8 weeks', riskReward: '2.33:1', model: 'openai' },
]

export default function StocksPage() {
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
                <TrendingUp className="w-6 h-6 text-green-400" />
                Stock Trade Ideas
              </h1>
              <p className="text-sm text-muted-foreground mt-1">AI-powered directional equity plays</p>
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
                className="w-full pl-10 pr-4 py-2 bg-card/50 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Filter className="w-3 h-3" />
              <span>{filteredIdeas.length} ideas</span>
              <span className="text-green-400">|</span>
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
                    ? 'bg-green-500/10 border-green-500/40'
                    : 'bg-card/50 border-border hover:border-green-500/30'
                }`}
              >
                {/* Rank Badge */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-green-500 text-black text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>

                <div className="flex items-start justify-between">
                  {/* Left: Ticker & Thesis */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl font-bold font-mono">{idea.ticker}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        idea.action === 'buy' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {idea.action}
                      </span>
                      <span className="text-xs text-muted-foreground">{idea.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 max-w-2xl">{idea.thesis}</p>
                    
                    {/* Price Levels */}
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <div>
                        <span className="text-muted-foreground">Entry:</span>
                        <span className="ml-1 text-foreground">${idea.entry.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stop:</span>
                        <span className="ml-1 text-red-400">${idea.stop.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target:</span>
                        <span className="ml-1 text-green-400">${idea.target.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">R:R</span>
                        <span className="ml-1 text-cyan-400">{idea.riskReward}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Confidence & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {/* Confidence */}
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-green-400">{idea.confidence}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                    </div>

                    {/* Timeframe */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {idea.timeframe}
                    </div>

                    {/* Stage Button */}
                    <button
                      onClick={() => stageTrade(idea.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        stagedTrades.includes(idea.id)
                          ? 'bg-green-500 text-black'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40'
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

          {/* Trade History Placeholder */}
          <div className="mt-8 p-6 rounded-xl border border-border bg-card/30">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Execution History
            </h2>
            <div className="text-sm text-muted-foreground text-center py-8">
              No trades executed yet. Stage a trade above to get started.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
