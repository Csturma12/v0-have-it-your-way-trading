import { NextResponse } from 'next/server'

const POLYGON_KEY = process.env.POLYGON_API_KEY
const FINNHUB_KEY = process.env.FINNHUB_API_KEY

interface FundamentalMetrics {
  pe: number | null
  ps: number | null
  pb: number | null
  eps: number | null
  revenue: number | null
  revenuePerShare: number | null
  revenueGrowth: number | null
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
  beta: number | null
  divYield: number | null
  high52w: number | null
  low52w: number | null
}

const EMPTY: FundamentalMetrics = {
  pe: null, ps: null, pb: null, eps: null, revenue: null, revenuePerShare: null,
  revenueGrowth: null, grossMargin: null, operatingMargin: null, netMargin: null,
  roe: null, roa: null, debtToEquity: null, currentRatio: null, marketCap: null,
  employees: null, sector: null, industry: null, beta: null, divYield: null,
  high52w: null, low52w: null,
}

// Finnhub /stock/metric returns 60+ ratios (PE, PB, PS, ROE, ROA, margins,
// beta, divYield, 52w hi/lo, EPS, etc) in a single call. This is the new
// primary source for rich fundamentals (replaces Intrinio).
async function fetchFinnhubFundamentals(ticker: string): Promise<Partial<FundamentalMetrics> | null> {
  if (!FINNHUB_KEY) return null
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_KEY}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const m = data?.metric || {}

    return {
      pe: m.peBasicExclExtraTTM ?? m.peNormalizedAnnual ?? m.peTTM ?? null,
      ps: m.psTTM ?? m.psAnnual ?? null,
      pb: m.pbAnnual ?? m.pbQuarterly ?? null,
      eps: m.epsBasicExclExtraItemsTTM ?? m.epsTTM ?? null,
      revenue: m.revenuePerShareTTM && m.sharesOutstanding ? m.revenuePerShareTTM * m.sharesOutstanding : null,
      revenuePerShare: m.revenuePerShareTTM ?? null,
      revenueGrowth: m.revenueGrowthTTMYoy ?? m.revenueGrowth5Y ?? null,
      grossMargin: m.grossMarginTTM ?? m.grossMarginAnnual ?? null,
      operatingMargin: m.operatingMarginTTM ?? m.operatingMarginAnnual ?? null,
      netMargin: m.netProfitMarginTTM ?? m.netProfitMarginAnnual ?? null,
      roe: m.roeTTM ?? m.roeRfy ?? null,
      roa: m.roaTTM ?? m.roaRfy ?? null,
      debtToEquity: m['totalDebt/totalEquityAnnual'] ?? m['totalDebt/totalEquityQuarterly'] ?? null,
      currentRatio: m.currentRatioAnnual ?? m.currentRatioQuarterly ?? null,
      marketCap: m.marketCapitalization ? m.marketCapitalization * 1_000_000 : null,
      beta: m.beta ?? null,
      divYield: m.dividendYieldIndicatedAnnual ?? null,
      high52w: m['52WeekHigh'] ?? null,
      low52w: m['52WeekLow'] ?? null,
    }
  } catch (err) {
    console.error('[Fundamentals] Finnhub error:', err)
    return null
  }
}

// Polygon basic fundamentals from /v3/reference/tickers (sector, market cap,
// employees, EPS, annual revenue). Used as a fallback / enrichment.
async function fetchPolygonFundamentals(ticker: string): Promise<Partial<FundamentalMetrics> | null> {
  if (!POLYGON_KEY) return null
  try {
    const res = await fetch(
      `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_KEY}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const t = data.results
    return {
      pe: t?.market_cap && t?.eps ? t.market_cap / t.eps : null,
      ps: t?.market_cap && t?.annual_revenue ? t.market_cap / t.annual_revenue : null,
      eps: t?.eps ?? null,
      revenue: t?.annual_revenue ?? null,
      revenuePerShare: t?.annual_revenue && t?.weighted_shares_outstanding
        ? t.annual_revenue / t.weighted_shares_outstanding : null,
      marketCap: t?.market_cap ?? null,
      employees: t?.total_employees ?? null,
      sector: t?.sic_description ?? null,
    }
  } catch (err) {
    console.error('[Fundamentals] Polygon error:', err)
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

    // Run both providers in parallel; merge with Finnhub winning on
    // overlapping fields since its metrics are TTM and more accurate.
    const [polygon, finnhub] = await Promise.all([
      fetchPolygonFundamentals(ticker),
      fetchFinnhubFundamentals(ticker),
    ])

    const merged: FundamentalMetrics = {
      ...EMPTY,
      ...(polygon || {}),
      ...(finnhub || {}),
    }

    // Decide source label for UI badge.
    const source = finnhub && Object.values(finnhub).some(v => v !== null)
      ? 'finnhub'
      : polygon && Object.values(polygon).some(v => v !== null)
        ? 'polygon'
        : 'unavailable'

    return NextResponse.json({
      ticker,
      fundamentals: merged,
      source,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fundamentals' },
      { status: 500 }
    )
  }
}
