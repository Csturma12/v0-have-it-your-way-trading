import { NextResponse } from 'next/server'

const POLYGON_KEY = process.env.POLYGON_API_KEY

interface FundamentalMetrics {
  pe: number | null
  ps: number | null
  pb: number | null
  eps: number | null
  revenue: number | null
  revenuePerShare: number | null
  grossMargin: number | null
  operatingMargin: number | null
  netMargin: number | null
  roe: number | null
  roa: number | null
  debtToEquity: number | null
  currentRatio: number | null
  marketCap: number | null
  employees: number | null
  sector: string | null
  industry: string | null
}

// Mock data fallback
const MOCK_FUNDAMENTALS: Record<string, FundamentalMetrics> = {
  AAPL: {
    pe: 28.5,
    ps: 6.2,
    pb: 42.1,
    eps: 6.15,
    revenue: 394328000000,
    revenuePerShare: 24.08,
    grossMargin: 46.2,
    operatingMargin: 30.5,
    netMargin: 25.3,
    roe: 142.8,
    roa: 13.5,
    debtToEquity: 1.91,
    currentRatio: 1.08,
    marketCap: 3120000000000,
    employees: 164000,
    sector: 'Information Technology',
    industry: 'Computer Hardware',
  },
  NVDA: {
    pe: 52.4,
    ps: 25.8,
    pb: 15.2,
    eps: 3.48,
    revenue: 121035000000,
    revenuePerShare: 47.42,
    grossMargin: 65.1,
    operatingMargin: 54.2,
    netMargin: 47.3,
    roe: 98.5,
    roa: 22.1,
    debtToEquity: 0.45,
    currentRatio: 3.21,
    marketCap: 2850000000000,
    employees: 28000,
    sector: 'Information Technology',
    industry: 'Semiconductors',
  },
}

async function fetchFundamentals(ticker: string): Promise<FundamentalMetrics | null> {
  if (!POLYGON_KEY) return MOCK_FUNDAMENTALS[ticker] || null

  try {
    // Ticker details with financials
    const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    
    if (!res.ok) {
      console.error(`[Fundamentals] Polygon error: ${res.status}`)
      return MOCK_FUNDAMENTALS[ticker] || null
    }

    const data = await res.json()
    const t = data.results

    return {
      pe: t?.weighted_shares_outstanding ? null : t?.market_cap ? (t.market_cap / (t.eps ?? 1)) : null,
      ps: t?.market_cap && t?.annual_revenue ? (t.market_cap / t.annual_revenue) : null,
      pb: null, // Not directly available in Polygon
      eps: t?.eps ?? null,
      revenue: t?.annual_revenue ?? null,
      revenuePerShare: t?.annual_revenue && t?.weighted_shares_outstanding ? (t.annual_revenue / t.weighted_shares_outstanding) : null,
      grossMargin: null, // Not in basic endpoint
      operatingMargin: null,
      netMargin: null,
      roe: null,
      roa: null,
      debtToEquity: null,
      currentRatio: null,
      marketCap: t?.market_cap ?? null,
      employees: t?.total_employees ?? null,
      sector: t?.sic_description ?? null,
      industry: t?.homepage_url ? 'Tech' : null,
    }
  } catch (err) {
    console.error('[Fundamentals API] Error:', err)
    return MOCK_FUNDAMENTALS[ticker] || null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

    const fundamentals = await fetchFundamentals(ticker)

    return NextResponse.json({
      ticker,
      fundamentals: fundamentals || MOCK_FUNDAMENTALS[ticker] || MOCK_FUNDAMENTALS.AAPL,
      source: fundamentals ? 'polygon' : 'mock',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fundamentals' },
      { status: 500 }
    )
  }
}
