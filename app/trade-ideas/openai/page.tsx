'use client'

import { useState, useEffect } from 'react'
import { useLiveQuotes } from '@/hooks/useLiveQuotes'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { TickerAutocomplete } from '@/components/ui/ticker-autocomplete'
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Target, Clock, BarChart3, Zap, BookOpen, Globe, DollarSign, Activity, Layers, Filter, RefreshCw, Star, Bookmark, Share2, ExternalLink, Brain, Cpu, Database, LineChart, Search, X, Bot, Hand, Loader, CheckCircle } from 'lucide-react'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'
import { useTradeIdeas, TradeIdea } from '@/hooks/useTradeIdeas'

type RiskLevel = 'low' | 'medium' | 'high'
type Timeframe = 'short' | 'medium' | 'long'
type IdeaCategory = 'momentum' | 'value' | 'growth' | 'contrarian' | 'event'
type SentimentCategory = 'bullish' | 'bearish' | 'hedge' | 'neutral'

interface AnalystConsensus {
  rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  score: number
  priceTarget: { high: number; low: number; mean: number }
  recentActivity: string
  firms: { name: string; rating: string; action: string; date: string }[]
}

interface QuantSignal {
  name: string
  value: number
  percentile: number
  trend: 'up' | 'down' | 'flat'
}

interface ResearchIdea {
  id: string
  ticker: string
  company: string
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  priceTarget: number
  currentPrice: number
  stopLoss: number
  timeframe: Timeframe
  risk: RiskLevel
  category: IdeaCategory
  sentimentCategory: SentimentCategory
  headline: string
  summary: string
  quantSignals: QuantSignal[]
  aiInsights: string[]
  dataPoints: { label: string; value: string; change: string }[]
  sectorAnalysis: { factor: string; score: number; note: string }[]
  marketContext: string
  tradePlan: { phase: string; action: string; price: string }[]
  alternativeScenarios: { scenario: string; probability: number; outcome: string }[]
  modelConfidence: { aspect: string; score: number }[]
  analystConsensus: AnalystConsensus | null
  lastUpdated: string
  saved: boolean
}

const OPENAI_IDEAS: ResearchIdea[] = [
  {
    id: 'gpt-1',
    ticker: 'META',
    company: 'Meta Platforms, Inc.',
    action: 'buy',
    confidence: 92,
    priceTarget: 625,
    currentPrice: 512.30,
    stopLoss: 450,
    timeframe: 'medium',
    risk: 'medium',
    category: 'momentum',
    sentimentCategory: 'bullish',
    headline: 'AI Monetization Inflection Driving Rerating',
    summary: 'Meta is experiencing a fundamental rerating as AI investments translate into measurable monetization gains. Reels engagement now exceeds TikTok in key demographics, while AI-powered ad targeting is recovering signal loss from ATT. The Reality Labs drag is moderating, and the core business is generating substantial free cash flow for buybacks.',
    quantSignals: [
      { name: 'Momentum Score', value: 87, percentile: 94, trend: 'up' },
      { name: 'Relative Strength', value: 78, percentile: 82, trend: 'up' },
      { name: 'Earnings Revision', value: 15.2, percentile: 91, trend: 'up' },
      { name: 'Flow Score', value: 72, percentile: 78, trend: 'up' },
      { name: 'Volatility Rank', value: 35, percentile: 42, trend: 'down' }
    ],
    aiInsights: [
      'Natural language analysis of earnings calls shows 340% increase in AI-related mentions with positive sentiment',
      'Patent filing velocity in AR/VR accelerating, suggesting product launches within 18 months',
      'Employee review sentiment improving 22% YoY, indicating cultural turnaround',
      'Satellite imagery shows data center construction 3 months ahead of schedule',
      'Alternative data suggests Instagram user growth reaccelerating in EU post-DMA compliance'
    ],
    dataPoints: [
      { label: 'Daily Active Users', value: '3.24B', change: '+5% YoY' },
      { label: 'ARPU', value: '$13.12', change: '+18% YoY' },
      { label: 'AI Capex', value: '$38B', change: '+42% YoY' },
      { label: 'FCF Margin', value: '32%', change: '+8pp YoY' },
      { label: 'Buyback Pace', value: '$50B/yr', change: 'Accelerating' }
    ],
    sectorAnalysis: [
      { factor: 'Sector Momentum', score: 85, note: 'Tech leading market' },
      { factor: 'Relative Valuation', score: 72, note: 'Discount to GOOGL' },
      { factor: 'Earnings Quality', score: 88, note: 'Beat rate: 92%' },
      { factor: 'Institutional Flow', score: 78, note: 'Net buying 8 weeks' }
    ],
    marketContext: 'Advertising market showing resilience despite macro concerns. AI integration into ad stacks creating efficiency gains across the industry. Social media engagement metrics strong as short-form video consumption continues secular growth.',
    tradePlan: [
      { phase: 'Entry', action: 'Buy 50% position', price: '$510-520' },
      { phase: 'Add', action: 'Scale in remaining', price: 'On pullback to $485' },
      { phase: 'Target 1', action: 'Trim 25%', price: '$575' },
      { phase: 'Target 2', action: 'Trim 50%', price: '$625' },
      { phase: 'Stop', action: 'Exit all', price: 'Close below $450' }
    ],
    alternativeScenarios: [
      { scenario: 'Bull Case', probability: 30, outcome: '$700+ on AI monetization exceeding expectations' },
      { scenario: 'Base Case', probability: 50, outcome: '$625 target achieved in 6-9 months' },
      { scenario: 'Bear Case', probability: 20, outcome: '$400 if ad market weakens or regulatory pressure' }
    ],
    modelConfidence: [
      { aspect: 'Price Prediction', score: 85 },
      { aspect: 'Timing Accuracy', score: 72 },
      { aspect: 'Risk Assessment', score: 88 },
      { aspect: 'Catalyst Identification', score: 91 }
    ],
    analystConsensus: {
      rating: 'buy',
      score: 87,
      priceTarget: { high: 650, low: 520, mean: 598 },
      recentActivity: '3 upgrades in last 90 days',
      firms: [
        { name: 'Bernstein', rating: 'Outperform', action: 'upgrade', date: '2026-04-16' },
        { name: 'Morgan Stanley', rating: 'Overweight', action: 'maintain', date: '2026-04-10' }
      ]
    },
    lastUpdated: '1 hour ago',
    saved: false
  },
  {
    id: 'gpt-2',
    ticker: 'AMZN',
    company: 'Amazon.com, Inc.',
    action: 'buy',
    confidence: 89,
    priceTarget: 235,
    currentPrice: 188.50,
    stopLoss: 165,
    timeframe: 'long',
    risk: 'low',
    category: 'growth',
    sentimentCategory: 'bullish',
    headline: 'AWS AI Services Driving Margin Expansion',
    summary: 'Amazon is at an inflection point where AWS margin expansion, retail profitability improvements, and advertising growth are converging. The AI infrastructure buildout positions AWS for the next wave of cloud adoption. Retail is benefiting from regionalization efficiency gains, while advertising is the highest-margin growth vector.',
    quantSignals: [
      { name: 'Momentum Score', value: 74, percentile: 76, trend: 'up' },
      { name: 'Quality Score', value: 92, percentile: 95, trend: 'flat' },
      { name: 'Growth Persistence', value: 88, percentile: 89, trend: 'up' },
      { name: 'Margin Trajectory', value: 82, percentile: 85, trend: 'up' },
      { name: 'Capital Efficiency', value: 71, percentile: 68, trend: 'up' }
    ],
    aiInsights: [
      'AWS customer reviews sentiment improving 18% in enterprise segment',
      'Job postings for AI/ML roles up 156% YoY, signaling product acceleration',
      'Fulfillment center automation reducing unit costs by estimated 12%',
      'Prime membership churn at historic lows per credit card transaction data',
      'Bedrock adoption curve tracking faster than any previous AWS service'
    ],
    dataPoints: [
      { label: 'AWS Revenue', value: '$105B ARR', change: '+17% YoY' },
      { label: 'AWS Margin', value: '38%', change: '+400bps YoY' },
      { label: 'Ad Revenue', value: '$56B ARR', change: '+24% YoY' },
      { label: 'FCF', value: '$65B TTM', change: '+180% YoY' },
      { label: 'Operating Margin', value: '11%', change: '+4pp YoY' }
    ],
    sectorAnalysis: [
      { factor: 'Cloud Leadership', score: 95, note: 'Market share stable' },
      { factor: 'E-commerce Moat', score: 88, note: 'Prime stickiness high' },
      { factor: 'Advertising Growth', score: 82, note: 'Taking share from Meta' },
      { factor: 'AI Positioning', score: 78, note: 'Bedrock gaining traction' }
    ],
    marketContext: 'Cloud spending resilient as enterprises prioritize AI infrastructure. E-commerce penetration still has room to grow globally. Advertising budgets shifting to retail media networks where AMZN dominates.',
    tradePlan: [
      { phase: 'Entry', action: 'Buy 40% position', price: '$185-190' },
      { phase: 'Add', action: 'Scale in on weakness', price: '$175 area' },
      { phase: 'Target 1', action: 'Trim 20%', price: '$210' },
      { phase: 'Target 2', action: 'Trim 40%', price: '$235' },
      { phase: 'Stop', action: 'Exit all', price: 'Close below $165' }
    ],
    alternativeScenarios: [
      { scenario: 'Bull Case', probability: 25, outcome: '$275+ on AWS reacceleration and margin beats' },
      { scenario: 'Base Case', probability: 55, outcome: '$235 target in 12 months' },
      { scenario: 'Bear Case', probability: 20, outcome: '$160 on macro slowdown or cloud competition' }
    ],
    modelConfidence: [
      { aspect: 'Price Prediction', score: 82 },
      { aspect: 'Timing Accuracy', score: 68 },
      { aspect: 'Risk Assessment', score: 90 },
      { aspect: 'Catalyst Identification', score: 85 }
    ],
    analystConsensus: {
      rating: 'buy',
      score: 82,
      priceTarget: { high: 1120, low: 950, mean: 1045 },
      recentActivity: '1 upgrade, 2 maintains in last 90 days',
      firms: [
        { name: 'RBC Capital', rating: 'Outperform', action: 'maintain', date: '2026-04-15' },
        { name: 'JPMorgan', rating: 'Overweight', action: 'maintain', date: '2026-03-30' }
      ]
    },
    lastUpdated: '3 hours ago',
    saved: true
  },
  {
    id: 'gpt-3',
    ticker: 'COST',
    company: 'Costco Wholesale',
    action: 'buy',
    confidence: 86,
    priceTarget: 1050,
    currentPrice: 892.40,
    stopLoss: 800,
    timeframe: 'long',
    risk: 'low',
    category: 'value',
    sentimentCategory: 'hedge',
    headline: 'Membership Moat Deepening with E-commerce Gains',
    summary: 'Costco represents a rare combination of defensive characteristics and growth potential. Membership renewal rates at all-time highs demonstrate pricing power. E-commerce growth is accelerating without cannibalizing in-store traffic. The recent membership fee increase will flow directly to bottom line.',
    quantSignals: [
      { name: 'Quality Score', value: 96, percentile: 99, trend: 'flat' },
      { name: 'Stability Score', value: 94, percentile: 97, trend: 'flat' },
      { name: 'Relative Strength', value: 82, percentile: 85, trend: 'up' },
      { name: 'Earnings Consistency', value: 98, percentile: 99, trend: 'flat' },
      { name: 'Dividend Safety', value: 92, percentile: 94, trend: 'flat' }
    ],
    aiInsights: [
      'Foot traffic data shows 8% YoY increase despite broader retail weakness',
      'Private label (Kirkland) expansion into new categories showing 25% growth',
      'International expansion pipeline strongest since 2019',
      'Employee satisfaction scores in top 5% of retail sector',
      'Credit card data shows average basket size increasing 6% YoY'
    ],
    dataPoints: [
      { label: 'Membership Revenue', value: '$4.8B', change: '+8% YoY' },
      { label: 'Renewal Rate', value: '93.4%', change: '+50bps YoY' },
      { label: 'Comp Sales', value: '+6.2%', change: 'Accelerating' },
      { label: 'E-commerce Growth', value: '+18%', change: 'Strong' },
      { label: 'Member Count', value: '134M', change: '+7% YoY' }
    ],
    sectorAnalysis: [
      { factor: 'Competitive Moat', score: 98, note: 'Unmatched loyalty' },
      { factor: 'Pricing Power', score: 92, note: 'Fee increase absorbed' },
      { factor: 'Execution Quality', score: 95, note: 'Consistent delivery' },
      { factor: 'Recession Resilience', score: 88, note: 'Trade-down beneficiary' }
    ],
    marketContext: 'Consumer spending showing bifurcation with value-focused retailers outperforming. Costcos treasure hunt model drives traffic even as consumers seek deals. Membership model provides revenue visibility.',
    tradePlan: [
      { phase: 'Entry', action: 'Buy 60% position', price: '$880-900' },
      { phase: 'Add', action: 'Complete position', price: 'On any dip to $850' },
      { phase: 'Target', action: 'Hold for long-term', price: '$1,050+' },
      { phase: 'Trim', action: 'Rebalance if >8% portfolio', price: 'Any price' },
      { phase: 'Stop', action: 'Review thesis', price: 'Below $800' }
    ],
    alternativeScenarios: [
      { scenario: 'Bull Case', probability: 30, outcome: '$1,200 on accelerating international growth' },
      { scenario: 'Base Case', probability: 55, outcome: '$1,050 target in 12-18 months' },
      { scenario: 'Bear Case', probability: 15, outcome: '$750 only on severe recession' }
    ],
    modelConfidence: [
      { aspect: 'Price Prediction', score: 78 },
      { aspect: 'Timing Accuracy', score: 65 },
      { aspect: 'Risk Assessment', score: 94 },
      { aspect: 'Catalyst Identification', score: 72 }
    ],
    analystConsensus: {
      rating: 'buy',
      score: 85,
      priceTarget: { high: 1100, low: 850, mean: 980 },
      recentActivity: '2 maintains in last 60 days',
      firms: [
        { name: 'Oppenheimer', rating: 'Outperform', action: 'maintain', date: '2026-04-10' },
        { name: 'Stifel', rating: 'Buy', action: 'reiterate', date: '2026-04-05' }
      ]
    },
    lastUpdated: '5 hours ago',
    saved: false
  },
  {
    id: 'gpt-4',
    ticker: 'NFLX',
    company: 'Netflix, Inc.',
    action: 'sell',
    confidence: 78,
    priceTarget: 580,
    currentPrice: 685.20,
    stopLoss: 720,
    timeframe: 'short',
    risk: 'high',
    category: 'contrarian',
    sentimentCategory: 'bearish',
    headline: 'Valuation Stretched After Password Sharing Tailwind Fades',
    summary: 'Netflix has executed brilliantly on password sharing crackdown and ad tier launch, but these one-time boosts are now in the base. Competition is intensifying as Disney+ and Max find footing. Content costs are reaccelerating, and the ad business is scaling slower than projected. Current valuation leaves little room for disappointment.',
    quantSignals: [
      { name: 'Momentum Score', value: 72, percentile: 75, trend: 'down' },
      { name: 'Valuation Score', value: 28, percentile: 15, trend: 'down' },
      { name: 'Earnings Revision', value: -2.1, percentile: 38, trend: 'down' },
      { name: 'Relative Strength', value: 68, percentile: 70, trend: 'flat' },
      { name: 'Insider Score', value: 25, percentile: 22, trend: 'down' }
    ],
    aiInsights: [
      'App download data shows deceleration in new user acquisition post-crackdown',
      'Content sentiment analysis shows declining viewer satisfaction scores',
      'Competitor content pipeline analysis suggests share pressure in H2',
      'Ad CPM data indicates pricing pressure as inventory exceeds demand',
      'Executive departure rate elevated compared to historical average'
    ],
    dataPoints: [
      { label: 'Forward P/E', value: '32x', change: '+40% vs 5yr avg' },
      { label: 'Sub Growth', value: '+5.1M', change: 'Decelerating' },
      { label: 'ARPU', value: '$17.30', change: 'Flat QoQ' },
      { label: 'Content Spend', value: '$17B', change: '+12% YoY' },
      { label: 'Ad Revenue', value: '$2B ARR', change: 'Below plan' }
    ],
    sectorAnalysis: [
      { factor: 'Competitive Position', score: 75, note: 'Leader but pressured' },
      { factor: 'Content ROI', score: 62, note: 'Declining efficiency' },
      { factor: 'Pricing Power', score: 58, note: 'Limited upside' },
      { factor: 'Growth Runway', score: 55, note: 'Maturing market' }
    ],
    marketContext: 'Streaming market approaching saturation in developed markets. Password sharing crackdown was a one-time benefit now anniversarying. Ad-supported tiers creating CPM pressure across the industry.',
    tradePlan: [
      { phase: 'Entry', action: 'Short 50% position', price: '$680-700' },
      { phase: 'Add', action: 'Add on strength', price: 'Above $710' },
      { phase: 'Cover 1', action: 'Cover 50%', price: '$620' },
      { phase: 'Cover 2', action: 'Cover remaining', price: '$580' },
      { phase: 'Stop', action: 'Cover all', price: 'Close above $720' }
    ],
    alternativeScenarios: [
      { scenario: 'Bull Case (for shorts)', probability: 35, outcome: '$500 on earnings miss and guide down' },
      { scenario: 'Base Case', probability: 45, outcome: '$580 target in 3-6 months' },
      { scenario: 'Bear Case (for shorts)', probability: 20, outcome: '$800+ on live sports success' }
    ],
    modelConfidence: [
      { aspect: 'Price Prediction', score: 72 },
      { aspect: 'Timing Accuracy', score: 65 },
      { aspect: 'Risk Assessment', score: 78 },
      { aspect: 'Catalyst Identification', score: 80 }
    ],
    analystConsensus: {
      rating: 'hold',
      score: 62,
      priceTarget: { high: 720, low: 580, mean: 650 },
      recentActivity: '1 downgrade, 2 maintains in last 90 days',
      firms: [
        { name: 'Jefferies', rating: 'Hold', action: 'downgrade', date: '2026-04-12' },
        { name: 'Oppenheimer', rating: 'Perform', action: 'maintain', date: '2026-04-05' }
      ]
    },
    lastUpdated: '2 hours ago',
    saved: false
  },
  {
    id: 'gpt-5',
    ticker: 'UBER',
    company: 'Uber Technologies',
    action: 'buy',
    confidence: 84,
    priceTarget: 95,
    currentPrice: 72.80,
    stopLoss: 62,
    timeframe: 'medium',
    risk: 'medium',
    category: 'event',
    sentimentCategory: 'bullish',
    headline: 'Autonomous Partnership Optionality Undervalued',
    summary: 'Uber is positioned to benefit regardless of autonomous vehicle outcomes through its platform network effects. The Waymo partnership validates the asset-light strategy. Delivery profitability is improving faster than expected, and advertising is an emerging high-margin revenue stream. FCF generation enabling capital returns.',
    quantSignals: [
      { name: 'Momentum Score', value: 76, percentile: 79, trend: 'up' },
      { name: 'Growth Score', value: 82, percentile: 84, trend: 'up' },
      { name: 'FCF Yield', value: 4.2, percentile: 72, trend: 'up' },
      { name: 'Earnings Revision', value: 8.5, percentile: 82, trend: 'up' },
      { name: 'Short Interest', value: 3.2, percentile: 35, trend: 'down' }
    ],
    aiInsights: [
      'Waymo ride data shows strong consumer acceptance in test markets',
      'Driver supply metrics improving, reducing incentive spend',
      'Grocery delivery partnerships expanding TAM significantly',
      'Advertising product reviews highly positive from early adopters',
      'International markets showing accelerating profitable growth'
    ],
    dataPoints: [
      { label: 'Gross Bookings', value: '$40B', change: '+21% YoY' },
      { label: 'Adj. EBITDA Margin', value: '4.8%', change: '+180bps YoY' },
      { label: 'FCF', value: '$6.5B', change: 'First positive year' },
      { label: 'Delivery Margin', value: '3.2%', change: '+120bps YoY' },
      { label: 'Ad Revenue', value: '$1B', change: '+75% YoY' }
    ],
    sectorAnalysis: [
      { factor: 'Network Effects', score: 92, note: 'Strong moat' },
      { factor: 'AV Optionality', score: 78, note: 'Partnerships derisked' },
      { factor: 'Margin Trajectory', score: 82, note: 'Consistent improvement' },
      { factor: 'Capital Returns', score: 75, note: 'Buyback initiated' }
    ],
    marketContext: 'Mobility demand strong as hybrid work stabilizes. Autonomous vehicle timelines extending, benefiting Uber platform model. Delivery market consolidating around top players.',
    tradePlan: [
      { phase: 'Entry', action: 'Buy 50% position', price: '$70-74' },
      { phase: 'Add', action: 'Scale in', price: 'On any dip to $65' },
      { phase: 'Target 1', action: 'Trim 25%', price: '$85' },
      { phase: 'Target 2', action: 'Trim 50%', price: '$95' },
      { phase: 'Stop', action: 'Exit all', price: 'Close below $62' }
    ],
    alternativeScenarios: [
      { scenario: 'Bull Case', probability: 25, outcome: '$120 on AV partnership expansion and margin beats' },
      { scenario: 'Base Case', probability: 55, outcome: '$95 target in 9-12 months' },
      { scenario: 'Bear Case', probability: 20, outcome: '$55 on regulatory pressure or AV disruption' }
    ],
    modelConfidence: [
      { aspect: 'Price Prediction', score: 80 },
      { aspect: 'Timing Accuracy', score: 70 },
      { aspect: 'Risk Assessment', score: 82 },
      { aspect: 'Catalyst Identification', score: 88 }
    ],
    analystConsensus: {
      rating: 'buy',
      score: 80,
      priceTarget: { high: 105, low: 80, mean: 92 },
      recentActivity: '2 upgrades in last 90 days',
      firms: [
        { name: 'RBC Capital', rating: 'Outperform', action: 'upgrade', date: '2026-04-17' },
        { name: 'UBS', rating: 'Buy', action: 'maintain', date: '2026-04-08' }
      ]
    },
    lastUpdated: '4 hours ago',
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
  momentum: TrendingUp,
  value: DollarSign,
  growth: LineChart,
  contrarian: Activity,
  event: Zap
}

export default function OpenAIIdeasPage() {
  const [ideas, setIdeas] = useState<ResearchIdea[]>(OPENAI_IDEAS)
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
  const { ideas: dynamicIdeas, isGenerating, generateIdea } = useTradeIdeas({ provider: 'openai' })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Fetch live prices from Polygon API
  const tickers = OPENAI_IDEAS.map(i => i.ticker)
  const { quotes: liveQuotes, refresh: refreshQuotes } = useLiveQuotes(tickers, { refreshInterval: 30000 })

  // Update ideas with live prices
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
    setLastUpdated(new Date().toLocaleTimeString())
  }, [liveQuotes])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshQuotes()
    setIsRefreshing(false)
  }

  const toggleSaved = (id: string) => {
    setIdeas(prev => prev.map(idea => 
      idea.id === id ? { ...idea, saved: !idea.saved } : idea
    ))
  }

  // Convert dynamic ideas to the ResearchIdea format
  const convertedDynamicIdeas: ResearchIdea[] = dynamicIdeas.map(di => ({
    id: di.id,
    ticker: di.ticker,
    company: di.company,
    action: di.action,
    confidence: di.confidence,
    priceTarget: di.priceTarget,
    currentPrice: di.currentPrice,
    stopLoss: di.stopLoss,
    timeframe: (di.timeframe === 'day' ? 'short' : di.timeframe === 'swing' ? 'medium' : 'long') as Timeframe,
    risk: di.risk,
    category: di.category as IdeaCategory,
    sentimentCategory: (di.sentiment === 'bullish' ? 'bullish' : di.sentiment === 'bearish' ? 'bearish' : 'neutral') as SentimentCategory,
    headline: `${di.action.toUpperCase()} ${di.ticker}: ${di.thesis.slice(0, 60)}...`,
    summary: di.thesis,
    quantSignals: di.technicalSignals.map(t => ({ 
      name: t.indicator, 
      value: t.strength === 'strong' ? 85 : t.strength === 'moderate' ? 65 : 40, 
      percentile: t.strength === 'strong' ? 90 : t.strength === 'moderate' ? 60 : 30, 
      trend: 'up' as const 
    })),
    aiInsights: di.keyPoints,
    dataPoints: di.catalysts.map((c, i) => ({ label: `Catalyst ${i + 1}`, value: c, change: 'Upcoming' })),
    sectorAnalysis: [{ factor: 'AI Analysis', score: di.confidence, note: 'Generated by OpenAI' }],
    marketContext: di.thesis,
    tradePlan: [
      { phase: 'Entry', action: 'Buy', price: `$${di.currentPrice.toFixed(2)}` },
      { phase: 'Target', action: 'Take Profit', price: `$${di.priceTarget.toFixed(2)}` },
      { phase: 'Stop', action: 'Cut Loss', price: `$${di.stopLoss.toFixed(2)}` }
    ],
    alternativeScenarios: [
      { scenario: 'Bull Case', probability: 40, outcome: `Price reaches $${(di.priceTarget * 1.2).toFixed(2)}` },
      { scenario: 'Base Case', probability: 45, outcome: `Price reaches $${di.priceTarget.toFixed(2)}` },
      { scenario: 'Bear Case', probability: 15, outcome: `Price falls to $${di.stopLoss.toFixed(2)}` }
    ],
    modelConfidence: [
      { aspect: 'Price Prediction', score: di.confidence },
      { aspect: 'Risk Assessment', score: Math.min(95, di.confidence + 5) }
    ],
    analystConsensus: null,
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
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30">
              <Sparkles className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">OpenAI Quantitative Research</h1>
              <p className="text-sm text-muted-foreground">Data-driven analysis powered by GPT models</p>
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
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Processing...' : 'Refresh Analysis'}</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            <option value="momentum">Momentum</option>
            <option value="value">Value</option>
            <option value="growth">Growth</option>
            <option value="contrarian">Contrarian</option>
            <option value="event">Event-Driven</option>
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
                      {/* Confidence Score */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{idea.confidence}%</div>
                        <div className="text-xs text-muted-foreground">Confidence</div>
                      </div>
                      
                      {/* Price Info */}
                      <div className="text-right">
                        <div className="font-mono font-bold">${idea.currentPrice.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          Target: <span className="text-green-400">${idea.priceTarget}</span>
                        </div>
                        <div className="text-xs">
                          <span className={idea.action === 'buy' ? 'text-green-400' : 'text-red-400'}>
                            {idea.action === 'buy' ? '+' : '-'}{Math.abs(Number(upside))}% potential
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSaved(idea.id) }}
                          className={`p-2 rounded-lg transition-colors ${
                            idea.saved ? 'bg-green-500/20 text-green-400' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
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
                    {/* Summary */}
                    <div>
                      <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                        <Cpu className="w-4 h-4" /> AI Summary
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{idea.summary}</p>
                    </div>
                    
                    {/* Quant Signals */}
                    <div>
                      <h3 className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4" /> Quantitative Signals
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {idea.quantSignals.map((signal, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
                            <div className="text-xs text-muted-foreground mb-1">{signal.name}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold">{signal.value}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                signal.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                                signal.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {signal.percentile}th %ile
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* AI Insights */}
                    <div>
                      <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4" /> Alternative Data Insights
                      </h3>
                      <ul className="space-y-1">
                        {idea.aiInsights.map((insight, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-400 mt-1">*</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Trade Plan */}
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Execution Plan
                        </h4>
                        <div className="space-y-2">
                          {idea.tradePlan.map((step, i) => (
                            <div key={i} className="text-xs flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                step.phase === 'Stop' ? 'bg-red-400' :
                                step.phase.includes('Target') ? 'bg-green-400' :
                                'bg-amber-400'
                              }`} />
                              <span className="text-muted-foreground w-16">{step.phase}:</span>
                              <span className="flex-1">{step.action}</span>
                              <span className="text-foreground font-mono">{step.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Scenarios */}
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> Scenario Analysis
                        </h4>
                        <div className="space-y-2">
                          {idea.alternativeScenarios.map((scenario, i) => (
                            <div key={i} className="text-xs">
                              <div className="flex justify-between mb-1">
                                <span className={
                                  scenario.scenario.includes('Bull') ? 'text-green-400' :
                                  scenario.scenario.includes('Bear') ? 'text-red-400' :
                                  'text-amber-400'
                                }>{scenario.scenario}</span>
                                <span className="text-muted-foreground">{scenario.probability}%</span>
                              </div>
                              <div className="text-muted-foreground/80">{scenario.outcome}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Model Confidence */}
                    <div>
                      <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Model Confidence Breakdown
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {idea.modelConfidence.map((conf, i) => (
                          <div key={i} className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">{conf.aspect}</div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
                              <div 
                                className={`h-full ${conf.score >= 80 ? 'bg-green-500' : conf.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${conf.score}%` }}
                              />
                            </div>
                            <div className="text-sm font-bold">{conf.score}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Market Context */}
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <h4 className="text-xs font-bold text-green-400 mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Market Context
                      </h4>
                      <p className="text-sm text-muted-foreground">{idea.marketContext}</p>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        Updated {idea.lastUpdated}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Full Report
                        </button>
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
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
