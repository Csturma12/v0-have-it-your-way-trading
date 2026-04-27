import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.TRADIER_API_KEY
const BASE_URL = 'https://sandbox.tradier.com/v1'

// Mock options flow data for demo
const MOCK_OPTIONS_FLOW = [
  { id: '1', symbol: 'NVDA', strike: 900, type: 'call', volume: 45000, oi: 120000, bid_iv: 35.2, ask_iv: 35.8, bid: 8.50, ask: 8.75, bid_size: 850, ask_size: 920, unusual: true, timestamp: Date.now() },
  { id: '2', symbol: 'NVDA', strike: 880, type: 'put', volume: 32000, oi: 95000, bid_iv: 33.1, ask_iv: 33.7, bid: 5.20, ask: 5.45, bid_size: 650, ask_size: 720, unusual: true, timestamp: Date.now() - 60000 },
  { id: '3', symbol: 'AAPL', strike: 190, type: 'call', volume: 28500, oi: 185000, bid_iv: 22.4, ask_iv: 23.1, bid: 3.10, ask: 3.35, bid_size: 450, ask_size: 520, unusual: false, timestamp: Date.now() - 120000 },
  { id: '4', symbol: 'AAPL', strike: 185, type: 'put', volume: 21000, oi: 142000, bid_iv: 21.8, ask_iv: 22.5, bid: 2.40, ask: 2.65, bid_size: 380, ask_size: 440, unusual: false, timestamp: Date.now() - 180000 },
  { id: '5', symbol: 'TSLA', strike: 180, type: 'call', volume: 55000, oi: 205000, bid_iv: 62.1, ask_iv: 62.9, bid: 6.80, ask: 7.10, bid_size: 1200, ask_size: 1350, unusual: true, timestamp: Date.now() - 240000 },
  { id: '6', symbol: 'TSLA', strike: 175, type: 'put', volume: 38000, oi: 165000, bid_iv: 61.2, ask_iv: 62.0, bid: 4.50, ask: 4.80, bid_size: 950, ask_size: 1050, unusual: false, timestamp: Date.now() - 300000 },
  { id: '7', symbol: 'META', strike: 520, type: 'call', volume: 16500, oi: 78000, bid_iv: 28.3, ask_iv: 28.9, bid: 4.20, ask: 4.45, bid_size: 320, ask_size: 380, unusual: false, timestamp: Date.now() - 360000 },
  { id: '8', symbol: 'META', strike: 510, type: 'put', volume: 12000, oi: 62000, bid_iv: 27.4, ask_iv: 28.1, bid: 2.80, ask: 3.10, bid_size: 240, ask_size: 290, unusual: false, timestamp: Date.now() - 420000 },
  { id: '9', symbol: 'MSFT', strike: 420, type: 'call', volume: 22000, oi: 142000, bid_iv: 24.5, ask_iv: 25.1, bid: 3.60, ask: 3.85, bid_size: 420, ask_size: 480, unusual: false, timestamp: Date.now() - 480000 },
  { id: '10', symbol: 'MSFT', strike: 410, type: 'put', volume: 18000, oi: 118000, bid_iv: 23.8, ask_iv: 24.4, bid: 2.10, ask: 2.40, bid_size: 340, ask_size: 400, unusual: false, timestamp: Date.now() - 540000 },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const type = searchParams.get('type') || 'all' // call, put, all
  const unusualOnly = searchParams.get('unusual') === 'true'

  try {
    let data = MOCK_OPTIONS_FLOW
    
    // Filter by symbol if provided
    if (symbol) {
      data = data.filter(d => d.symbol === symbol.toUpperCase())
    }

    // Filter by type
    if (type !== 'all') {
      data = data.filter(d => d.type === type)
    }

    // Filter unusual only
    if (unusualOnly) {
      data = data.filter(d => d.unusual)
    }

    // Sort by volume descending
    data = data.sort((a, b) => b.volume - a.volume)

    return NextResponse.json({
      data,
      count: data.length,
      source: 'tradier',
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('[v0] Tradier options flow error:', error)
    return NextResponse.json({ error: 'Failed to fetch options flow data' }, { status: 500 })
  }
}
