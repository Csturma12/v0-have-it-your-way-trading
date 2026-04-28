import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const INTRINIO_KEY = process.env.INTRINIO_API_KEY
const BASE_URL = 'https://api-v2.intrinio.com'

interface IntrinioCompany {
  id: string
  ticker: string
  name: string
  legal_name: string
  stock_exchange: string
  sic: number
  short_description: string
  long_description: string
  ceo: string
  company_url: string
  business_address: string
  mailing_address: string
  business_phone_no: string
  hq_address1: string
  hq_address2: string
  hq_address_city: string
  hq_address_postal_code: string
  entity_legal_form: string
  cik: string
  latest_filing_date: string
  hq_state: string
  hq_country: string
  inc_state: string
  inc_country: string
  employees: number
  entity_status: string
  sector: string
  industry_category: string
  industry_group: string
  template: string
  standardized_active: boolean
  first_fundamental_date: string
  last_fundamental_date: string
  first_stock_price_date: string
  last_stock_price_date: string
}

interface IntrinioPrice {
  date: string
  intraperiod: boolean
  frequency: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adj_open: number
  adj_high: number
  adj_low: number
  adj_close: number
  adj_volume: number
  factor: number
  split_ratio: number
  dividend: number
  change: number
  percent_change: number
  fifty_two_week_high: number
  fifty_two_week_low: number
}

interface IntrinioFundamental {
  value: number
  tag: string
}

// Fetch company profile from Intrinio
async function fetchCompany(ticker: string): Promise<IntrinioCompany | null> {
  if (!INTRINIO_KEY) return null
  
  try {
    const res = await fetch(`${BASE_URL}/companies/${ticker}?api_key=${INTRINIO_KEY}`, {
      next: { revalidate: 3600 }
    })
    
    if (!res.ok) {
      console.error(`[Intrinio] Company fetch error: ${res.status}`)
      return null
    }
    
    return await res.json()
  } catch (err) {
    console.error('[Intrinio] Company fetch error:', err)
    return null
  }
}

// Fetch real-time or delayed quote from Intrinio
async function fetchQuote(ticker: string): Promise<IntrinioPrice | null> {
  if (!INTRINIO_KEY) return null
  
  try {
    const res = await fetch(`${BASE_URL}/securities/${ticker}/prices/realtime?api_key=${INTRINIO_KEY}`, {
      next: { revalidate: 15 }
    })
    
    if (!res.ok) {
      // Try delayed/historical price
      const histRes = await fetch(`${BASE_URL}/securities/${ticker}/prices?page_size=1&api_key=${INTRINIO_KEY}`, {
        next: { revalidate: 60 }
      })
      
      if (histRes.ok) {
        const histData = await histRes.json()
        return histData.stock_prices?.[0] || null
      }
      return null
    }
    
    return await res.json()
  } catch (err) {
    console.error('[Intrinio] Quote fetch error:', err)
    return null
  }
}

// Fetch fundamental data tags from Intrinio
async function fetchFundamentals(ticker: string): Promise<Record<string, number | null>> {
  if (!INTRINIO_KEY) return {}
  
  const tags = [
    'pricetoearnings',
    'pricetobook',
    'pricetosales',
    'basiceps',
    'dilutedeps',
    'totalrevenue',
    'grossmargin',
    'operatingmargin',
    'netmargin',
    'roe',
    'roa',
    'roic',
    'debttoequity',
    'currentratio',
    'quickratio',
    'marketcap',
    'enterprisevalue',
    'freecashflow',
    'dividendyield',
    'payoutratio',
    'bookvaluepershare',
    'tangiblebookvaluepershare',
    'revenuepershare',
    'revenueqoqgrowth',
    'revenueyoygrowth',
    'epsgrowth',
    'beta',
  ]
  
  try {
    const tagList = tags.join(',')
    const res = await fetch(
      `${BASE_URL}/companies/${ticker}/data_point/${tagList}?api_key=${INTRINIO_KEY}`,
      { next: { revalidate: 3600 } }
    )
    
    if (!res.ok) {
      console.error(`[Intrinio] Fundamentals fetch error: ${res.status}`)
      return {}
    }
    
    const data = await res.json()
    const result: Record<string, number | null> = {}
    
    // Handle both array and object responses
    if (Array.isArray(data)) {
      data.forEach((item: IntrinioFundamental) => {
        result[item.tag] = item.value
      })
    } else if (data.value !== undefined) {
      // Single tag response
      result[tags[0]] = data.value
    }
    
    return result
  } catch (err) {
    console.error('[Intrinio] Fundamentals fetch error:', err)
    return {}
  }
}

// Fetch historical prices for charts
async function fetchHistoricalPrices(ticker: string, startDate?: string, endDate?: string, frequency = 'daily'): Promise<IntrinioPrice[]> {
  if (!INTRINIO_KEY) return []
  
  try {
    let url = `${BASE_URL}/securities/${ticker}/prices?page_size=100&frequency=${frequency}&api_key=${INTRINIO_KEY}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    
    const res = await fetch(url, { next: { revalidate: 300 } })
    
    if (!res.ok) {
      console.error(`[Intrinio] Historical prices fetch error: ${res.status}`)
      return []
    }
    
    const data = await res.json()
    return data.stock_prices || []
  } catch (err) {
    console.error('[Intrinio] Historical prices fetch error:', err)
    return []
  }
}

// Fetch analyst ratings/estimates
async function fetchAnalystEstimates(ticker: string) {
  if (!INTRINIO_KEY) return null
  
  try {
    const res = await fetch(
      `${BASE_URL}/companies/${ticker}/estimates/eps?api_key=${INTRINIO_KEY}`,
      { next: { revalidate: 3600 } }
    )
    
    if (!res.ok) return null
    
    const data = await res.json()
    return data.estimates || []
  } catch (err) {
    console.error('[Intrinio] Analyst estimates fetch error:', err)
    return null
  }
}

// Fetch news from Intrinio
async function fetchNews(ticker: string, limit = 10) {
  if (!INTRINIO_KEY) return []
  
  try {
    const res = await fetch(
      `${BASE_URL}/companies/${ticker}/news?page_size=${limit}&api_key=${INTRINIO_KEY}`,
      { next: { revalidate: 300 } }
    )
    
    if (!res.ok) return []
    
    const data = await res.json()
    return data.news || []
  } catch (err) {
    console.error('[Intrinio] News fetch error:', err)
    return []
  }
}

// Fetch insider transactions
async function fetchInsiderTransactions(ticker: string) {
  if (!INTRINIO_KEY) return []
  
  try {
    const res = await fetch(
      `${BASE_URL}/companies/${ticker}/insider_transaction_filings?page_size=20&api_key=${INTRINIO_KEY}`,
      { next: { revalidate: 1800 } }
    )
    
    if (!res.ok) return []
    
    const data = await res.json()
    return data.insider_transaction_filings || []
  } catch (err) {
    console.error('[Intrinio] Insider transactions fetch error:', err)
    return []
  }
}

// Fetch institutional ownership
async function fetchInstitutionalOwnership(ticker: string) {
  if (!INTRINIO_KEY) return []
  
  try {
    const res = await fetch(
      `${BASE_URL}/companies/${ticker}/institutional_ownership?page_size=20&api_key=${INTRINIO_KEY}`,
      { next: { revalidate: 3600 } }
    )
    
    if (!res.ok) return []
    
    const data = await res.json()
    return data.ownership || []
  } catch (err) {
    console.error('[Intrinio] Institutional ownership fetch error:', err)
    return []
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase()
  const type = searchParams.get('type') || 'all' // all, company, quote, fundamentals, history, news, insider, institutional, estimates
  const startDate = searchParams.get('start_date') || undefined
  const endDate = searchParams.get('end_date') || undefined
  const frequency = searchParams.get('frequency') || 'daily'
  
  if (!INTRINIO_KEY) {
    return NextResponse.json({ 
      error: 'INTRINIO_API_KEY not configured',
      source: 'unavailable' 
    }, { status: 500 })
  }
  
  try {
    switch (type) {
      case 'company': {
        const company = await fetchCompany(ticker)
        return NextResponse.json({ ticker, company, source: company ? 'intrinio' : 'unavailable' })
      }
      
      case 'quote': {
        const quote = await fetchQuote(ticker)
        return NextResponse.json({ ticker, quote, source: quote ? 'intrinio' : 'unavailable' })
      }
      
      case 'fundamentals': {
        const fundamentals = await fetchFundamentals(ticker)
        return NextResponse.json({ ticker, fundamentals, source: Object.keys(fundamentals).length > 0 ? 'intrinio' : 'unavailable' })
      }
      
      case 'history': {
        const prices = await fetchHistoricalPrices(ticker, startDate, endDate, frequency)
        return NextResponse.json({ ticker, prices, source: prices.length > 0 ? 'intrinio' : 'unavailable' })
      }
      
      case 'news': {
        const news = await fetchNews(ticker)
        return NextResponse.json({ ticker, news, source: news.length > 0 ? 'intrinio' : 'unavailable' })
      }
      
      case 'insider': {
        const transactions = await fetchInsiderTransactions(ticker)
        return NextResponse.json({ ticker, transactions, source: transactions.length > 0 ? 'intrinio' : 'unavailable' })
      }
      
      case 'institutional': {
        const ownership = await fetchInstitutionalOwnership(ticker)
        return NextResponse.json({ ticker, ownership, source: ownership.length > 0 ? 'intrinio' : 'unavailable' })
      }
      
      case 'estimates': {
        const estimates = await fetchAnalystEstimates(ticker)
        return NextResponse.json({ ticker, estimates, source: estimates ? 'intrinio' : 'unavailable' })
      }
      
      case 'all':
      default: {
        // Fetch all data in parallel
        const [company, quote, fundamentals, news, insider, institutional, estimates] = await Promise.all([
          fetchCompany(ticker),
          fetchQuote(ticker),
          fetchFundamentals(ticker),
          fetchNews(ticker, 5),
          fetchInsiderTransactions(ticker),
          fetchInstitutionalOwnership(ticker),
          fetchAnalystEstimates(ticker),
        ])
        
        return NextResponse.json({
          ticker,
          company,
          quote,
          fundamentals,
          news,
          insiderTransactions: insider,
          institutionalOwnership: institutional,
          analystEstimates: estimates,
          source: company ? 'intrinio' : 'unavailable',
          timestamp: Date.now(),
        })
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Intrinio data' },
      { status: 500 }
    )
  }
}
