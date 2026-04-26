import { NextRequest, NextResponse } from 'next/server'

const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const POLYGON_KEY = process.env.POLYGON_API_KEY

interface FinnhubNews {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

interface PolygonNews {
  id: string
  publisher: { name: string; homepage_url: string; logo_url: string }
  title: string
  author: string
  published_utc: string
  article_url: string
  tickers: string[]
  image_url: string
  description: string
  keywords: string[]
}

interface NormalizedNews {
  id: string
  headline: string
  summary: string
  source: string
  url: string
  image: string
  timestamp: number
  tickers: string[]
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

// Simple sentiment analysis based on keywords
function analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lowerText = text.toLowerCase()
  
  const bullishKeywords = [
    'surge', 'soar', 'jump', 'rally', 'gain', 'rise', 'climb', 'boost',
    'beat', 'exceed', 'outperform', 'upgrade', 'buy', 'bullish', 'record high',
    'breakout', 'momentum', 'growth', 'profit', 'revenue beat', 'strong',
    'positive', 'optimistic', 'expansion', 'partnership', 'acquisition'
  ]
  
  const bearishKeywords = [
    'fall', 'drop', 'decline', 'plunge', 'crash', 'sink', 'tumble', 'slide',
    'miss', 'disappoint', 'downgrade', 'sell', 'bearish', 'record low',
    'breakdown', 'weakness', 'loss', 'revenue miss', 'weak', 'negative',
    'pessimistic', 'contraction', 'layoff', 'lawsuit', 'investigation',
    'warning', 'cut', 'slash', 'concern', 'risk', 'fear'
  ]
  
  let bullishScore = 0
  let bearishScore = 0
  
  for (const keyword of bullishKeywords) {
    if (lowerText.includes(keyword)) bullishScore++
  }
  
  for (const keyword of bearishKeywords) {
    if (lowerText.includes(keyword)) bearishScore++
  }
  
  if (bullishScore > bearishScore + 1) return 'bullish'
  if (bearishScore > bullishScore + 1) return 'bearish'
  return 'neutral'
}

async function fetchFinnhubNews(ticker?: string): Promise<NormalizedNews[]> {
  if (!FINNHUB_KEY) return []
  
  try {
    let url: string
    if (ticker) {
      // Company news for specific ticker
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const to = new Date().toISOString().split('T')[0]
      url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
    } else {
      // General market news
      url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`
    }
    
    const res = await fetch(url, { next: { revalidate: 300 } }) // 5 min cache
    if (!res.ok) throw new Error(`Finnhub error: ${res.status}`)
    
    const data: FinnhubNews[] = await res.json()
    
    return data.slice(0, 20).map((item) => ({
      id: `finnhub-${item.id}`,
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      url: item.url,
      image: item.image,
      timestamp: item.datetime * 1000,
      tickers: item.related ? item.related.split(',').map(t => t.trim()).filter(Boolean) : [],
      sentiment: analyzeSentiment(item.headline + ' ' + item.summary),
    }))
  } catch (err) {
    console.error('[News API] Finnhub error:', err)
    return []
  }
}

async function fetchPolygonNews(ticker?: string): Promise<NormalizedNews[]> {
  if (!POLYGON_KEY) return []
  
  try {
    let url = `https://api.polygon.io/v2/reference/news?limit=20&apiKey=${POLYGON_KEY}`
    if (ticker) {
      url += `&ticker=${ticker}`
    }
    
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error(`Polygon error: ${res.status}`)
    
    const data = await res.json()
    const results: PolygonNews[] = data.results || []
    
    return results.map((item) => ({
      id: `polygon-${item.id}`,
      headline: item.title,
      summary: item.description || '',
      source: item.publisher?.name || 'Polygon',
      url: item.article_url,
      image: item.image_url || '',
      timestamp: new Date(item.published_utc).getTime(),
      tickers: item.tickers || [],
      sentiment: analyzeSentiment(item.title + ' ' + (item.description || '')),
    }))
  } catch (err) {
    console.error('[News API] Polygon error:', err)
    return []
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker') || undefined
  const source = searchParams.get('source') || 'all' // 'finnhub', 'polygon', 'all'
  
  let news: NormalizedNews[] = []
  
  if (source === 'finnhub' || source === 'all') {
    const finnhubNews = await fetchFinnhubNews(ticker)
    news = [...news, ...finnhubNews]
  }
  
  if (source === 'polygon' || source === 'all') {
    const polygonNews = await fetchPolygonNews(ticker)
    news = [...news, ...polygonNews]
  }
  
  // Dedupe by headline similarity and sort by timestamp
  const seen = new Set<string>()
  const dedupedNews = news.filter((item) => {
    const key = item.headline.toLowerCase().slice(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  
  dedupedNews.sort((a, b) => b.timestamp - a.timestamp)
  
  return NextResponse.json({
    news: dedupedNews.slice(0, 30),
    sources: {
      finnhub: !!FINNHUB_KEY,
      polygon: !!POLYGON_KEY,
    },
  })
}
