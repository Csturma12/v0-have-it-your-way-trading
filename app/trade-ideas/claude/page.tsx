'use client'

import { useState, useEffect } from 'react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { TickerAutocomplete } from '@/components/ui/ticker-autocomplete'
import { Brain, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Target, Clock, BarChart3, Zap, BookOpen, Globe, DollarSign, Activity, Layers, Filter, RefreshCw, Star, Bookmark, Share2, ExternalLink, Search, X, Bot, Hand, Loader, CheckCircle, Sparkles } from 'lucide-react'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'
import { useTradeIdeas, TradeIdea } from '@/hooks/useTradeIdeas'

type RiskLevel = 'low' | 'medium' | 'high'
type Timeframe = 'short' | 'medium' | 'long'
type IdeaCategory = 'macro' | 'technical' | 'fundamental' | 'catalyst' | 'quant'
type SentimentCategory = 'bullish' | 'bearish' | 'hedge' | 'neutral'

interface AnalystConsensus {
  rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  score: number
  priceTarget: { high: number; low: number; mean: number }
  recentActivity: string
  firms: { name: string; rating: string; action: string; date: string }[]
}

interface ResearchIdea {
  id: string
  ticker: string
  company: string
  action: 'buy' | 'sell' | 'hold'
  conviction: number
  priceTarget: number
  currentPrice: number
  stopLoss: number
  timeframe: Timeframe
  risk: RiskLevel
  category: IdeaCategory
  sentimentCategory: SentimentCategory
  headline: string
  thesis: string
  keyPoints: string[]
  catalysts: { event: string; date: string; impact: 'positive' | 'negative' | 'neutral' }[]
  technicals: { indicator: string; signal: string; strength: number }[]
  fundamentals: { metric: string; value: string; vsIndustry: string }[]
  risks: string[]
  sentiment: { source: string; score: number }[]
  analystConsensus: AnalystConsensus | null
  relatedTickers: string[]
  lastUpdated: string
  saved: boolean
}

const CLAUDE_IDEAS: ResearchIdea[] = [
  {
    id: 'claude-1',
    ticker: 'NVDA',
    company: 'NVIDIA Corporation',
    action: 'buy',
    conviction: 94,
    priceTarget: 285,
    currentPrice: 205.10,
    stopLoss: 175,
    timeframe: 'medium',
    risk: 'medium',
    category: 'fundamental',
    sentimentCategory: 'bullish',
    headline: 'AI Infrastructure Dominance Creates Multi-Year Runway',
    thesis: 'NVIDIA remains the undisputed leader in AI compute infrastructure with 80%+ market share in data center GPUs. The Blackwell architecture represents a generational leap in performance-per-watt, and enterprise adoption is still in early innings. While valuation appears stretched on trailing metrics, forward estimates consistently underestimate the exponential growth in AI training and inference workloads. Recent supply chain improvements and TSMC capacity expansion should alleviate allocation issues by Q3.',
    keyPoints: [
      'Blackwell B200 showing 4x inference performance vs H100 at similar power envelope',
      'Hyperscaler capex guidance indicates 40%+ YoY growth through 2026',
      'Software moat via CUDA ecosystem remains nearly impossible to replicate',
      'New sovereign AI initiatives adding $15B+ TAM from government contracts',
      'Automotive and robotics segments emerging as next growth vectors'
    ],
    catalysts: [
      { event: 'Q2 Earnings Report', date: 'May 28, 2026', impact: 'positive' },
      { event: 'GTC Conference Announcements', date: 'June 15, 2026', impact: 'positive' },
      { event: 'Blackwell Volume Production', date: 'Q3 2026', impact: 'positive' },
      { event: 'China Export Restrictions Review', date: 'July 2026', impact: 'negative' }
    ],
    technicals: [
      { indicator: 'RSI (14)', signal: 'Neutral', strength: 52 },
      { indicator: '50/200 MA', signal: 'Golden Cross', strength: 85 },
      { indicator: 'Volume Profile', signal: 'Accumulation', strength: 78 },
      { indicator: 'MACD', signal: 'Bullish Crossover', strength: 72 }
    ],
    fundamentals: [
      { metric: 'Forward P/E', value: '28.5x', vsIndustry: '-15% vs semis avg' },
      { metric: 'Revenue Growth', value: '+94% YoY', vsIndustry: '+82% above avg' },
      { metric: 'Gross Margin', value: '74.8%', vsIndustry: '+25% above avg' },
      { metric: 'FCF Yield', value: '2.8%', vsIndustry: 'In-line' },
      { metric: 'ROIC', value: '68%', vsIndustry: '+45% above avg' }
    ],
    risks: [
      'China revenue (~20%) at risk from expanded export controls',
      'Customer concentration in top 4 hyperscalers',
      'AMD MI300X gaining traction in inference workloads',
      'Potential antitrust scrutiny of CUDA lock-in'
    ],
    sentiment: [
      { source: 'Analyst Consensus', score: 88 },
      { source: 'Options Flow', score: 75 },
      { source: 'Social Sentiment', score: 82 },
      { source: 'Insider Activity', score: 45 }
    ],
    analystConsensus: {
      rating: 'strong_buy',
      score: 88,
      priceTarget: { high: 320, low: 180, mean: 265 },
      recentActivity: '3 upgrades, 1 initiation in last 90 days',
      firms: [
        { name: 'Goldman Sachs', rating: 'Buy', action: 'upgrade', date: '2026-04-15' },
        { name: 'Morgan Stanley', rating: 'Overweight', action: 'maintain', date: '2026-04-10' },
        { name: 'JP Morgan', rating: 'Buy', action: 'upgrade', date: '2026-04-05' }
      ]
    },
    relatedTickers: ['AMD', 'AVGO', 'MRVL', 'TSM', 'SMCI'],
    lastUpdated: '2 hours ago',
    saved: false
  },
  {
    id: 'claude-2',
    ticker: 'LLY',
    company: 'Eli Lilly and Company',
    action: 'buy',
    conviction: 91,
    priceTarget: 950,
    currentPrice: 785.40,
    stopLoss: 700,
    timeframe: 'long',
    risk: 'low',
    category: 'fundamental',
    sentimentCategory: 'bullish',
    headline: 'GLP-1 Market Leadership with Pipeline Optionality',
    thesis: 'Eli Lilly is positioned to capture the majority of the $100B+ GLP-1 market through superior efficacy (tirzepatide) and manufacturing scale. Mounjaro/Zepbound demand continues to outstrip supply, with capacity expansion on track to triple production by 2027. Beyond obesity, the pipeline in Alzheimers (donanemab), cancer, and immunology provides diversified growth vectors. The companys disciplined capital allocation and premium-to-peers valuation is justified by best-in-class execution.',
    keyPoints: [
      'Tirzepatide showing 22.5% weight loss vs 15% for semaglutide in head-to-head',
      'New Indiana manufacturing facility adding 50% capacity by Q4 2026',
      'Donanemab FDA decision expected Q2 2026 with high approval probability',
      'Oral GLP-1 (orforglipron) Phase 3 readouts in H2 could unlock massive convenience market',
      'Zero generic competition expected until 2032+ on key assets'
    ],
    catalysts: [
      { event: 'Donanemab FDA Decision', date: 'Q2 2026', impact: 'positive' },
      { event: 'Manufacturing Capacity Ramp', date: 'Q4 2026', impact: 'positive' },
      { event: 'Orforglipron Phase 3 Data', date: 'H2 2026', impact: 'positive' },
      { event: 'Potential Medicare Negotiation', date: '2027', impact: 'negative' }
    ],
    technicals: [
      { indicator: 'RSI (14)', signal: 'Overbought', strength: 68 },
      { indicator: '50/200 MA', signal: 'Strong Uptrend', strength: 92 },
      { indicator: 'Volume Profile', signal: 'Distribution', strength: 55 },
      { indicator: 'Bollinger Bands', signal: 'Upper Band', strength: 70 }
    ],
    fundamentals: [
      { metric: 'Forward P/E', value: '42x', vsIndustry: '+85% vs pharma avg' },
      { metric: 'Revenue Growth', value: '+35% YoY', vsIndustry: '+28% above avg' },
      { metric: 'Gross Margin', value: '81%', vsIndustry: '+12% above avg' },
      { metric: 'R&D/Revenue', value: '25%', vsIndustry: '+8% above avg' },
      { metric: 'Pipeline Value', value: '$180B NPV', vsIndustry: 'Best-in-class' }
    ],
    risks: [
      'Premium valuation vulnerable to any pipeline setback',
      'Medicare price negotiation could impact 2027+ pricing',
      'Manufacturing execution risk on aggressive expansion',
      'Competitor GLP-1 entries from NVO, PFE, AMGN'
    ],
    sentiment: [
      { source: 'Analyst Consensus', score: 92 },
      { source: 'Options Flow', score: 68 },
      { source: 'Institutional Ownership', score: 85 },
      { source: 'Insider Activity', score: 72 }
    ],
    analystConsensus: {
      rating: 'strong_buy',
      score: 92,
      priceTarget: { high: 1050, low: 720, mean: 890 },
      recentActivity: '2 upgrades in last 90 days',
      firms: [
        { name: 'Bank of America', rating: 'Buy', action: 'upgrade', date: '2026-04-12' },
        { name: 'Citi', rating: 'Buy', action: 'maintain', date: '2026-04-08' }
      ]
    },
    relatedTickers: ['NVO', 'PFE', 'AMGN', 'VRTX', 'REGN'],
    lastUpdated: '4 hours ago',
    saved: true
  },
  {
    id: 'claude-3',
    ticker: 'SPOT',
    company: 'Spotify Technology',
    action: 'buy',
    conviction: 87,
    priceTarget: 420,
    currentPrice: 315.80,
    stopLoss: 270,
    timeframe: 'medium',
    risk: 'medium',
    category: 'catalyst',
    sentimentCategory: 'bullish',
    headline: 'Profitability Inflection with Podcast Monetization Tailwinds',
    thesis: 'Spotify has successfully navigated the transition from growth-at-all-costs to sustainable profitability. Gross margins have expanded 400bps in the past year through pricing power, cost rationalization, and improved podcast unit economics. The audiobook expansion and AI-powered discovery features are driving engagement metrics to all-time highs. With the music streaming market consolidating and Apple showing minimal competitive aggression, Spotifys TAM expansion into spoken word positions it for durable 20%+ revenue growth.',
    keyPoints: [
      'Premium ARPU up 12% YoY with minimal churn impact from price increases',
      'Podcast advertising revenue inflecting positive after 2 years of investment',
      'AI DJ feature driving 25% increase in listening hours for engaged users',
      'Audiobooks reaching 5M MAU faster than podcasts did at same stage',
      'Operating leverage yielding first full year of GAAP profitability in 2026'
    ],
    catalysts: [
      { event: 'Q2 Earnings (Margin Expansion)', date: 'May 2026', impact: 'positive' },
      { event: 'Audiobooks Tier Launch', date: 'June 2026', impact: 'positive' },
      { event: 'Creator Monetization Platform', date: 'H2 2026', impact: 'positive' },
      { event: 'Music Label Renewals', date: '2027', impact: 'neutral' }
    ],
    technicals: [
      { indicator: 'RSI (14)', signal: 'Bullish', strength: 62 },
      { indicator: '50/200 MA', signal: 'Golden Cross', strength: 80 },
      { indicator: 'Volume Profile', signal: 'Breakout', strength: 75 },
      { indicator: 'Fibonacci', signal: '61.8% Retracement Held', strength: 72 }
    ],
    fundamentals: [
      { metric: 'Forward P/E', value: '38x', vsIndustry: 'Premium justified' },
      { metric: 'Revenue Growth', value: '+18% YoY', vsIndustry: '+5% above avg' },
      { metric: 'Gross Margin', value: '28.5%', vsIndustry: 'Expanding' },
      { metric: 'MAU Growth', value: '+14% YoY', vsIndustry: 'Best-in-class' },
      { metric: 'FCF Margin', value: '8%', vsIndustry: 'First positive year' }
    ],
    risks: [
      'Music label negotiations could pressure margins',
      'Apple bundling strategy in services',
      'Podcast advertising market cyclicality',
      'Currency headwinds from EUR exposure'
    ],
    sentiment: [
      { source: 'Analyst Consensus', score: 78 },
      { source: 'Options Flow', score: 82 },
      { source: 'Social Sentiment', score: 75 },
      { source: 'Short Interest', score: 70 }
    ],
    analystConsensus: {
      rating: 'buy',
      score: 78,
      priceTarget: { high: 480, low: 280, mean: 385 },
      recentActivity: '1 upgrade, 1 initiation in last 90 days',
      firms: [
        { name: 'Wells Fargo', rating: 'Overweight', action: 'upgrade', date: '2026-04-08' },
        { name: 'Barclays', rating: 'Equal Weight', action: 'maintain', date: '2026-03-25' }
      ]
    },
    relatedTickers: ['AAPL', 'GOOGL', 'NFLX', 'DIS', 'WMG'],
    lastUpdated: '6 hours ago',
    saved: false
  },
  {
    id: 'claude-4',
    ticker: 'TSLA',
    company: 'Tesla, Inc.',
    action: 'sell',
    conviction: 82,
    priceTarget: 140,
    currentPrice: 178.50,
    stopLoss: 195,
    timeframe: 'short',
    risk: 'high',
    category: 'fundamental',
    sentimentCategory: 'bearish',
    headline: 'Margin Compression and Competition Intensifying',
    thesis: 'Tesla faces a challenging 12-18 months as legacy OEMs and Chinese competitors gain EV share while pricing pressure compresses automotive margins. The robotaxi narrative remains speculative with regulatory hurdles and liability questions unresolved. Energy storage growth is real but insufficient to offset auto headwinds. While the brand retains value, the current valuation implies flawless execution across multiple moonshot initiatives simultaneously.',
    keyPoints: [
      'Auto gross margins compressed to 16.5% from 25%+ in 2022',
      'China market share declining as BYD, NIO, Xpeng gain traction',
      'Model refresh cycle delayed, aging lineup vs competitors',
      'FSD revenue recognition increasingly scrutinized by auditors',
      'Elon distraction risk elevated with multiple company demands'
    ],
    catalysts: [
      { event: 'Q2 Deliveries Miss', date: 'July 2026', impact: 'negative' },
      { event: 'Robotaxi Reveal Event', date: 'August 2026', impact: 'neutral' },
      { event: 'Model 2 Production Start', date: 'Q4 2026', impact: 'positive' },
      { event: 'China Tariff Uncertainty', date: 'Ongoing', impact: 'negative' }
    ],
    technicals: [
      { indicator: 'RSI (14)', signal: 'Bearish Divergence', strength: 45 },
      { indicator: '50/200 MA', signal: 'Death Cross Risk', strength: 35 },
      { indicator: 'Volume Profile', signal: 'Distribution', strength: 40 },
      { indicator: 'Support Levels', signal: '$165 Key Level', strength: 50 }
    ],
    fundamentals: [
      { metric: 'Forward P/E', value: '58x', vsIndustry: '+320% vs auto avg' },
      { metric: 'Revenue Growth', value: '+8% YoY', vsIndustry: 'Decelerating' },
      { metric: 'Gross Margin', value: '16.5%', vsIndustry: 'Compressing' },
      { metric: 'Inventory Days', value: '18 days', vsIndustry: 'Elevated' },
      { metric: 'FCF Yield', value: '1.2%', vsIndustry: 'Below avg' }
    ],
    risks: [
      'Robotaxi event could exceed expectations',
      'Model 2 pricing could accelerate demand',
      'Energy segment growth underappreciated',
      'Short squeeze potential given high short interest'
    ],
    sentiment: [
      { source: 'Analyst Consensus', score: 45 },
      { source: 'Options Flow', score: 38 },
      { source: 'Social Sentiment', score: 65 },
      { source: 'Insider Activity', score: 30 }
    ],
    analystConsensus: {
      rating: 'hold',
      score: 45,
      priceTarget: { high: 280, low: 85, mean: 165 },
      recentActivity: '2 downgrades, 1 maintain in last 90 days',
      firms: [
        { name: 'UBS', rating: 'Neutral', action: 'downgrade', date: '2026-04-18' },
        { name: 'Deutsche Bank', rating: 'Hold', action: 'downgrade', date: '2026-04-02' }
      ]
    },
    relatedTickers: ['F', 'GM', 'RIVN', 'LCID', 'BYD'],
    lastUpdated: '3 hours ago',
    saved: false
  },
  {
    id: 'claude-5',
    ticker: 'CRWD',
    company: 'CrowdStrike Holdings',
    action: 'buy',
    conviction: 89,
    priceTarget: 420,
    currentPrice: 342.20,
    stopLoss: 295,
    timeframe: 'medium',
    risk: 'medium',
    category: 'macro',
    sentimentCategory: 'bullish',
    headline: 'Cybersecurity Leader in Elevated Threat Environment',
    thesis: 'CrowdStrike is the clear leader in endpoint security with expanding platform capabilities driving best-in-class net retention. The threat landscape continues to intensify with nation-state actors and AI-powered attacks creating urgency for enterprise security upgrades. The Falcon platform consolidation play is working, with customers adopting 7+ modules on average. While valuation is premium, the combination of 30%+ growth and improving profitability justifies the multiple.',
    keyPoints: [
      'Net retention rate of 120%+ indicates strong upsell momentum',
      'Module adoption reaching 7.2 average vs 5.8 two years ago',
      'AI-native threat detection showing 40% improvement in zero-day catches',
      'Federal government contracts expanding with FedRAMP High certification',
      'Charlotte AI assistant driving productivity gains for SOC teams'
    ],
    catalysts: [
      { event: 'Q2 Earnings Beat', date: 'June 2026', impact: 'positive' },
      { event: 'Federal Contract Awards', date: 'Q3 2026', impact: 'positive' },
      { event: 'Fal.Con User Conference', date: 'September 2026', impact: 'positive' },
      { event: 'Major Cyber Incident', date: 'Unknown', impact: 'positive' }
    ],
    technicals: [
      { indicator: 'RSI (14)', signal: 'Bullish', strength: 58 },
      { indicator: '50/200 MA', signal: 'Strong Uptrend', strength: 85 },
      { indicator: 'Volume Profile', signal: 'Accumulation', strength: 72 },
      { indicator: 'Cup & Handle', signal: 'Forming', strength: 68 }
    ],
    fundamentals: [
      { metric: 'Forward P/E', value: '65x', vsIndustry: 'Premium tier' },
      { metric: 'Revenue Growth', value: '+32% YoY', vsIndustry: '+18% above avg' },
      { metric: 'Gross Margin', value: '78%', vsIndustry: '+5% above avg' },
      { metric: 'Rule of 40', value: '62%', vsIndustry: 'Best-in-class' },
      { metric: 'ARR', value: '$3.8B', vsIndustry: 'Category leader' }
    ],
    risks: [
      'Valuation contraction in risk-off environment',
      'Microsoft E5 bundling competitive pressure',
      'Elongated enterprise sales cycles in downturn',
      'Key person risk with CEO transition eventually'
    ],
    sentiment: [
      { source: 'Analyst Consensus', score: 85 },
      { source: 'Options Flow', score: 72 },
      { source: 'Institutional Ownership', score: 88 },
      { source: 'Insider Activity', score: 65 }
    ],
    analystConsensus: {
      rating: 'buy',
      score: 85,
      priceTarget: { high: 480, low: 320, mean: 405 },
      recentActivity: '2 upgrades in last 90 days',
      firms: [
        { name: 'Piper Sandler', rating: 'Overweight', action: 'upgrade', date: '2026-04-14' },
        { name: 'Needham', rating: 'Buy', action: 'maintain', date: '2026-04-01' }
      ]
    },
    relatedTickers: ['PANW', 'ZS', 'FTNT', 'S', 'OKTA'],
    lastUpdated: '5 hours ago',
    saved: false
  }
]

const riskColors: Record<RiskLevel, string> = {
  low: 'text-green-400 bg-green-500/10 border-green-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  high: 'text-red-400 bg-red-500/10 border-red-500/30'
}

const sentimentColors: Record<SentimentCategory, string> = {
  bullish: 'text-green-400 bg-green-500/10 border-green-500/30',
  bearish: 'text-red-400 bg-red-500/10 border-red-500/30',
  hedge: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  neutral: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
}

const sentimentLabels: Record<SentimentCategory, string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  hedge: 'Hedge',
  neutral: 'Neutral'
}

const categoryIcons: Record<IdeaCategory, typeof Brain> = {
  macro: Globe,
  technical: BarChart3,
  fundamental: BookOpen,
  catalyst: Zap,
  quant: Activity
}

export default function ClaudeIdeasPage() {
  const [ideas, setIdeas] = useState<ResearchIdea[]>(CLAUDE_IDEAS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [tickerSearch, setTickerSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all')
  const [filterTimeframe, setFilterTimeframe] = useState<Timeframe | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<IdeaCategory | 'all'>('all')
  const [filterSentiment, setFilterSentiment] = useState<SentimentCategory | 'all'>('all')
  const [tradingMode, setTradingMode] = useState<'autonomous' | 'manual'>('manual')
  const [executingTrade, setExecutingTrade] = useState<string | null>(null)
  const [tradeResult, setTradeResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  
  const { executeTrade, loading: tradeLoading } = useBrokerTrade('alpaca')
  const { ideas: dynamicIdeas, isGenerating, generateIdea, watchlist } = useTradeIdeas({ provider: 'claude' })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<ResearchIdea | null>(null)
  const [researchData, setResearchData] = useState<Record<string, {
    darkPool: { sentiment: string; totalValue: number; recentTrades: number }
    optionsFlow: { sentiment: string; callPutRatio: number; unusualActivity: boolean }
    insiderActivity: { netDirection: string; recentTrades: number }
    news: { sentiment: string; count: number; latestHeadline: string | null }
    overallSentiment: { score: number; label: string; signals: string[] }
  }>>({})

  // Fetch aggregated research data from all APIs
  const fetchResearchData = async () => {
    try {
      const tickers = CLAUDE_IDEAS.map(i => i.ticker).join(',')
      const res = await fetch(`/api/research/aggregate?tickers=${tickers}`)
      if (!res.ok) return
      const data = await res.json()
      
      // Update prices and research data
      const research = data.research ?? {}
      setResearchData(research)
      
      setIdeas(prev => prev.map(idea => {
        const r = research[idea.ticker]
        if (!r) return idea
        return {
          ...idea,
          currentPrice: r.price?.current ?? idea.currentPrice
        }
      }))
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('[trade-ideas] Failed to fetch research data:', err)
    }
  }

  // Fetch research data on mount and every 60 seconds
  useEffect(() => {
    fetchResearchData()
    const interval = setInterval(fetchResearchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchResearchData()
    setIsRefreshing(false)
  }

  const toggleSaved = (id: string) => {
    setIdeas(prev => prev.map(idea => 
      idea.id === id ? { ...idea, saved: !idea.saved } : idea
    ))
  }

  // Convert dynamic ideas to the ResearchIdea format and combine with static ideas
  const convertedDynamicIdeas: ResearchIdea[] = dynamicIdeas.map(di => ({
    id: di.id,
    ticker: di.ticker,
    company: di.company,
    action: di.action,
    conviction: di.confidence,
    priceTarget: di.priceTarget,
    currentPrice: di.currentPrice,
    stopLoss: di.stopLoss,
    timeframe: di.timeframe === 'day' ? 'short' : di.timeframe === 'swing' ? 'medium' : 'long',
    risk: di.risk,
    category: di.category === 'momentum' ? 'technical' : di.category === 'value' ? 'fundamental' : di.category === 'event' ? 'catalyst' : 'technical',
    sentimentCategory: di.sentiment === 'bullish' ? 'bullish' : di.sentiment === 'bearish' ? 'bearish' : 'neutral',
    headline: `${di.action.toUpperCase()} ${di.ticker}: ${di.thesis.slice(0, 60)}...`,
    thesis: di.thesis,
    keyPoints: di.keyPoints,
    catalysts: di.catalysts.map(c => ({ event: c, date: 'Upcoming', impact: 'positive' as const })),
    technicals: di.technicalSignals.map(t => ({ indicator: t.indicator, signal: t.signal, strength: t.strength === 'strong' ? 90 : t.strength === 'moderate' ? 60 : 30 })),
    fundamentals: [],
    risks: di.risks,
    sentiment: [{ source: 'Claude AI', score: di.confidence }],
    analystConsensus: null,
    relatedTickers: [],
    lastUpdated: di.generatedAt,
    saved: false
  }))

  const allIdeas = [...convertedDynamicIdeas, ...ideas]

  const filteredIdeas = allIdeas.filter(idea => {
    if (tickerSearch) {
      const q = tickerSearch.toUpperCase()
      if (!idea.ticker.includes(q) && !idea.company.toUpperCase().includes(q)) return false
    }
    if (filterRisk !== 'all' && idea.risk !== filterRisk) return false
    if (filterTimeframe !== 'all' && idea.timeframe !== filterTimeframe) return false
    if (filterCategory !== 'all' && idea.category !== filterCategory) return false
    if (filterSentiment !== 'all' && idea.sentimentCategory !== filterSentiment) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavBar />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Brain className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Claude Deep Research</h1>
              <p className="text-sm text-muted-foreground">In-depth analysis powered by Claude AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Trading Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden sm:block">
                Trade Mode:
              </span>
              <div className="flex items-center bg-muted/30 rounded-lg border border-border/50 p-0.5">
                <button
                  onClick={() => setTradingMode('autonomous')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                    tradingMode === 'autonomous'
                      ? 'bg-green-500 text-black shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Auto</span>
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
                  <span className="hidden sm:inline">Manual</span>
                </button>
              </div>
            </div>
            
            {lastUpdated && (
              <span className="text-xs text-muted-foreground font-mono hidden md:block">
                Last updated: {lastUpdated}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Fetching...' : 'Refresh Prices'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground uppercase">Filters:</span>
          </div>

          {/* Ticker Search with Autocomplete */}
          <div className="flex items-center gap-2">
            <TickerAutocomplete
              value={tickerSearch}
              onChange={setTickerSearch}
              onSelect={(ticker) => {
                setTickerSearch(ticker.symbol)
              }}
              placeholder="Search any US ticker..."
              className="w-52"
            />
            <button
              onClick={() => { if (tickerSearch) generateIdea(tickerSearch) }}
              disabled={isGenerating || !tickerSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value as RiskLevel | 'all')}
            className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs font-mono"
          >
            <option value="all">All Risk</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
          
          <select
            value={filterTimeframe}
            onChange={(e) => setFilterTimeframe(e.target.value as Timeframe | 'all')}
            className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs font-mono"
          >
            <option value="all">All Timeframes</option>
            <option value="short">Short-Term</option>
            <option value="medium">Medium-Term</option>
            <option value="long">Long-Term</option>
          </select>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as IdeaCategory | 'all')}
            className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs font-mono"
          >
            <option value="all">All Categories</option>
            <option value="macro">Macro</option>
            <option value="technical">Technical</option>
            <option value="fundamental">Fundamental</option>
            <option value="catalyst">Catalyst</option>
            <option value="quant">Quantitative</option>
          </select>
          
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
                onClick={() => { setTickerSearch(''); setFilterRisk('all'); setFilterTimeframe('all'); setFilterCategory('all'); setFilterSentiment('all') }}
                className="mt-4 px-4 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/50 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
          {filteredIdeas.map((idea, index) => {
            const CategoryIcon = categoryIcons[idea.category]
            const isExpanded = expandedId === idea.id
            const upside = ((idea.priceTarget - idea.currentPrice) / idea.currentPrice * 100).toFixed(1)
            const downside = ((idea.currentPrice - idea.stopLoss) / idea.currentPrice * 100).toFixed(1)
            
            return (
              <div
                key={idea.id}
                className={`rounded-xl border bg-card/50 overflow-hidden transition-all ${
                  idea.action === 'buy' ? 'border-green-500/30' : idea.action === 'sell' ? 'border-red-500/30' : 'border-border'
                }`}
              >
                {/* Card Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : idea.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Rank Badge */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idea.action === 'buy' ? 'bg-green-500/20 text-green-400' : 
                        idea.action === 'sell' ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-lg">{idea.ticker}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            idea.action === 'buy' ? 'bg-green-500/20 text-green-400' :
                            idea.action === 'sell' ? 'bg-red-500/20 text-red-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {idea.action}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs border ${riskColors[idea.risk]}`}>
                            {idea.risk} risk
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs bg-muted/50 text-muted-foreground flex items-center gap-1">
                            <CategoryIcon className="w-3 h-3" />
                            {idea.category}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{idea.company}</p>
                        <p className="font-medium mt-1">{idea.headline}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Conviction Score */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-400">{idea.conviction}%</div>
                        <div className="text-xs text-muted-foreground">Conviction</div>
                      </div>
                      
                      {/* Price Info */}
                      <div className="text-right">
                        <div className="font-mono font-bold">${idea.currentPrice.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          Target: <span className="text-green-400">${idea.priceTarget}</span>
                        </div>
                        <div className="text-xs">
                          <span className={idea.action === 'buy' ? 'text-green-400' : 'text-red-400'}>
                            {idea.action === 'buy' ? '+' : '-'}{Math.abs(Number(upside))}% upside
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSaved(idea.id) }}
                          className={`p-2 rounded-lg transition-colors ${
                            idea.saved ? 'bg-amber-500/20 text-amber-400' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {idea.saved ? <Star className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />}
                        </button>
                        <button className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-6">
                    {/* Live Research Signals */}
                    {researchData[idea.ticker] && (
                      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                        <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> Live Cross-Referenced Research
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Dark Pool */}
                          <div className="text-center">
                            <div className={`text-lg font-bold ${
                              researchData[idea.ticker].darkPool.sentiment === 'bullish' ? 'text-green-400' :
                              researchData[idea.ticker].darkPool.sentiment === 'bearish' ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {researchData[idea.ticker].darkPool.sentiment.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">Dark Pool</div>
                            <div className="text-xs text-muted-foreground/60">
                              {researchData[idea.ticker].darkPool.recentTrades} trades
                            </div>
                          </div>
                          {/* Options Flow */}
                          <div className="text-center">
                            <div className={`text-lg font-bold ${
                              researchData[idea.ticker].optionsFlow.sentiment === 'bullish' ? 'text-green-400' :
                              researchData[idea.ticker].optionsFlow.sentiment === 'bearish' ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {researchData[idea.ticker].optionsFlow.sentiment.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">Options Flow</div>
                            <div className="text-xs text-muted-foreground/60">
                              C/P: {researchData[idea.ticker].optionsFlow.callPutRatio.toFixed(2)}
                              {researchData[idea.ticker].optionsFlow.unusualActivity && (
                                <span className="text-amber-400 ml-1">UNUSUAL</span>
                              )}
                            </div>
                          </div>
                          {/* Insider Activity */}
                          <div className="text-center">
                            <div className={`text-lg font-bold ${
                              researchData[idea.ticker].insiderActivity.netDirection === 'buying' ? 'text-green-400' :
                              researchData[idea.ticker].insiderActivity.netDirection === 'selling' ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {researchData[idea.ticker].insiderActivity.netDirection.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">Insiders</div>
                            <div className="text-xs text-muted-foreground/60">
                              {researchData[idea.ticker].insiderActivity.recentTrades} trades
                            </div>
                          </div>
                          {/* News Sentiment */}
                          <div className="text-center">
                            <div className={`text-lg font-bold ${
                              researchData[idea.ticker].news.sentiment === 'bullish' ? 'text-green-400' :
                              researchData[idea.ticker].news.sentiment === 'bearish' ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {researchData[idea.ticker].news.sentiment.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">News</div>
                            <div className="text-xs text-muted-foreground/60">
                              {researchData[idea.ticker].news.count} articles
                            </div>
                          </div>
                        </div>
                        {/* Overall Sentiment Score */}
                        <div className="mt-4 pt-3 border-t border-blue-500/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Overall Sentiment:</span>
                              <span className={`font-bold ${
                                researchData[idea.ticker].overallSentiment.score > 30 ? 'text-green-400' :
                                researchData[idea.ticker].overallSentiment.score < -30 ? 'text-red-400' : 'text-amber-400'
                              }`}>
                                {researchData[idea.ticker].overallSentiment.score > 0 ? '+' : ''}
                                {researchData[idea.ticker].overallSentiment.score}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {researchData[idea.ticker].overallSentiment.signals.slice(0, 3).map((signal, i) => (
                                <span key={i} className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-300">
                                  {signal}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Thesis */}
                    <div>
                      <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Investment Thesis
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{idea.thesis}</p>
                    </div>
                    
                    {/* Key Points */}
                    <div>
                      <h3 className="text-sm font-bold text-amber-400 mb-2">Key Points</h3>
                      <ul className="space-y-1">
                        {idea.keyPoints.map((point, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-amber-400 mt-1">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Catalysts */}
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Catalysts
                        </h4>
                        <div className="space-y-2">
                          {idea.catalysts.map((cat, i) => (
                            <div key={i} className="text-xs">
                              <div className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  cat.impact === 'positive' ? 'bg-green-400' :
                                  cat.impact === 'negative' ? 'bg-red-400' : 'bg-gray-400'
                                }`} />
                                <span className="text-muted-foreground">{cat.event}</span>
                              </div>
                              <div className="text-muted-foreground/60 ml-3">{cat.date}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Technicals */}
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" /> Technicals
                        </h4>
                        <div className="space-y-2">
                          {idea.technicals.map((tech, i) => (
                            <div key={i} className="text-xs flex justify-between">
                              <span className="text-muted-foreground">{tech.indicator}</span>
                              <span className={tech.strength >= 60 ? 'text-green-400' : tech.strength >= 40 ? 'text-amber-400' : 'text-red-400'}>
                                {tech.signal}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Fundamentals */}
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Fundamentals
                        </h4>
                        <div className="space-y-2">
                          {idea.fundamentals.slice(0, 4).map((fund, i) => (
                            <div key={i} className="text-xs flex justify-between">
                              <span className="text-muted-foreground">{fund.metric}</span>
                              <span className="text-foreground">{fund.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Sentiment */}
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Sentiment
                        </h4>
                        <div className="space-y-2">
                          {idea.sentiment.map((sent, i) => (
                            <div key={i} className="text-xs">
                              <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">{sent.source}</span>
                                <span>{sent.score}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className={`h-full ${sent.score >= 70 ? 'bg-green-500' : sent.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${sent.score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Risks */}
                    <div>
                      <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Key Risks
                      </h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {idea.risks.map((risk, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-red-400 mt-1">!</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Updated {idea.lastUpdated}</span>
                        <span>Related: {idea.relatedTickers.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedIdea(idea)}
                          className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Full Report
                        </button>
                        <button 
                          onClick={async () => {
                            if (tradingMode === 'autonomous') {
                              setExecutingTrade(idea.id)
                              const result = await executeTrade({
                                ticker: idea.ticker,
                                side: idea.action === 'buy' ? 'buy' : 'sell',
                                quantity: 10, // Default quantity
                                orderType: 'market',
                              })
                              setTradeResult({ id: idea.id, success: result.success, message: result.message })
                              setExecutingTrade(null)
                              setTimeout(() => setTradeResult(null), 3000)
                            } else {
                              // Manual mode - stage for review
                              console.log(`[v0] Staged ${idea.action.toUpperCase()} trade for ${idea.ticker}`)
                            }
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
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* Full Report Modal */}
      {selectedIdea && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedIdea(null)}
        >
          <div 
            className="bg-card rounded-lg border border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-mono font-bold">{selectedIdea.ticker}</span>
                  <span className={`px-3 py-1 rounded text-sm font-bold ${
                    selectedIdea.action === 'buy' 
                      ? 'bg-green-500/20 text-green-400' 
                      : selectedIdea.action === 'sell'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {selectedIdea.action.toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">Conviction: {selectedIdea.conviction}%</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">{selectedIdea.headline}</h2>
              </div>
              <button
                onClick={() => setSelectedIdea(null)}
                className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground font-mono text-xs mb-1">CURRENT PRICE</div>
                  <div className="font-bold">${selectedIdea.currentPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground font-mono text-xs mb-1">TARGET PRICE</div>
                  <div className="font-bold text-green-400">${selectedIdea.priceTarget.toFixed(2)}</div>
                  <div className="text-xs text-green-400 mt-1">+{((selectedIdea.priceTarget / selectedIdea.currentPrice - 1) * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground font-mono text-xs mb-1">STOP LOSS</div>
                  <div className="font-bold text-red-400">${selectedIdea.stopLoss.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground font-mono text-xs mb-1">TIMEFRAME</div>
                  <div className="font-bold capitalize">{selectedIdea.timeframe}</div>
                </div>
              </div>

              {/* Thesis */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Thesis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedIdea.thesis}</p>
              </div>

              {/* Key Points */}
              {selectedIdea.keyPoints.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Key Points</h3>
                  <ul className="space-y-2">
                    {selectedIdea.keyPoints.map((point, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Catalysts */}
              {selectedIdea.catalysts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Catalysts</h3>
                  <div className="space-y-2">
                    {selectedIdea.catalysts.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 rounded border border-border/50">
                        <span className="text-muted-foreground">{cat.event}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          cat.impact === 'positive' ? 'bg-green-500/20 text-green-400' :
                          cat.impact === 'negative' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {cat.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks */}
              {selectedIdea.risks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Risks</h3>
                  <div className="p-3 rounded border border-red-500/20 bg-red-500/5 space-y-1">
                    {selectedIdea.risks.map((risk, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-red-400 mt-1">!</span>
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-border">
                <button 
                  onClick={() => setSelectedIdea(null)}
                  className="px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
