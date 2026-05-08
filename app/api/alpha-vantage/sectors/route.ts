import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY
const UW_API_KEY = process.env.UNUSUAL_WHALES_API_KEY
const BASE_URL = 'https://www.alphavantage.co/query'
const UW_BASE = 'https://api.unusualwhales.com/api'

// Mock sector performance data
const MOCK_SECTORS = {
  realTimePerformance: [
    { sector: 'Information Technology', performance: 2.34 },
    { sector: 'Communication Services', performance: 1.87 },
    { sector: 'Consumer Discretionary', performance: 1.45 },
    { sector: 'Health Care', performance: 0.92 },
    { sector: 'Financials', performance: 0.78 },
    { sector: 'Industrials', performance: 0.54 },
    { sector: 'Consumer Staples', performance: 0.32 },
    { sector: 'Materials', performance: -0.21 },
    { sector: 'Real Estate', performance: -0.45 },
    { sector: 'Utilities', performance: -0.68 },
    { sector: 'Energy', performance: -1.12 },
  ],
  daily: [
    { sector: 'Information Technology', performance: 1.82 },
    { sector: 'Communication Services', performance: 1.54 },
    { sector: 'Consumer Discretionary', performance: 1.23 },
    { sector: 'Health Care', performance: 0.78 },
    { sector: 'Financials', performance: 0.65 },
    { sector: 'Industrials', performance: 0.42 },
    { sector: 'Consumer Staples', performance: 0.28 },
    { sector: 'Materials', performance: -0.15 },
    { sector: 'Real Estate', performance: -0.38 },
    { sector: 'Utilities', performance: -0.52 },
    { sector: 'Energy', performance: -0.89 },
  ],
  weekly: [
    { sector: 'Information Technology', performance: 4.56 },
    { sector: 'Communication Services', performance: 3.92 },
    { sector: 'Consumer Discretionary', performance: 3.21 },
    { sector: 'Health Care', performance: 2.15 },
    { sector: 'Financials', performance: 1.87 },
    { sector: 'Industrials', performance: 1.43 },
    { sector: 'Consumer Staples', performance: 0.98 },
    { sector: 'Materials', performance: 0.45 },
    { sector: 'Real Estate', performance: -0.32 },
    { sector: 'Utilities', performance: -0.78 },
    { sector: 'Energy', performance: -1.45 },
  ],
  monthly: [
    { sector: 'Information Technology', performance: 8.92 },
    { sector: 'Communication Services', performance: 7.34 },
    { sector: 'Consumer Discretionary', performance: 5.87 },
    { sector: 'Health Care', performance: 4.23 },
    { sector: 'Financials', performance: 3.56 },
    { sector: 'Industrials', performance: 2.89 },
    { sector: 'Consumer Staples', performance: 1.67 },
    { sector: 'Materials', performance: 0.92 },
    { sector: 'Real Estate', performance: -0.54 },
    { sector: 'Utilities', performance: -1.23 },
    { sector: 'Energy', performance: -2.78 },
  ],
}

const MOCK_GAINERS_LOSERS = {
  topGainers: [
    { ticker: 'SMCI', price: 892.50, change: 15.23, changePercent: 12.45, volume: 18500000 },
    { ticker: 'NVDA', price: 875.20, change: 42.80, changePercent: 5.14, volume: 52000000 },
    { ticker: 'AMD', price: 165.40, change: 7.30, changePercent: 4.62, volume: 28000000 },
    { ticker: 'AVGO', price: 1320.50, change: 48.90, changePercent: 3.85, volume: 8500000 },
    { ticker: 'MRVL', price: 72.80, change: 2.45, changePercent: 3.48, volume: 12000000 },
  ],
  topLosers: [
    { ticker: 'INTC', price: 31.20, change: -2.15, changePercent: -6.45, volume: 45000000 },
    { ticker: 'BA', price: 178.50, change: -9.80, changePercent: -5.21, volume: 15000000 },
    { ticker: 'DIS', price: 92.30, change: -4.20, changePercent: -4.35, volume: 18000000 },
    { ticker: 'PFE', price: 26.80, change: -1.10, changePercent: -3.94, volume: 32000000 },
    { ticker: 'KO', price: 58.90, change: -2.05, changePercent: -3.36, volume: 14000000 },
  ],
  mostActive: [
    { ticker: 'TSLA', price: 178.90, change: 5.40, changePercent: 3.11, volume: 125000000 },
    { ticker: 'NVDA', price: 875.20, change: 42.80, changePercent: 5.14, volume: 52000000 },
    { ticker: 'AAPL', price: 189.50, change: 2.30, changePercent: 1.23, volume: 48000000 },
    { ticker: 'INTC', price: 31.20, change: -2.15, changePercent: -6.45, volume: 45000000 },
    { ticker: 'AMD', price: 165.40, change: 7.30, changePercent: 4.62, volume: 28000000 },
  ],
}

// Try UW sector-tide first — gives real-time sector flow data
async function fetchUWSectorTide() {
  if (!UW_API_KEY) return null
  try {
    const res = await fetch(`${UW_BASE}/sector-tide`, {
      headers: { Authorization: `Bearer ${UW_API_KEY}`, Accept: 'application/json' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    // UW returns array of { sector, call_premium, put_premium, net_premium, ... }
    const sectors = data?.data || []
    if (!sectors.length) return null

    // Convert UW format to our format — use net_premium as performance proxy
    const sorted = [...sectors].sort((a: any, b: any) =>
      parseFloat(b.net_premium || 0) - parseFloat(a.net_premium || 0)
    )
    const realTime = sorted.map((s: any) => ({
      sector: s.sector || s.name || 'Unknown',
      performance: parseFloat(s.net_premium_change_pct || s.net_premium || 0),
    }))
    return {
      realTimePerformance: realTime,
      daily: realTime, // UW only gives current snapshot
      weekly: realTime,
      monthly: realTime,
      source: 'uw',
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'sectors' // sectors, gainers, losers, active

  let source = 'mock'

  // Try UW first for sector data (real-time flow-based)
  if (type === 'sectors' && UW_API_KEY) {
    const uwData = await fetchUWSectorTide()
    if (uwData) {
      return NextResponse.json({
        ...uwData,
        timestamp: Date.now(),
      })
    }
  }

  if (!API_KEY) {
    console.warn('[Alpha Vantage] ALPHA_VANTAGE_API_KEY env var is not set — returning sample data.')
  }

  if (API_KEY && type === 'sectors') {
    try {
      const res = await fetch(`${BASE_URL}?function=SECTOR&apikey=${API_KEY}`, {
        next: { revalidate: 300 },
      })

      if (!res.ok) {
        console.error(`[Alpha Vantage] SECTOR HTTP ${res.status} ${res.statusText} — returning sample data.`)
      } else {
        const data = await res.json()

        // Alpha Vantage uses these keys for known issues:
        //  - "Note":        rate-limited (5/min, 500/day on free tier)
        //  - "Information": premium endpoint / deprecated / paid tier required
        //  - "Error Message": invalid key / bad params
        if (data?.Note) {
          console.warn('[Alpha Vantage] SECTOR rate-limited:', data.Note)
        } else if (data?.Information) {
          console.warn('[Alpha Vantage] SECTOR endpoint message (likely deprecated or premium-only):', data.Information)
        } else if (data?.['Error Message']) {
          console.error('[Alpha Vantage] SECTOR error:', data['Error Message'])
        } else if (data?.['Rank A: Real-Time Performance']) {
          const parseSector = (obj: Record<string, string>) =>
            Object.entries(obj).map(([sector, perf]) => ({
              sector,
              performance: parseFloat(perf.replace('%', '')),
            })).sort((a, b) => b.performance - a.performance)

          return NextResponse.json({
            realTimePerformance: parseSector(data['Rank A: Real-Time Performance']),
            daily: parseSector(data['Rank B: 1 Day Performance'] || {}),
            weekly: parseSector(data['Rank C: 5 Day Performance'] || {}),
            monthly: parseSector(data['Rank D: 1 Month Performance'] || {}),
            quarterly: parseSector(data['Rank E: 3 Month Performance'] || {}),
            yearly: parseSector(data['Rank G: 1 Year Performance'] || {}),
            source: 'alpha_vantage',
            timestamp: Date.now(),
          })
        } else {
          // Unknown shape — log the top-level keys so we can see what came back
          console.warn('[Alpha Vantage] SECTOR returned unexpected shape. Top-level keys:', Object.keys(data || {}))
        }
      }
    } catch (err) {
      console.error('[Alpha Vantage] Sectors fetch threw:', err)
    }
  }

  if (API_KEY && (type === 'gainers' || type === 'losers' || type === 'active')) {
    try {
      const res = await fetch(`${BASE_URL}?function=TOP_GAINERS_LOSERS&apikey=${API_KEY}`, {
        next: { revalidate: 60 },
      })

      if (res.ok) {
        const data = await res.json()
        
        const parseList = (list: any[]) => list?.slice(0, 10).map(item => ({
          ticker: item.ticker,
          price: parseFloat(item.price),
          change: parseFloat(item.change_amount),
          changePercent: parseFloat(item.change_percentage.replace('%', '')),
          volume: parseInt(item.volume),
        })) || []

        return NextResponse.json({
          topGainers: parseList(data.top_gainers),
          topLosers: parseList(data.top_losers),
          mostActive: parseList(data.most_actively_traded),
          source: 'alpha_vantage',
          timestamp: Date.now(),
        })
      }
    } catch (err) {
      console.error('[Alpha Vantage] Gainers/Losers error:', err)
    }
  }

  // Return mock data
  if (type === 'sectors') {
    return NextResponse.json({
      ...MOCK_SECTORS,
      source,
      timestamp: Date.now(),
    })
  }

  return NextResponse.json({
    ...MOCK_GAINERS_LOSERS,
    source,
    timestamp: Date.now(),
  })
}
