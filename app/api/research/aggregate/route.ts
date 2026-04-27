import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface AggregatedResearch {
  ticker: string
  price: {
    current: number | null
    change: number | null
    changePct: number | null
    prevClose: number | null
    week52High: number | null
    week52Low: number | null
  }
  darkPool: {
    recentTrades: number
    totalValue: number
    sentiment: 'bullish' | 'bearish' | 'neutral'
    largestTrade: number | null
  }
  optionsFlow: {
    totalPremium: number
    callPutRatio: number
    unusualActivity: boolean
    sentiment: 'bullish' | 'bearish' | 'neutral'
  }
  insiderActivity: {
    recentTrades: number
    netDirection: 'buying' | 'selling' | 'mixed' | 'none'
    totalValue: number
  }
  news: {
    count: number
    sentiment: 'bullish' | 'bearish' | 'neutral'
    latestHeadline: string | null
  }
  overallSentiment: {
    score: number // -100 to 100
    label: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish'
    signals: string[]
  }
}

// Fetch price data from Polygon
async function fetchPriceData(ticker: string) {
  try {
    const [quoteRes, detailsRes] = await Promise.all([
      fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/polygon/batch-quotes?tickers=${ticker}`),
      fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/polygon/details?ticker=${ticker}`)
    ])
    
    const quoteData = quoteRes.ok ? await quoteRes.json() : null
    const detailsData = detailsRes.ok ? await detailsRes.json() : null
    
    const quote = quoteData?.quotes?.[ticker]
    
    return {
      current: quote?.price ?? null,
      change: quote?.change ?? null,
      changePct: quote?.changePct ?? null,
      prevClose: detailsData?.prevClose ?? null,
      week52High: detailsData?.week52High ?? null,
      week52Low: detailsData?.week52Low ?? null,
    }
  } catch (err) {
    console.error(`[Aggregate] Price fetch error for ${ticker}:`, err)
    return { current: null, change: null, changePct: null, prevClose: null, week52High: null, week52Low: null }
  }
}

// Fetch dark pool data from Unusual Whales
async function fetchDarkPoolData(ticker: string) {
  try {
    const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/dark-pool?type=darkpool&ticker=${ticker}`)
    if (!res.ok) return { recentTrades: 0, totalValue: 0, sentiment: 'neutral' as const, largestTrade: null }
    
    const data = await res.json()
    const trades = data.trades || []
    
    const totalValue = trades.reduce((sum: number, t: { value?: number }) => sum + (t.value || 0), 0)
    const buyCount = trades.filter((t: { side?: string }) => t.side === 'buy').length
    const sellCount = trades.filter((t: { side?: string }) => t.side === 'sell').length
    const largestTrade = trades.length > 0 ? Math.max(...trades.map((t: { value?: number }) => t.value || 0)) : null
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (buyCount > sellCount * 1.5) sentiment = 'bullish'
    else if (sellCount > buyCount * 1.5) sentiment = 'bearish'
    
    return { recentTrades: trades.length, totalValue, sentiment, largestTrade }
  } catch (err) {
    console.error(`[Aggregate] Dark pool fetch error for ${ticker}:`, err)
    return { recentTrades: 0, totalValue: 0, sentiment: 'neutral' as const, largestTrade: null }
  }
}

// Fetch options flow data
async function fetchOptionsFlowData(ticker: string) {
  try {
    const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/unusual-whales?type=options&ticker=${ticker}`)
    if (!res.ok) return { totalPremium: 0, callPutRatio: 1, unusualActivity: false, sentiment: 'neutral' as const }
    
    const data = await res.json()
    const flow = data.data || []
    
    const totalPremium = flow.reduce((sum: number, f: { premium?: number }) => sum + (f.premium || 0), 0)
    const calls = flow.filter((f: { type?: string }) => f.type === 'call').length
    const puts = flow.filter((f: { type?: string }) => f.type === 'put').length
    const callPutRatio = puts > 0 ? calls / puts : calls > 0 ? 10 : 1
    const unusualActivity = flow.some((f: { unusual?: boolean }) => f.unusual === true)
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (callPutRatio > 1.5) sentiment = 'bullish'
    else if (callPutRatio < 0.67) sentiment = 'bearish'
    
    return { totalPremium, callPutRatio, unusualActivity, sentiment }
  } catch (err) {
    console.error(`[Aggregate] Options flow fetch error for ${ticker}:`, err)
    return { totalPremium: 0, callPutRatio: 1, unusualActivity: false, sentiment: 'neutral' as const }
  }
}

// Fetch insider trading data
async function fetchInsiderData(ticker: string) {
  try {
    const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/unusual-whales?type=insider&ticker=${ticker}`)
    if (!res.ok) return { recentTrades: 0, netDirection: 'none' as const, totalValue: 0 }
    
    const data = await res.json()
    const trades = data.data || []
    
    const buys = trades.filter((t: { transaction_type?: string }) => t.transaction_type?.toLowerCase().includes('buy') || t.transaction_type?.toLowerCase().includes('purchase'))
    const sells = trades.filter((t: { transaction_type?: string }) => t.transaction_type?.toLowerCase().includes('sell') || t.transaction_type?.toLowerCase().includes('sale'))
    const totalValue = trades.reduce((sum: number, t: { value?: number }) => sum + Math.abs(t.value || 0), 0)
    
    let netDirection: 'buying' | 'selling' | 'mixed' | 'none' = 'none'
    if (buys.length > 0 && sells.length === 0) netDirection = 'buying'
    else if (sells.length > 0 && buys.length === 0) netDirection = 'selling'
    else if (buys.length > 0 || sells.length > 0) netDirection = 'mixed'
    
    return { recentTrades: trades.length, netDirection, totalValue }
  } catch (err) {
    console.error(`[Aggregate] Insider fetch error for ${ticker}:`, err)
    return { recentTrades: 0, netDirection: 'none' as const, totalValue: 0 }
  }
}

// Fetch news sentiment
async function fetchNewsData(ticker: string) {
  try {
    const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/news?ticker=${ticker}`)
    if (!res.ok) return { count: 0, sentiment: 'neutral' as const, latestHeadline: null }
    
    const data = await res.json()
    const news = data.news || []
    
    const bullish = news.filter((n: { sentiment?: string }) => n.sentiment === 'bullish').length
    const bearish = news.filter((n: { sentiment?: string }) => n.sentiment === 'bearish').length
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (bullish > bearish * 1.5) sentiment = 'bullish'
    else if (bearish > bullish * 1.5) sentiment = 'bearish'
    
    return {
      count: news.length,
      sentiment,
      latestHeadline: news[0]?.headline || null
    }
  } catch (err) {
    console.error(`[Aggregate] News fetch error for ${ticker}:`, err)
    return { count: 0, sentiment: 'neutral' as const, latestHeadline: null }
  }
}

// Calculate overall sentiment score
function calculateOverallSentiment(
  darkPool: AggregatedResearch['darkPool'],
  optionsFlow: AggregatedResearch['optionsFlow'],
  insider: AggregatedResearch['insiderActivity'],
  news: AggregatedResearch['news']
): AggregatedResearch['overallSentiment'] {
  let score = 0
  const signals: string[] = []
  
  // Dark pool sentiment (+/- 25 points)
  if (darkPool.sentiment === 'bullish') { score += 25; signals.push('Dark pool buying') }
  else if (darkPool.sentiment === 'bearish') { score -= 25; signals.push('Dark pool selling') }
  
  // Options flow sentiment (+/- 25 points)
  if (optionsFlow.sentiment === 'bullish') { score += 25; signals.push('Bullish options flow') }
  else if (optionsFlow.sentiment === 'bearish') { score -= 25; signals.push('Bearish options flow') }
  if (optionsFlow.unusualActivity) { score += 10; signals.push('Unusual options activity') }
  
  // Insider activity (+/- 25 points)
  if (insider.netDirection === 'buying') { score += 25; signals.push('Insider buying') }
  else if (insider.netDirection === 'selling') { score -= 25; signals.push('Insider selling') }
  
  // News sentiment (+/- 25 points)
  if (news.sentiment === 'bullish') { score += 25; signals.push('Positive news sentiment') }
  else if (news.sentiment === 'bearish') { score -= 25; signals.push('Negative news sentiment') }
  
  // Clamp score
  score = Math.max(-100, Math.min(100, score))
  
  let label: AggregatedResearch['overallSentiment']['label']
  if (score >= 50) label = 'strong_bullish'
  else if (score >= 20) label = 'bullish'
  else if (score <= -50) label = 'strong_bearish'
  else if (score <= -20) label = 'bearish'
  else label = 'neutral'
  
  return { score, label, signals }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tickersParam = searchParams.get('tickers')
  
  if (!tickersParam) {
    return NextResponse.json({ error: 'tickers parameter required' }, { status: 400 })
  }
  
  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
  
  if (tickers.length === 0) {
    return NextResponse.json({ error: 'No valid tickers provided' }, { status: 400 })
  }
  
  // Fetch all data in parallel for each ticker
  const results: Record<string, AggregatedResearch> = {}
  
  await Promise.all(tickers.map(async (ticker) => {
    const [price, darkPool, optionsFlow, insider, news] = await Promise.all([
      fetchPriceData(ticker),
      fetchDarkPoolData(ticker),
      fetchOptionsFlowData(ticker),
      fetchInsiderData(ticker),
      fetchNewsData(ticker),
    ])
    
    const overallSentiment = calculateOverallSentiment(darkPool, optionsFlow, insider, news)
    
    results[ticker] = {
      ticker,
      price,
      darkPool,
      optionsFlow,
      insiderActivity: insider,
      news,
      overallSentiment,
    }
  }))
  
  return NextResponse.json({
    research: results,
    tickers,
    timestamp: Date.now(),
  })
}
