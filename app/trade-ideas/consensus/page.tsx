'use client'

import { useState } from 'react'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Brain, Cpu, DollarSign, Activity, Filter, RefreshCw, Star, Bookmark, Bot, Hand, Target, Loader, CheckCircle, Search, X } from 'lucide-react'
import { TickerAutocomplete } from '@/components/ui/ticker-autocomplete'
import { useTradeIdeas } from '@/hooks/useTradeIdeas'

type SentimentCategory = 'bullish' | 'bearish' | 'hedge' | 'neutral'

interface AnalystConsensus {
  rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  score: number
  priceTarget: { high: number; low: number; mean: number }
}

interface ConsensusIdea {
  id: string
  ticker: string
  company: string
  action: 'buy' | 'sell' | 'hold'
  aiScores: { claude: number; openai: number; consensus: number }
  consensusPrice: number
  claudePrice: number
  openaiPrice: number
  currentPrice: number
  sentimentCategory: SentimentCategory
  headline: string
  summary: string
  claudeThesis: string
  openaiThesis: string
  keyAgreements: string[]
  keyDisagreements: string[]
  alignment: 'strong' | 'moderate' | 'weak'
  analystConsensus: AnalystConsensus | null
  lastUpdated: string
}

const CONSENSUS_IDEAS: ConsensusIdea[] = [
  {
    id: 'consensus-1',
    ticker: 'NVDA',
    company: 'NVIDIA Corporation',
    action: 'buy',
    aiScores: { claude: 92, openai: 85, consensus: 89 },
    consensusPrice: 265,
    claudePrice: 270,
    openaiPrice: 260,
    currentPrice: 215.50,
    sentimentCategory: 'bullish',
    headline: 'AI Infrastructure Dominance - Strong Multi-Source Agreement',
    summary: 'Claude and OpenAI models show strong agreement on NVDA as an AI infrastructure leader with high conviction. Both models identify similar catalysts around AI adoption acceleration. Analyst consensus strongly supports with robust buy ratings.',
    claudeThesis: 'AI Infrastructure Dominance Creates Multi-Year Runway',
    openaiThesis: 'GPU Supply Dominance with Margin Profile Questions',
    keyAgreements: [
      'AI adoption inflection point driving secular growth',
      'Strong competitive moat in high-performance computing',
      'Significant revenue upside from data center consolidation'
    ],
    keyDisagreements: [
      'OpenAI more concerned about competitive threats',
      'Claude sees stronger margin expansion potential long-term'
    ],
    alignment: 'strong',
    analystConsensus: {
      rating: 'strong_buy',
      score: 88,
      priceTarget: { high: 320, low: 180, mean: 265 }
    },
    lastUpdated: '2 hours ago'
  },
  {
    id: 'consensus-2',
    ticker: 'META',
    company: 'Meta Platforms',
    action: 'buy',
    aiScores: { claude: 88, openai: 92, consensus: 90 },
    consensusPrice: 620,
    claudePrice: 615,
    openaiPrice: 625,
    currentPrice: 512.30,
    sentimentCategory: 'bullish',
    headline: 'AI Monetization Catalyst - OpenAI More Confident',
    summary: 'Both models bullish on META, but OpenAI places higher confidence on AI monetization. Claude emphasizes financial discipline. Strong analyst support validates narrative with consistent upgrades.',
    claudeThesis: 'AI Infrastructure Dominance Creates Multi-Year Runway',
    openaiThesis: 'AI Monetization Inflection Driving Rerating',
    keyAgreements: [
      'Reels gaining traction vs TikTok',
      'AI-powered ad targeting recovering ATT losses',
      'Strong FCF enabling substantial buybacks'
    ],
    keyDisagreements: [
      'OpenAI more bullish on near-term monetization',
      'Claude more cautious on Reality Labs'
    ],
    alignment: 'strong',
    analystConsensus: {
      rating: 'buy',
      score: 87,
      priceTarget: { high: 650, low: 520, mean: 598 }
    },
    lastUpdated: '3 hours ago'
  },
  {
    id: 'consensus-3',
    ticker: 'TSLA',
    company: 'Tesla',
    action: 'sell',
    aiScores: { claude: 35, openai: 45, consensus: 40 },
    consensusPrice: 155,
    claudePrice: 140,
    openaiPrice: 170,
    currentPrice: 185.50,
    sentimentCategory: 'bearish',
    headline: 'Diverging Views - Caution Warranted',
    summary: 'Weak consensus between Claude (bearish) and OpenAI (neutral). Claude emphasizes margin compression while OpenAI sees autonomous upside. Analyst mix suggests market uncertainty.',
    claudeThesis: 'Margin Compression and Competition Intensifying',
    openaiThesis: 'Autonomous Partnership Optionality Undervalued',
    keyAgreements: [
      'EV market competition has intensified',
      'Price reductions impacting margins',
      'Autonomous timeline remains uncertain'
    ],
    keyDisagreements: [
      'OpenAI sees value in Waymo partnership',
      'Claude concerned about margin cliff'
    ],
    alignment: 'weak',
    analystConsensus: {
      rating: 'hold',
      score: 45,
      priceTarget: { high: 280, low: 85, mean: 165 }
    },
    lastUpdated: '4 hours ago'
  }
]

const sentimentColors: Record<SentimentCategory, string> = {
  bullish: 'text-green-400 bg-green-500/10 border-green-500/30',
  bearish: 'text-red-400 bg-red-500/10 border-red-500/30',
  hedge: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  neutral: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
}

const alignmentColors: Record<string, string> = {
  strong: 'text-green-400 bg-green-500/10',
  moderate: 'text-amber-400 bg-amber-500/10',
  weak: 'text-red-400 bg-red-500/10'
}

export default function ConsensusPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterSentiment, setFilterSentiment] = useState<SentimentCategory | 'all'>('all')
  const [tickerSearch, setTickerSearch] = useState('')
  const [tradingMode, setTradingMode] = useState<'autonomous' | 'manual'>('manual')
  const [executingTrade, setExecutingTrade] = useState<string | null>(null)
  const [tradeResult, setTradeResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  
  const { executeTrade } = useBrokerTrade('alpaca')
  const { isGenerating, generateIdea } = useTradeIdeas({ provider: 'claude' })
  const tickers = CONSENSUS_IDEAS.map(i => i.ticker)
  const { quotes: liveQuotes } = useLiveQuotes(tickers, { refreshInterval: 30000 })

  const filteredIdeas = CONSENSUS_IDEAS.filter(idea => {
    if (tickerSearch) {
      const q = tickerSearch.toUpperCase()
      if (!idea.ticker.includes(q) && !idea.company.toUpperCase().includes(q)) return false
    }
    if (filterSentiment !== 'all' && idea.sentimentCategory !== filterSentiment) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />
      <main className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-8 h-8 text-primary" />
              Analyst & AI Trade Ideas
            </h1>
            <p className="text-muted-foreground">
              Consensus views combining Claude, OpenAI, and professional analyst perspectives
            </p>
          </div>

          {/* Filter and Trading Mode */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Ticker Search */}
            <div className="flex items-center gap-2">
              <TickerAutocomplete
                value={tickerSearch}
                onChange={setTickerSearch}
                onSelect={(ticker) => setTickerSearch(ticker.symbol)}
                placeholder="Search any US ticker..."
                className="w-52"
              />
              <button
                onClick={() => { if (tickerSearch) generateIdea(tickerSearch) }}
                disabled={isGenerating || !tickerSearch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                {isGenerating ? 'Analyzing...' : 'Search'}
              </button>
            </div>
            <select
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value as SentimentCategory | 'all')}
              className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs font-mono"
            >
              <option value="all">All Sentiments</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="hedge">Hedge</option>
              <option value="neutral">Neutral</option>
            </select>
            
            {/* Trading Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Trading Mode:
              </span>
              <div className="flex items-center bg-muted/30 rounded-lg border border-border/50 p-0.5">
                <button
                  onClick={() => setTradingMode('autonomous')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                    tradingMode === 'autonomous'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  Autonomous
                </button>
                <button
                  onClick={() => setTradingMode('manual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                    tradingMode === 'manual'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5" />
                  Manual
                </button>
              </div>
            </div>
          </div>

          {/* Ideas Grid */}
          <div className="space-y-4">
            {filteredIdeas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-10 h-10 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No ideas match your filters</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {tickerSearch
                    ? `No results for "${tickerSearch}" — try a different ticker or clear the search`
                    : 'Try adjusting or clearing your filters'}
                </p>
                <button
                  onClick={() => { setTickerSearch(''); setFilterSentiment('all') }}
                  className="mt-4 px-4 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/50 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
            {filteredIdeas.map(idea => {
              const isExpanded = expandedId === idea.id
              const upside = ((idea.consensusPrice - idea.currentPrice) / idea.currentPrice * 100).toFixed(1)
              const livePrice = liveQuotes[idea.ticker]?.price || idea.currentPrice

              return (
                <div
                  key={idea.id}
                  className={`rounded-xl border bg-card/50 overflow-hidden transition-all ${
                    idea.action === 'buy' ? 'border-green-500/30' : 'border-red-500/30'
                  }`}
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : idea.id)}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-bold text-lg text-foreground">{idea.ticker}</div>
                            <div className="text-xs text-muted-foreground">{idea.company}</div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${sentimentColors[idea.sentimentCategory]}`}>
                            {idea.sentimentCategory.toUpperCase()}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${alignmentColors[idea.alignment]}`}>
                            {idea.alignment.toUpperCase()} AGREEMENT
                          </div>
                        </div>
                        <div className="text-sm text-foreground font-semibold">{idea.headline}</div>
                      </div>
                      <div className="text-right space-y-1 min-w-max">
                        <div className="text-xl font-bold text-foreground">${livePrice?.toFixed(2) || idea.currentPrice.toFixed(2)}</div>
                        <div className={`text-sm font-semibold ${parseFloat(upside) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(upside) > 0 ? '+' : ''}{upside}% to consensus
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 ml-auto" /> : <ChevronDown className="w-5 h-5 ml-auto" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                      {/* AI Scores */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 rounded-lg bg-background border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <Brain className="w-4 h-4 text-primary" />
                            <span className="text-xs font-mono text-muted-foreground">CLAUDE</span>
                          </div>
                          <div className="text-2xl font-bold text-foreground">{idea.aiScores.claude}</div>
                          <div className="text-xs text-muted-foreground">Price Target: ${idea.claudePrice}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-background border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <Cpu className="w-4 h-4 text-primary" />
                            <span className="text-xs font-mono text-muted-foreground">OPENAI</span>
                          </div>
                          <div className="text-2xl font-bold text-foreground">{idea.aiScores.openai}</div>
                          <div className="text-xs text-muted-foreground">Price Target: ${idea.openaiPrice}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-background border border-primary/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-primary" />
                            <span className="text-xs font-mono text-muted-foreground">CONSENSUS</span>
                          </div>
                          <div className="text-2xl font-bold text-primary">{idea.aiScores.consensus}</div>
                          <div className="text-xs text-muted-foreground">Target: ${idea.consensusPrice}</div>
                        </div>
                      </div>

                      {/* Analyst Data */}
                      {idea.analystConsensus && (
                        <div className="p-3 rounded-lg bg-background border border-border">
                          <div className="text-xs font-mono text-muted-foreground mb-2">ANALYST CONSENSUS</div>
                          <div className="text-sm font-semibold text-foreground mb-1">{idea.analystConsensus.rating.toUpperCase()} ({idea.analystConsensus.score}/100)</div>
                          <div className="text-xs text-muted-foreground">
                            Target Range: ${idea.analystConsensus.priceTarget.low} - ${idea.analystConsensus.priceTarget.high} (Mean: ${idea.analystConsensus.priceTarget.mean})
                          </div>
                        </div>
                      )}

                      {/* Theses */}
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs font-mono text-muted-foreground mb-1">CLAUDE THESIS</div>
                          <p className="text-sm text-foreground">{idea.claudeThesis}</p>
                        </div>
                        <div>
                          <div className="text-xs font-mono text-muted-foreground mb-1">OPENAI THESIS</div>
                          <p className="text-sm text-foreground">{idea.openaiThesis}</p>
                        </div>
                      </div>

                      {/* Agreements */}
                      <div>
                        <div className="text-xs font-mono text-muted-foreground mb-2">KEY AGREEMENTS</div>
                        <ul className="space-y-1">
                          {idea.keyAgreements.map((point, idx) => (
                            <li key={idx} className="text-sm text-green-400 flex items-start gap-2">
                              <span>✓</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Disagreements */}
                      <div>
                        <div className="text-xs font-mono text-muted-foreground mb-2">KEY DISAGREEMENTS</div>
                        <ul className="space-y-1">
                          {idea.keyDisagreements.map((point, idx) => (
                            <li key={idx} className="text-sm text-amber-400 flex items-start gap-2">
                              <span>•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Summary */}
                      <div>
                        <div className="text-xs font-mono text-muted-foreground mb-2">SUMMARY</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{idea.summary}</p>
                      </div>
                      
                      {/* Execute Trade Button */}
                      <div className="pt-4 border-t border-border flex justify-end">
                        <button 
                          onClick={async () => {
                            setExecutingTrade(idea.id)
                            const result = await executeTrade({
                              ticker: idea.ticker,
                              side: idea.action === 'buy' ? 'buy' : 'sell',
                              quantity: 10,
                              orderType: 'market',
                            })
                            setTradeResult({ id: idea.id, success: result.success, message: result.message })
                            setExecutingTrade(null)
                            setTimeout(() => setTradeResult(null), 3000)
                          }}
                          disabled={executingTrade === idea.id}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                            idea.action === 'buy' 
                              ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                              : 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                          } ${executingTrade === idea.id ? 'opacity-50' : ''}`}
                        >
                          {executingTrade === idea.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : tradeResult?.id === idea.id && tradeResult.success ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Target className="w-4 h-4" />
                          )}
                          {executingTrade === idea.id 
                            ? 'Executing...' 
                            : tradeResult?.id === idea.id 
                              ? (tradeResult.success ? 'Executed!' : 'Failed')
                              : tradingMode === 'autonomous' ? 'Execute Trade' : 'Stage Trade'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {filteredIdeas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No ideas match your filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
