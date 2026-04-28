import { NextResponse } from 'next/server'

const POLYGON_KEY = process.env.POLYGON_API_KEY
const INTRINIO_KEY = process.env.INTRINIO_API_KEY

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

// Fetch fundamentals from Intrinio (more comprehensive)
async function fetchIntrinioFundamentals(ticker: string): Promise<Partial<FundamentalMetrics> | null> {
  if (!INTRINIO_KEY) return null

  try {
    const tags = [
      'pricetoearnings', 'pricetobook', 'pricetosales', 'basiceps', 'dilutedeps',
      'totalrevenue', 'grossmargin', 'operatingmargin', 'netmargin',
      'roe', 'roa', 'debttoequity', 'currentratio', 'marketcap'
    ]
    
    const tagList = tags.join(',')
    const res = await fetch(
      `https://api-v2.intrinio.com/companies/${ticker}/data_point/${tagList}?api_key=${INTRINIO_KEY}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) return null

    const data = await res.json()
    const values: Record<string, number> = {}
    
    if (Array.isArray(data)) {
      data.forEach((item: { tag: string; value: number }) => {
        values[item.tag] = item.value
      })
    }

    // Also fetch company profile for employees/sector
    const companyRes = await fetch(
      `https://api-v2.intrinio.com/companies/${ticker}?api_key=${INTRINIO_KEY}`,
      { next: { revalidate: 3600 } }
    )
    
    const company = companyRes.ok ? await companyRes.json() : null

    return {
      pe: values.pricetoearnings ?? null,
      ps: values.pricetosales ?? null,
      pb: values.pricetobook ?? null,
      eps: values.basiceps ?? values.dilutedeps ?? null,
      revenue: values.totalrevenue ?? null,
      revenuePerShare: null,
      grossMargin: values.grossmargin ? values.grossmargin * 100 : null,
      operatingMargin: values.operatingmargin ? values.operatingmargin * 100 : null,
      netMargin: values.netmargin ? values.netmargin * 100 : null,
      roe: values.roe ? values.roe * 100 : null,
      roa: values.roa ? values.roa * 100 : null,
      debtToEquity: values.debttoequity ?? null,
      currentRatio: values.currentratio ?? null,
      marketCap: values.marketcap ?? null,
      employees: company?.employees ?? null,
      sector: company?.sector ?? null,
      industry: company?.industry_category ?? null,
    }
  } catch (err) {
    console.error('[Fundamentals] Intrinio error:', err)
    return null
  }
}

// Fetch fundamentals from Polygon (basic)
async function fetchPolygonFundamentals(ticker: string): Promise<Partial<FundamentalMetrics> | null> {
  if (!POLYGON_KEY) return null

  try {
    const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    
    if (!res.ok) return null

    const data = await res.json()
    const t = data.results

    return {
      pe: t?.market_cap && t?.eps ? (t.market_cap / t.eps) : null,
      ps: t?.market_cap && t?.annual_revenue ? (t.market_cap / t.annual_revenue) : null,
      pb: null,
      eps: t?.eps ?? null,
      revenue: t?.annual_revenue ?? null,
      revenuePerShare: t?.annual_revenue && t?.weighted_shares_outstanding ? (t.annual_revenue / t.weighted_shares_outstanding) : null,
      grossMargin: null,
      operatingMargin: null,
      netMargin: null,
      roe: null,
      roa: null,
      debtToEquity: null,
      currentRatio: null,
      marketCap: t?.market_cap ?? null,
      employees: t?.total_employees ?? null,
      sector: t?.sic_description ?? null,
      industry: null,
    }
  } catch (err) {
    console.error('[Fundamentals] Polygon error:', err)
    return null
  }
}

async function fetchFundamentals(ticker: string): Promise<{ data: FundamentalMetrics; source: string }> {
  // Try Intrinio first (more comprehensive), then Polygon, then mock
  const intrinio = await fetchIntrinioFundamentals(ticker)
  if (intrinio && Object.values(intrinio).some(v => v !== null)) {
    const mock = MOCK_FUNDAMENTALS[ticker] || MOCK_FUNDAMENTALS.AAPL
    return {
      data: { ...mock, ...intrinio } as FundamentalMetrics,
      source: 'intrinio'
    }
  }

  const polygon = await fetchPolygonFundamentals(ticker)
  if (polygon && Object.values(polygon).some(v => v !== null)) {
    const mock = MOCK_FUNDAMENTALS[ticker] || MOCK_FUNDAMENTALS.AAPL
    return {
      data: { ...mock, ...polygon } as FundamentalMetrics,
      source: 'polygon'
    }
  }

  return {
    data: MOCK_FUNDAMENTALS[ticker] || MOCK_FUNDAMENTALS.AAPL,
    source: 'mock'
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

    const { data, source } = await fetchFundamentals(ticker)

    return NextResponse.json({
      ticker,
      fundamentals: data,
      source,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fundamentals' },
      { status: 500 }
    )
  }
}
