import { NextRequest, NextResponse } from 'next/server'

const UW_API_KEY = process.env.UNUSUAL_WHALES_API_KEY
const BASE_URL = 'https://api.unusualwhales.com/api'

interface UWHeaders {
  Authorization: string
  Accept: string
}

function getHeaders(): UWHeaders {
  return {
    Authorization: `Bearer ${UW_API_KEY}`,
    Accept: 'application/json',
  }
}

// Mock data for when API is unavailable
const MOCK_INSIDER_TRADES = [
  { id: '1', ticker: 'NVDA', insider_name: 'Jensen Huang', insider_title: 'CEO', transaction_type: 'Sale', shares: 120000, price: 875.50, value: 105060000, timestamp: Date.now() - 86400000, filing_date: '2024-01-15' },
  { id: '2', ticker: 'AAPL', insider_name: 'Tim Cook', insider_title: 'CEO', transaction_type: 'Sale', shares: 50000, price: 185.20, value: 9260000, timestamp: Date.now() - 172800000, filing_date: '2024-01-14' },
  { id: '3', ticker: 'TSLA', insider_name: 'Robyn Denholm', insider_title: 'Chairman', transaction_type: 'Purchase', shares: 15000, price: 178.40, value: 2676000, timestamp: Date.now() - 259200000, filing_date: '2024-01-13' },
  { id: '4', ticker: 'META', insider_name: 'Mark Zuckerberg', insider_title: 'CEO', transaction_type: 'Sale', shares: 28500, price: 512.30, value: 14600550, timestamp: Date.now() - 345600000, filing_date: '2024-01-12' },
  { id: '5', ticker: 'MSFT', insider_name: 'Satya Nadella', insider_title: 'CEO', transaction_type: 'Sale', shares: 35000, price: 415.80, value: 14553000, timestamp: Date.now() - 432000000, filing_date: '2024-01-11' },
  { id: '6', ticker: 'AMD', insider_name: 'Lisa Su', insider_title: 'CEO', transaction_type: 'Purchase', shares: 25000, price: 162.50, value: 4062500, timestamp: Date.now() - 518400000, filing_date: '2024-01-10' },
  { id: '7', ticker: 'GOOGL', insider_name: 'Sundar Pichai', insider_title: 'CEO', transaction_type: 'Sale', shares: 22000, price: 175.90, value: 3869800, timestamp: Date.now() - 604800000, filing_date: '2024-01-09' },
  { id: '8', ticker: 'AMZN', insider_name: 'Andy Jassy', insider_title: 'CEO', transaction_type: 'Grant', shares: 45000, price: 189.50, value: 8527500, timestamp: Date.now() - 691200000, filing_date: '2024-01-08' },
  { id: '9', ticker: 'CRM', insider_name: 'Marc Benioff', insider_title: 'CEO', transaction_type: 'Sale', shares: 18000, price: 285.40, value: 5137200, timestamp: Date.now() - 777600000, filing_date: '2024-01-07' },
  { id: '10', ticker: 'JPM', insider_name: 'Jamie Dimon', insider_title: 'CEO', transaction_type: 'Purchase', shares: 8500, price: 195.20, value: 1659200, timestamp: Date.now() - 864000000, filing_date: '2024-01-06' },
]

const MOCK_CONGRESS_TRADES = [
  { id: '1', ticker: 'NVDA', representative: 'Nancy Pelosi', party: 'Democrat', type: 'Purchase', amount: '$1,000,001 - $5,000,000', timestamp: Date.now() - 172800000, disclosure_date: '2024-01-14' },
  { id: '2', ticker: 'MSFT', representative: 'Dan Crenshaw', party: 'Republican', type: 'Purchase', amount: '$15,001 - $50,000', timestamp: Date.now() - 259200000, disclosure_date: '2024-01-13' },
  { id: '3', ticker: 'AAPL', representative: 'Josh Gottheimer', party: 'Democrat', type: 'Sale', amount: '$50,001 - $100,000', timestamp: Date.now() - 345600000, disclosure_date: '2024-01-12' },
  { id: '4', ticker: 'GOOGL', representative: 'Kevin McCarthy', party: 'Republican', type: 'Purchase', amount: '$100,001 - $250,000', timestamp: Date.now() - 432000000, disclosure_date: '2024-01-11' },
  { id: '5', ticker: 'META', representative: 'Alexandria Ocasio-Cortez', party: 'Democrat', type: 'Sale', amount: '$1,001 - $15,000', timestamp: Date.now() - 518400000, disclosure_date: '2024-01-10' },
  { id: '6', ticker: 'TSLA', representative: 'Marjorie Taylor Greene', party: 'Republican', type: 'Purchase', amount: '$15,001 - $50,000', timestamp: Date.now() - 604800000, disclosure_date: '2024-01-09' },
  { id: '7', ticker: 'AMD', representative: 'Ro Khanna', party: 'Democrat', type: 'Purchase', amount: '$50,001 - $100,000', timestamp: Date.now() - 691200000, disclosure_date: '2024-01-08' },
  { id: '8', ticker: 'AMZN', representative: 'Michael McCaul', party: 'Republican', type: 'Sale', amount: '$250,001 - $500,000', timestamp: Date.now() - 777600000, disclosure_date: '2024-01-07' },
  { id: '9', ticker: 'CRM', representative: 'Judy Chu', party: 'Democrat', type: 'Purchase', amount: '$15,001 - $50,000', timestamp: Date.now() - 864000000, disclosure_date: '2024-01-06' },
  { id: '10', ticker: 'JPM', representative: 'Pat Fallon', party: 'Republican', type: 'Purchase', amount: '$100,001 - $250,000', timestamp: Date.now() - 950400000, disclosure_date: '2024-01-05' },
]

const MOCK_MARKET_TIDE = {
  call_premium: 4250000000,
  put_premium: 2850000000,
  call_volume: 12500000,
  put_volume: 8200000,
  net_premium: 1400000000,
  sentiment: 'bullish',
}

// Dark pool flow endpoint
async function fetchDarkPoolFlow(ticker?: string) {
  // No API key - handled by /api/dark-pool which has its own mock data
  if (!UW_API_KEY) return { error: 'API key not configured', data: [], source: 'mock' }
  
  try {
    let url = `${BASE_URL}/darkpool/recent`
    if (ticker) url = `${BASE_URL}/stock/${ticker}/darkpool`
    
    const res = await fetch(url, { 
      headers: getHeaders(),
      next: { revalidate: 60 }
    })
    
    if (!res.ok) {
      const text = await res.text()
      console.error('[UW API] Dark pool error:', res.status, text)
      return { error: `API error: ${res.status}`, data: [], source: 'mock' }
    }
    
    const data = await res.json()
    return { data: data.data || data || [], source: 'unusual_whales' }
  } catch (err) {
    console.error('[UW API] Dark pool fetch error:', err)
    return { error: 'Failed to fetch dark pool data', data: [], source: 'mock' }
  }
}

// Options flow endpoint
async function fetchOptionsFlow(ticker?: string) {
  // No API key - handled by /api/dark-pool?type=options which has its own mock data
  if (!UW_API_KEY) return { error: 'API key not configured', data: [], source: 'mock' }
  
  try {
    let url = `${BASE_URL}/option-trades/flow`
    if (ticker) url = `${BASE_URL}/stock/${ticker}/options/flow`
    
    const res = await fetch(url, { 
      headers: getHeaders(),
      next: { revalidate: 30 }
    })
    
    if (!res.ok) {
      return { error: `API error: ${res.status}`, data: [], source: 'mock' }
    }
    
    const data = await res.json()
    return { data: data.data || data || [], source: 'unusual_whales' }
  } catch (err) {
    console.error('[UW API] Options flow error:', err)
    return { error: 'Failed to fetch options flow', data: [], source: 'mock' }
  }
}

// Congress trades
async function fetchCongressTrades() {
  if (!UW_API_KEY) {
    return { data: MOCK_CONGRESS_TRADES, source: 'mock' }
  }
  
  try {
    const res = await fetch(`${BASE_URL}/congress/recent`, {
      headers: getHeaders(),
      next: { revalidate: 300 }
    })
    
    if (!res.ok) return { error: `API error: ${res.status}`, data: MOCK_CONGRESS_TRADES, source: 'mock' }
    
    const data = await res.json()
    return { data: data.data || data || [], source: 'unusual_whales' }
  } catch (err) {
    return { error: 'Failed to fetch congress trades', data: MOCK_CONGRESS_TRADES, source: 'mock' }
  }
}

// Insider trades
async function fetchInsiderTrades(ticker?: string) {
  if (!UW_API_KEY) {
    let data = MOCK_INSIDER_TRADES
    if (ticker) data = data.filter(t => t.ticker === ticker.toUpperCase())
    return { data, source: 'mock' }
  }
  
  try {
    let url = `${BASE_URL}/insider/recent`
    if (ticker) url = `${BASE_URL}/stock/${ticker}/insider-trades`
    
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 300 }
    })
    
    if (!res.ok) {
      let data = MOCK_INSIDER_TRADES
      if (ticker) data = data.filter(t => t.ticker === ticker.toUpperCase())
      return { error: `API error: ${res.status}`, data, source: 'mock' }
    }
    
    const data = await res.json()
    return { data: data.data || data || [], source: 'unusual_whales' }
  } catch (err) {
    let data = MOCK_INSIDER_TRADES
    if (ticker) data = data.filter(t => t.ticker === ticker.toUpperCase())
    return { error: 'Failed to fetch insider trades', data, source: 'mock' }
  }
}

// Market tide (overall flow sentiment)
async function fetchMarketTide() {
  if (!UW_API_KEY) {
    return { data: MOCK_MARKET_TIDE, source: 'mock' }
  }
  
  try {
    const res = await fetch(`${BASE_URL}/market/tide`, {
      headers: getHeaders(),
      next: { revalidate: 60 }
    })
    
    if (!res.ok) return { error: `API error: ${res.status}`, data: MOCK_MARKET_TIDE, source: 'mock' }
    
    const data = await res.json()
    return { data: data.data || data, source: 'unusual_whales' }
  } catch (err) {
    return { error: 'Failed to fetch market tide', data: MOCK_MARKET_TIDE, source: 'mock' }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'darkpool'
  const ticker = searchParams.get('ticker') || undefined
  
  let result
  
  switch (type) {
    case 'darkpool':
      result = await fetchDarkPoolFlow(ticker)
      break
    case 'options':
      result = await fetchOptionsFlow(ticker)
      break
    case 'congress':
      result = await fetchCongressTrades()
      break
    case 'insider':
      result = await fetchInsiderTrades(ticker)
      break
    case 'tide':
      result = await fetchMarketTide()
      break
    default:
      result = { error: 'Invalid type', data: [] }
  }
  
  return NextResponse.json({
    ...result,
    type,
    ticker,
    hasApiKey: !!UW_API_KEY,
  })
}
