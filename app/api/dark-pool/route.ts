import { NextRequest, NextResponse } from 'next/server'

const UW_API_KEY = process.env.UNUSUAL_WHALES_API_KEY

interface DarkPoolTrade {
  id: string
  ticker: string
  price: number
  size: number
  value: number
  exchange: string
  timestamp: number
  side: 'buy' | 'sell' | 'unknown'
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

interface OptionsFlow {
  id: string
  ticker: string
  strike: number
  expiry: string
  type: 'call' | 'put'
  premium: number
  size: number
  openInterest: number
  volume: number
  side: 'buy' | 'sell'
  sentiment: 'bullish' | 'bearish'
  timestamp: number
  unusual: boolean
}

// Mock data for when API is unavailable
const MOCK_DARK_POOL: DarkPoolTrade[] = [
  { id: '1', ticker: 'NVDA', price: 924.50, size: 125000, value: 115562500, exchange: 'FINRA', timestamp: Date.now() - 120000, side: 'buy', sentiment: 'bullish' },
  { id: '2', ticker: 'AAPL', price: 182.30, size: 450000, value: 82035000, exchange: 'FINRA', timestamp: Date.now() - 240000, side: 'sell', sentiment: 'bearish' },
  { id: '3', ticker: 'MSFT', price: 415.20, size: 85000, value: 35292000, exchange: 'IEX', timestamp: Date.now() - 360000, side: 'buy', sentiment: 'bullish' },
  { id: '4', ticker: 'TSLA', price: 178.40, size: 320000, value: 57088000, exchange: 'FINRA', timestamp: Date.now() - 480000, side: 'sell', sentiment: 'bearish' },
  { id: '5', ticker: 'AMD', price: 162.80, size: 180000, value: 29304000, exchange: 'EDGX', timestamp: Date.now() - 600000, side: 'buy', sentiment: 'bullish' },
  { id: '6', ticker: 'META', price: 514.60, size: 62000, value: 31905200, exchange: 'FINRA', timestamp: Date.now() - 720000, side: 'buy', sentiment: 'bullish' },
  { id: '7', ticker: 'GOOGL', price: 175.40, size: 210000, value: 36834000, exchange: 'IEX', timestamp: Date.now() - 840000, side: 'unknown', sentiment: 'neutral' },
  { id: '8', ticker: 'AMZN', price: 189.20, size: 145000, value: 27434000, exchange: 'FINRA', timestamp: Date.now() - 960000, side: 'buy', sentiment: 'bullish' },
  { id: '9', ticker: 'SPY', price: 542.80, size: 520000, value: 282256000, exchange: 'FINRA', timestamp: Date.now() - 1080000, side: 'sell', sentiment: 'bearish' },
  { id: '10', ticker: 'QQQ', price: 482.10, size: 280000, value: 134988000, exchange: 'EDGX', timestamp: Date.now() - 1200000, side: 'buy', sentiment: 'bullish' },
  { id: '11', ticker: 'LLY', price: 804.20, size: 38000, value: 30559600, exchange: 'FINRA', timestamp: Date.now() - 1320000, side: 'buy', sentiment: 'bullish' },
  { id: '12', ticker: 'PLTR', price: 24.80, size: 890000, value: 22072000, exchange: 'IEX', timestamp: Date.now() - 1440000, side: 'buy', sentiment: 'bullish' },
]

const MOCK_OPTIONS_FLOW: OptionsFlow[] = [
  { id: '1', ticker: 'NVDA', strike: 950, expiry: '2024-02-16', type: 'call', premium: 2450000, size: 1200, openInterest: 8500, volume: 4200, side: 'buy', sentiment: 'bullish', timestamp: Date.now() - 180000, unusual: true },
  { id: '2', ticker: 'SPY', strike: 530, expiry: '2024-02-09', type: 'put', premium: 1850000, size: 3500, openInterest: 45000, volume: 12000, side: 'buy', sentiment: 'bearish', timestamp: Date.now() - 300000, unusual: true },
  { id: '3', ticker: 'AAPL', strike: 190, expiry: '2024-03-15', type: 'call', premium: 980000, size: 2800, openInterest: 22000, volume: 8500, side: 'buy', sentiment: 'bullish', timestamp: Date.now() - 420000, unusual: false },
  { id: '4', ticker: 'TSLA', strike: 170, expiry: '2024-02-16', type: 'put', premium: 1200000, size: 1800, openInterest: 15000, volume: 6200, side: 'buy', sentiment: 'bearish', timestamp: Date.now() - 540000, unusual: true },
  { id: '5', ticker: 'AMD', strike: 175, expiry: '2024-02-23', type: 'call', premium: 720000, size: 950, openInterest: 12000, volume: 3800, side: 'buy', sentiment: 'bullish', timestamp: Date.now() - 660000, unusual: false },
  { id: '6', ticker: 'META', strike: 520, expiry: '2024-02-16', type: 'call', premium: 1650000, size: 680, openInterest: 5200, volume: 2100, side: 'buy', sentiment: 'bullish', timestamp: Date.now() - 780000, unusual: true },
  { id: '7', ticker: 'MSFT', strike: 420, expiry: '2024-03-15', type: 'call', premium: 890000, size: 420, openInterest: 8800, volume: 1500, side: 'buy', sentiment: 'bullish', timestamp: Date.now() - 900000, unusual: false },
  { id: '8', ticker: 'QQQ', strike: 470, expiry: '2024-02-09', type: 'put', premium: 2100000, size: 4200, openInterest: 38000, volume: 15000, side: 'buy', sentiment: 'bearish', timestamp: Date.now() - 1020000, unusual: true },
]

async function fetchUnusualWhales(endpoint: string) {
  if (!UW_API_KEY) return null
  
  try {
    const res = await fetch(`https://api.unusualwhales.com/api/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${UW_API_KEY}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 60 },
    })
    
    if (!res.ok) throw new Error(`UW API error: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('[Dark Pool API] Unusual Whales error:', err)
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'darkpool' // 'darkpool', 'options', 'blocks'
  const ticker = searchParams.get('ticker') || undefined
  
  // Try real API first
  if (UW_API_KEY) {
    if (type === 'darkpool') {
      const data = await fetchUnusualWhales('darkpool/recent')
      if (data?.data) {
        return NextResponse.json({
          trades: data.data,
          source: 'unusual_whales',
        })
      }
    }
    
    if (type === 'options') {
      const data = await fetchUnusualWhales('stock/flow/recent')
      if (data?.data) {
        return NextResponse.json({
          flow: data.data,
          source: 'unusual_whales',
        })
      }
    }
  }
  
  // Fallback to mock data
  if (type === 'darkpool') {
    let trades = MOCK_DARK_POOL
    if (ticker) {
      trades = trades.filter(t => t.ticker === ticker.toUpperCase())
    }
    return NextResponse.json({
      trades,
      source: 'mock',
    })
  }
  
  if (type === 'options') {
    let flow = MOCK_OPTIONS_FLOW
    if (ticker) {
      flow = flow.filter(f => f.ticker === ticker.toUpperCase())
    }
    return NextResponse.json({
      flow,
      source: 'mock',
    })
  }
  
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
