import { NextRequest, NextResponse } from 'next/server'

const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const TRADIER_KEY = process.env.TRADIER_API_KEY

// Types for analyst data
export interface AnalystRating {
  symbol: string
  targetHigh: number
  targetLow: number
  targetMean: number
  targetMedian: number
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  period: string
}

export interface AnalystRecommendation {
  symbol: string
  firm: string
  toGrade: string
  fromGrade: string | null
  action: 'upgrade' | 'downgrade' | 'maintain' | 'init'
  date: string
}

export interface AnalystData {
  symbol: string
  ratings: AnalystRating | null
  recommendations: AnalystRecommendation[]
  consensus: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  consensusScore: number
  priceTarget: {
    current: number | null
    high: number
    low: number
    mean: number
  }
  recentActivity: string
}

// Simple in-memory cache (1 hour TTL)
const cache = new Map<string, { data: AnalystData; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function getCachedData(symbol: string): AnalystData | null {
  const cached = cache.get(symbol.toUpperCase())
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedData(symbol: string, data: AnalystData): void {
  cache.set(symbol.toUpperCase(), { data, timestamp: Date.now() })
}

// Fetch recommendation trends from Finnhub
async function fetchFinnhubRecommendations(symbol: string): Promise<AnalystRating | null> {
  if (!FINNHUB_KEY) return null
  
  try {
    const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${FINNHUB_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    
    if (!res.ok) throw new Error(`Finnhub error: ${res.status}`)
    
    const data = await res.json()
    
    if (!data || data.length === 0) return null
    
    // Get most recent recommendation data
    const latest = data[0]
    
    return {
      symbol: latest.symbol,
      targetHigh: 0, // Finnhub recommendation endpoint doesn't include price targets
      targetLow: 0,
      targetMean: 0,
      targetMedian: 0,
      strongBuy: latest.strongBuy || 0,
      buy: latest.buy || 0,
      hold: latest.hold || 0,
      sell: latest.sell || 0,
      strongSell: latest.strongSell || 0,
      period: latest.period
    }
  } catch (err) {
    console.error('[Analyst API] Finnhub recommendation error:', err)
    return null
  }
}

// Fetch price target from Finnhub
async function fetchFinnhubPriceTarget(symbol: string): Promise<{ high: number; low: number; mean: number; median: number } | null> {
  if (!FINNHUB_KEY) return null
  
  try {
    const url = `https://finnhub.io/api/v1/stock/price-target?symbol=${symbol}&token=${FINNHUB_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    
    if (!res.ok) throw new Error(`Finnhub error: ${res.status}`)
    
    const data = await res.json()
    
    return {
      high: data.targetHigh || 0,
      low: data.targetLow || 0,
      mean: data.targetMean || 0,
      median: data.targetMedian || 0
    }
  } catch (err) {
    console.error('[Analyst API] Finnhub price target error:', err)
    return null
  }
}

// Fetch upgrade/downgrade history from Finnhub
async function fetchFinnhubUpgradeDowngrade(symbol: string): Promise<AnalystRecommendation[]> {
  if (!FINNHUB_KEY) return []
  
  try {
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days
    const to = new Date().toISOString().split('T')[0]
    const url = `https://finnhub.io/api/v1/stock/upgrade-downgrade?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    
    if (!res.ok) throw new Error(`Finnhub error: ${res.status}`)
    
    const data = await res.json()
    
    return (data || []).slice(0, 10).map((item: any) => ({
      symbol: item.symbol,
      firm: item.company || 'Unknown',
      toGrade: item.toGrade || 'N/A',
      fromGrade: item.fromGrade || null,
      action: item.action?.toLowerCase() || 'maintain',
      date: item.gradeTime?.split('T')[0] || new Date().toISOString().split('T')[0]
    }))
  } catch (err) {
    console.error('[Analyst API] Finnhub upgrade/downgrade error:', err)
    return []
  }
}

// Calculate consensus from ratings
function calculateConsensus(ratings: AnalystRating | null): { consensus: AnalystData['consensus']; score: number } {
  if (!ratings) {
    return { consensus: 'hold', score: 50 }
  }
  
  const total = ratings.strongBuy + ratings.buy + ratings.hold + ratings.sell + ratings.strongSell
  if (total === 0) {
    return { consensus: 'hold', score: 50 }
  }
  
  // Calculate weighted score (1-5 scale, converted to 0-100)
  const weightedSum = 
    (ratings.strongBuy * 5) + 
    (ratings.buy * 4) + 
    (ratings.hold * 3) + 
    (ratings.sell * 2) + 
    (ratings.strongSell * 1)
  
  const avgScore = weightedSum / total
  const normalizedScore = Math.round(((avgScore - 1) / 4) * 100)
  
  // Determine consensus category
  let consensus: AnalystData['consensus']
  if (avgScore >= 4.5) consensus = 'strong_buy'
  else if (avgScore >= 3.5) consensus = 'buy'
  else if (avgScore >= 2.5) consensus = 'hold'
  else if (avgScore >= 1.5) consensus = 'sell'
  else consensus = 'strong_sell'
  
  return { consensus, score: normalizedScore }
}

// Generate recent activity summary
function generateRecentActivity(recommendations: AnalystRecommendation[]): string {
  if (recommendations.length === 0) {
    return 'No recent analyst activity'
  }
  
  const upgrades = recommendations.filter(r => r.action === 'upgrade').length
  const downgrades = recommendations.filter(r => r.action === 'downgrade').length
  const initiations = recommendations.filter(r => r.action === 'init').length
  
  const parts = []
  if (upgrades > 0) parts.push(`${upgrades} upgrade${upgrades > 1 ? 's' : ''}`)
  if (downgrades > 0) parts.push(`${downgrades} downgrade${downgrades > 1 ? 's' : ''}`)
  if (initiations > 0) parts.push(`${initiations} initiation${initiations > 1 ? 's' : ''}`)
  
  if (parts.length === 0) {
    return `${recommendations.length} rating${recommendations.length > 1 ? 's' : ''} maintained in last 90 days`
  }
  
  return `${parts.join(', ')} in last 90 days`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  // Accept both `symbol` and `ticker` as aliases so the route works
  // regardless of which name the caller uses.
  const symbol = (searchParams.get('symbol') || searchParams.get('ticker'))?.toUpperCase()
  const symbols = (searchParams.get('symbols') || searchParams.get('tickers'))
    ?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  
  if (!symbol && !symbols?.length) {
    return NextResponse.json({ error: 'Symbol/ticker parameter required' }, { status: 400 })
  }
  
  const symbolList = symbols || (symbol ? [symbol] : [])
  
  try {
    const results: AnalystData[] = await Promise.all(
      symbolList.map(async (sym) => {
        // Check cache first
        const cached = getCachedData(sym)
        if (cached) return cached
        
        // Fetch all data in parallel
        const [ratings, priceTarget, recommendations] = await Promise.all([
          fetchFinnhubRecommendations(sym),
          fetchFinnhubPriceTarget(sym),
          fetchFinnhubUpgradeDowngrade(sym)
        ])
        
        const { consensus, score } = calculateConsensus(ratings)
        
        const analystData: AnalystData = {
          symbol: sym,
          ratings,
          recommendations,
          consensus,
          consensusScore: score,
          priceTarget: {
            current: null,
            high: priceTarget?.high || 0,
            low: priceTarget?.low || 0,
            mean: priceTarget?.mean || 0
          },
          recentActivity: generateRecentActivity(recommendations)
        }
        
        // Cache the result
        setCachedData(sym, analystData)
        
        return analystData
      })
    )
    
    return NextResponse.json({
      data: symbolList.length === 1 ? results[0] : results,
      sources: {
        finnhub: !!FINNHUB_KEY,
        tradier: !!TRADIER_KEY
      }
    })
  } catch (err) {
    console.error('[Analyst API] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch analyst data' }, { status: 500 })
  }
}
