import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()

  const apiKey = process.env.POLYGON_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'POLYGON_API_KEY not configured' }, { status: 500 })
  }

  try {
    const [snapshotRes, detailsRes] = await Promise.all([
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${apiKey}`, { next: { revalidate: 15 } }),
      fetch(`https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${apiKey}`, { next: { revalidate: 3600 } }),
    ])

    const snapshotData = snapshotRes.ok ? await snapshotRes.json() : null
    const detailsData = detailsRes.ok ? await detailsRes.json() : null

    const t = snapshotData?.ticker
    const d = detailsData?.results

    // Build quote
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

    // Build profile from Polygon reference/tickers v3
    const branding = d?.branding
    const profile = d ? {
      name: d.name ?? ticker,
      exchange: d.primary_exchange?.replace('XNAS', 'NASDAQ').replace('XNYS', 'NYSE').replace('XASE', 'AMEX') ?? '',
      description: d.description ?? '',
      sector: d.sic_description ?? '',
      industry: d.sic_description ?? '',
      ceo: '',
      employees: d.total_employees ?? 0,
      marketCap: d.market_cap ?? 0,
      website: d.homepage_url ?? '',
      logoUrl: branding?.logo_url ? `${branding.logo_url}?apiKey=${apiKey}` : null,
      iconUrl: branding?.icon_url ? `${branding.icon_url}?apiKey=${apiKey}` : null,
      week52High: d.week_52_high ?? null,
      week52Low: d.week_52_low ?? null,
      listDate: d.list_date ?? null,
      locale: d.locale ?? 'us',
      type: d.type ?? 'CS',
    } : null

    // Build a simple AI summary from available data
    const aiSummary = profile?.description
      ? profile.description.slice(0, 200) + (profile.description.length > 200 ? '…' : '')
      : null

    return NextResponse.json({
      ticker,
      quote,
      profile,
      aiSummary,
      source: d ? 'polygon' : 'unavailable',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
