import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const POLYGON_KEY = process.env.POLYGON_API_KEY
const INTRINIO_KEY = process.env.INTRINIO_API_KEY

// Fetch company data from Intrinio for richer profile
async function fetchIntrinioCompany(ticker: string) {
  if (!INTRINIO_KEY) return null
  
  try {
    const res = await fetch(
      `https://api-v2.intrinio.com/companies/${ticker}?api_key=${INTRINIO_KEY}`,
      { next: { revalidate: 3600 } }
    )
    
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

  if (!POLYGON_KEY && !INTRINIO_KEY) {
    return NextResponse.json({ error: 'No API keys configured' }, { status: 500 })
  }

  try {
    // Fetch from multiple sources in parallel
    const [snapshotRes, detailsRes, intrinioCompany] = await Promise.all([
      POLYGON_KEY ? fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${POLYGON_KEY}`, { next: { revalidate: 15 } }) : Promise.resolve(null),
      POLYGON_KEY ? fetch(`https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_KEY}`, { next: { revalidate: 3600 } }) : Promise.resolve(null),
      fetchIntrinioCompany(ticker),
    ])

    const snapshotData = snapshotRes && snapshotRes.ok ? await snapshotRes.json() : null
    const detailsData = detailsRes && detailsRes.ok ? await detailsRes.json() : null

    const t = snapshotData?.ticker
    const d = detailsData?.results
    const ic = intrinioCompany // Intrinio company data

    // Build quote from Polygon snapshot
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

    // Build profile merging Polygon and Intrinio data (Intrinio has richer company info)
    const branding = d?.branding
    const profile = (d || ic) ? {
      name: ic?.name ?? d?.name ?? ticker,
      exchange: d?.primary_exchange?.replace('XNAS', 'NASDAQ').replace('XNYS', 'NYSE').replace('XASE', 'AMEX') ?? ic?.stock_exchange ?? '',
      description: ic?.long_description ?? ic?.short_description ?? d?.description ?? '',
      sector: ic?.sector ?? d?.sic_description ?? '',
      industry: ic?.industry_category ?? ic?.industry_group ?? d?.sic_description ?? '',
      ceo: ic?.ceo ?? '',
      employees: ic?.employees ?? d?.total_employees ?? 0,
      marketCap: d?.market_cap ?? 0,
      website: ic?.company_url ?? d?.homepage_url ?? '',
      logoUrl: branding?.logo_url ? `${branding.logo_url}?apiKey=${POLYGON_KEY}` : null,
      iconUrl: branding?.icon_url ? `${branding.icon_url}?apiKey=${POLYGON_KEY}` : null,
      week52High: d?.week_52_high ?? null,
      week52Low: d?.week_52_low ?? null,
      listDate: d?.list_date ?? null,
      locale: d?.locale ?? 'us',
      type: d?.type ?? 'CS',
      // Additional Intrinio fields
      hqCity: ic?.hq_address_city ?? null,
      hqState: ic?.hq_state ?? null,
      hqCountry: ic?.hq_country ?? null,
      entityStatus: ic?.entity_status ?? null,
      legalName: ic?.legal_name ?? null,
    } : null

    // Build AI summary from available descriptions (prefer Intrinio's longer description)
    const descriptionSource = ic?.long_description ?? ic?.short_description ?? d?.description ?? ''
    const aiSummary = descriptionSource
      ? descriptionSource.slice(0, 300) + (descriptionSource.length > 300 ? '…' : '')
      : null

    // Determine data source
    const source = ic ? 'intrinio' : d ? 'polygon' : 'unavailable'

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
