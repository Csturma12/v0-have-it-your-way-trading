import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const POLYGON_KEY = process.env.POLYGON_API_KEY
const FINNHUB_KEY = process.env.FINNHUB_API_KEY

// Fetch company profile from Finnhub (richer than Polygon basics: includes
// industry, country, IPO date, web URL, logo, market cap, share class breakdown).
async function fetchFinnhubProfile(ticker: string) {
  if (!FINNHUB_KEY) return null
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data && Object.keys(data).length > 0 ? data : null
  } catch {
    return null
  }
}

// Fetch executive officers from Finnhub. Their endpoint returns the C-suite
// roster pulled from SEC filings.
async function fetchFinnhubOfficers(ticker: string) {
  if (!FINNHUB_KEY) return null
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/executive?symbol=${ticker}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 432000 } }, // 5d — exec rosters change rarely
    )
    if (!res.ok) return null
    const data = await res.json()
    const list = data?.executive || []
    return list
      .map((o: any) => ({
        name: o.name || '',
        title: o.position || o.title || '',
      }))
      .filter((o: any) => o.name)
      .slice(0, 12)
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

  if (!POLYGON_KEY && !FINNHUB_KEY) {
    return NextResponse.json({ error: 'No API keys configured' }, { status: 500 })
  }

  try {
    // Fetch all 4 sources in parallel.
    const [snapshotRes, detailsRes, finnhubProfile, finnhubOfficers] = await Promise.all([
      POLYGON_KEY
        ? fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${POLYGON_KEY}`, { next: { revalidate: 15 } })
        : Promise.resolve(null),
      POLYGON_KEY
        ? fetch(`https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_KEY}`, { next: { revalidate: 3600 } })
        : Promise.resolve(null),
      fetchFinnhubProfile(ticker),
      fetchFinnhubOfficers(ticker),
    ])

    const snapshotData = snapshotRes && snapshotRes.ok ? await snapshotRes.json() : null
    const detailsData = detailsRes && detailsRes.ok ? await detailsRes.json() : null

    const t = snapshotData?.ticker
    const d = detailsData?.results
    const fh = finnhubProfile

    // Build quote from Polygon snapshot.
    const last = t?.lastTrade?.p ?? t?.day?.c ?? null
    const prevClose = t?.prevDay?.c ?? null
    const change = last != null && prevClose != null ? last - prevClose : null
    const changePercent = prevClose ? ((change ?? 0) / prevClose) * 100 : null

    const quote = last != null ? {
      price: last,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
      open: t?.day?.o ?? 0,
      high: t?.day?.h ?? 0,
      low: t?.day?.l ?? 0,
      volume: t?.day?.v ?? 0,
      prevClose: prevClose ?? 0,
    } : null

    // Merge Polygon (sector, employees, branding logos, list date) +
    // Finnhub (industry, country, IPO date, web URL, share-class market cap).
    const branding = d?.branding
    const profile = (d || fh) ? {
      name: fh?.name ?? d?.name ?? ticker,
      exchange: d?.primary_exchange?.replace('XNAS', 'NASDAQ').replace('XNYS', 'NYSE').replace('XASE', 'AMEX')
        ?? fh?.exchange
        ?? '',
      description: d?.description ?? '',
      sector: d?.sic_description ?? '',
      industry: fh?.finnhubIndustry ?? d?.sic_description ?? '',
      ceo: '',
      employees: d?.total_employees ?? 0,
      // Finnhub returns marketCapitalization in MILLIONS, Polygon in dollars.
      marketCap: d?.market_cap ?? (fh?.marketCapitalization ? fh.marketCapitalization * 1_000_000 : 0),
      website: fh?.weburl ?? d?.homepage_url ?? '',
      logoUrl: branding?.logo_url ? `${branding.logo_url}?apiKey=${POLYGON_KEY}` : (fh?.logo ?? null),
      iconUrl: branding?.icon_url ? `${branding.icon_url}?apiKey=${POLYGON_KEY}` : null,
      week52High: d?.week_52_high ?? null,
      week52Low: d?.week_52_low ?? null,
      listDate: d?.list_date ?? fh?.ipo ?? null,
      locale: d?.locale ?? 'us',
      type: d?.type ?? 'CS',
      hqCity: null,
      hqState: null,
      hqCountry: fh?.country ?? null,
      entityStatus: null,
      legalName: null,
      executives: finnhubOfficers ?? [],
    } : null

    const aiSummary = d?.description
      ? d.description.slice(0, 300) + (d.description.length > 300 ? '…' : '')
      : null

    const source = d ? 'polygon' : fh ? 'finnhub' : 'unavailable'

    return NextResponse.json({
      ticker,
      quote,
      profile,
      aiSummary,
      source,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
