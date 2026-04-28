import { NextRequest, NextResponse } from 'next/server'

// Cache ticker list for 24 hours
let cachedTickers: { symbol: string; name: string; exchange: string; type: string }[] = []
let lastFetchTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

async function fetchAllUSTickers() {
  const now = Date.now()
  
  // Return cached if still valid
  if (cachedTickers.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedTickers
  }

  // Try Polygon API first (most comprehensive)
  const polygonKey = process.env.POLYGON_API_KEY
  if (polygonKey) {
    try {
      const response = await fetch(
        `https://api.polygon.io/v3/reference/tickers?market=stocks&active=true&limit=1000&apiKey=${polygonKey}`
      )
      if (response.ok) {
        const data = await response.json()
        cachedTickers = data.results?.map((t: any) => ({
          symbol: t.ticker,
          name: t.name,
          exchange: t.primary_exchange,
          type: t.type
        })) || []
        
        // Fetch more pages (Polygon paginates)
        let nextUrl = data.next_url
        while (nextUrl && cachedTickers.length < 10000) {
          const nextResponse = await fetch(`${nextUrl}&apiKey=${polygonKey}`)
          if (nextResponse.ok) {
            const nextData = await nextResponse.json()
            const moreTickers = nextData.results?.map((t: any) => ({
              symbol: t.ticker,
              name: t.name,
              exchange: t.primary_exchange,
              type: t.type
            })) || []
            cachedTickers = [...cachedTickers, ...moreTickers]
            nextUrl = nextData.next_url
          } else {
            break
          }
        }
        
        lastFetchTime = now
        console.log(`[v0] Loaded ${cachedTickers.length} tickers from Polygon`)
        return cachedTickers
      }
    } catch (error) {
      console.error('[v0] Polygon API error:', error)
    }
  }

  // Fallback to Finnhub
  const finnhubKey = process.env.FINNHUB_API_KEY
  if (finnhubKey) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${finnhubKey}`
      )
      if (response.ok) {
        const data = await response.json()
        cachedTickers = data.map((t: any) => ({
          symbol: t.symbol,
          name: t.description,
          exchange: t.mic || 'US',
          type: t.type
        }))
        lastFetchTime = now
        console.log(`[v0] Loaded ${cachedTickers.length} tickers from Finnhub`)
        return cachedTickers
      }
    } catch (error) {
      console.error('[v0] Finnhub API error:', error)
    }
  }

  // Final fallback - common tickers
  cachedTickers = getCommonTickers()
  lastFetchTime = now
  return cachedTickers
}

function getCommonTickers() {
  return [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'MA', name: 'Mastercard Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', type: 'CS' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', type: 'CS' },
    { symbol: 'IBM', name: 'International Business Machines', exchange: 'NYSE', type: 'CS' },
    { symbol: 'BA', name: 'The Boeing Company', exchange: 'NYSE', type: 'CS' },
    { symbol: 'GS', name: 'Goldman Sachs Group', exchange: 'NYSE', type: 'CS' },
    { symbol: 'MS', name: 'Morgan Stanley', exchange: 'NYSE', type: 'CS' },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'HD', name: 'The Home Depot Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'NKE', name: 'NIKE Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', type: 'CS' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'MCD', name: "McDonald's Corporation", exchange: 'NYSE', type: 'CS' },
    { symbol: 'SBUX', name: 'Starbucks Corporation', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', type: 'CS' },
    { symbol: 'UNH', name: 'UnitedHealth Group', exchange: 'NYSE', type: 'CS' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', type: 'CS' },
    { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'MRK', name: 'Merck & Co. Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'TMO', name: 'Thermo Fisher Scientific', exchange: 'NYSE', type: 'CS' },
    { symbol: 'COST', name: 'Costco Wholesale', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'QCOM', name: 'QUALCOMM Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'TXN', name: 'Texas Instruments', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'NOW', name: 'ServiceNow Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'UBER', name: 'Uber Technologies', exchange: 'NYSE', type: 'CS' },
    { symbol: 'SPOT', name: 'Spotify Technology', exchange: 'NYSE', type: 'CS' },
    { symbol: 'SQ', name: 'Block Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'SNOW', name: 'Snowflake Inc.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'CRWD', name: 'CrowdStrike Holdings', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'ZS', name: 'Zscaler Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'DDOG', name: 'Datadog Inc.', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'PLTR', name: 'Palantir Technologies', exchange: 'NYSE', type: 'CS' },
    { symbol: 'COIN', name: 'Coinbase Global', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'HOOD', name: 'Robinhood Markets', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'SOFI', name: 'SoFi Technologies', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'RIVN', name: 'Rivian Automotive', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'LCID', name: 'Lucid Group', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'GME', name: 'GameStop Corp.', exchange: 'NYSE', type: 'CS' },
    { symbol: 'AMC', name: 'AMC Entertainment', exchange: 'NYSE', type: 'CS' },
    { symbol: 'BBBY', name: 'Bed Bath & Beyond', exchange: 'NASDAQ', type: 'CS' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', exchange: 'NYSE', type: 'ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', type: 'ETF' },
    { symbol: 'IWM', name: 'iShares Russell 2000', exchange: 'NYSE', type: 'ETF' },
    { symbol: 'DIA', name: 'SPDR Dow Jones ETF', exchange: 'NYSE', type: 'ETF' },
    { symbol: 'WYFI', name: 'Weyland-Yutani Financial', exchange: 'NYSE', type: 'CS' },
  ]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.toUpperCase() || ''
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const allTickers = await fetchAllUSTickers()
    
    if (!query) {
      // Return popular tickers when no query
      return NextResponse.json({
        results: allTickers.slice(0, limit),
        total: allTickers.length
      })
    }

    // Search by symbol or name
    const results = allTickers
      .filter(t => 
        t.symbol.includes(query) || 
        t.name.toUpperCase().includes(query)
      )
      .sort((a, b) => {
        // Exact symbol match first
        if (a.symbol === query) return -1
        if (b.symbol === query) return 1
        // Symbol starts with query
        if (a.symbol.startsWith(query) && !b.symbol.startsWith(query)) return -1
        if (b.symbol.startsWith(query) && !a.symbol.startsWith(query)) return 1
        // Alphabetical
        return a.symbol.localeCompare(b.symbol)
      })
      .slice(0, limit)

    return NextResponse.json({
      results,
      total: results.length
    })
  } catch (error) {
    console.error('[v0] Ticker search error:', error)
    return NextResponse.json(
      { error: 'Failed to search tickers', results: [] },
      { status: 500 }
    )
  }
}
