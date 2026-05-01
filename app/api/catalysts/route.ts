import { NextResponse } from 'next/server'

// Fetch upcoming catalysts from Finnhub (earnings, splits, dividends) and Polygon (news)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Accept both `symbol` and `ticker` as aliases.
  const symbol = (searchParams.get('symbol') || searchParams.get('ticker'))?.toUpperCase()

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol/ticker required' }, { status: 400 })
  }

  const catalysts: any[] = []
  const now = new Date()
  const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const fromDate = now.toISOString().split('T')[0]
  const toDate = threeMonthsLater.toISOString().split('T')[0]

  try {
    // 1. Finnhub Earnings Calendar
    const finnhubKey = process.env.FINNHUB_API_KEY
    if (finnhubKey) {
      const earningsRes = await fetch(
        `https://finnhub.io/api/v1/calendar/earnings?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${finnhubKey}`,
        { next: { revalidate: 3600 } }
      )
      if (earningsRes.ok) {
        const data = await earningsRes.json()
        if (data.earningsCalendar) {
          for (const e of data.earningsCalendar) {
            catalysts.push({
              date: e.date,
              type: 'earnings',
              description: `Q${e.quarter || '?'} Earnings Report${e.epsEstimate ? ` (Est: $${e.epsEstimate})` : ''}`,
              impact: 'high',
            })
          }
        }
      }
    }

    // 2. Polygon Ticker News (recent news as potential catalysts)
    const polygonKey = process.env.POLYGON_API_KEY
    if (polygonKey) {
      const newsRes = await fetch(
        `https://api.polygon.io/v2/reference/news?ticker=${symbol}&limit=5&apiKey=${polygonKey}`,
        { next: { revalidate: 1800 } }
      )
      if (newsRes.ok) {
        const data = await newsRes.json()
        if (data.results) {
          for (const n of data.results) {
            // Only include if it mentions catalyst keywords
            const text = (n.title + ' ' + (n.description || '')).toLowerCase()
            const isCatalyst = /fda|approval|merger|acquisition|buyout|dividend|split|lawsuit|sec|investigation|guidance|upgrade|downgrade|analyst/i.test(text)
            if (isCatalyst) {
              catalysts.push({
                date: n.published_utc?.split('T')[0] || 'Recent',
                type: 'news',
                description: n.title,
                impact: /fda|merger|acquisition|buyout|sec|investigation/i.test(text) ? 'high' : 'medium',
              })
            }
          }
        }
      }
    }

    // 3. Finnhub IPO Calendar (if applicable)
    // 4. Finnhub FDA Calendar for biotech
    // These could be added for more comprehensive catalyst coverage

    // Sort by date
    catalysts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({ catalysts: catalysts.slice(0, 10) })
  } catch (err) {
    console.error('[Catalysts API] Error:', err)
    return NextResponse.json({ catalysts: [], error: 'Failed to fetch catalysts' })
  }
}
