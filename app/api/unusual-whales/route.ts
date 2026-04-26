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

// Dark pool flow endpoint
async function fetchDarkPoolFlow(ticker?: string) {
  if (!UW_API_KEY) return { error: 'API key not configured', data: [] }
  
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
      return { error: `API error: ${res.status}`, data: [] }
    }
    
    const data = await res.json()
    return { data: data.data || data || [] }
  } catch (err) {
    console.error('[UW API] Dark pool fetch error:', err)
    return { error: 'Failed to fetch dark pool data', data: [] }
  }
}

// Options flow endpoint
async function fetchOptionsFlow(ticker?: string) {
  if (!UW_API_KEY) return { error: 'API key not configured', data: [] }
  
  try {
    let url = `${BASE_URL}/option-trades/flow`
    if (ticker) url = `${BASE_URL}/stock/${ticker}/options/flow`
    
    const res = await fetch(url, { 
      headers: getHeaders(),
      next: { revalidate: 30 }
    })
    
    if (!res.ok) {
      return { error: `API error: ${res.status}`, data: [] }
    }
    
    const data = await res.json()
    return { data: data.data || data || [] }
  } catch (err) {
    console.error('[UW API] Options flow error:', err)
    return { error: 'Failed to fetch options flow', data: [] }
  }
}

// Congress trades
async function fetchCongressTrades() {
  if (!UW_API_KEY) return { error: 'API key not configured', data: [] }
  
  try {
    const res = await fetch(`${BASE_URL}/congress/recent`, {
      headers: getHeaders(),
      next: { revalidate: 300 }
    })
    
    if (!res.ok) return { error: `API error: ${res.status}`, data: [] }
    
    const data = await res.json()
    return { data: data.data || data || [] }
  } catch (err) {
    return { error: 'Failed to fetch congress trades', data: [] }
  }
}

// Insider trades
async function fetchInsiderTrades(ticker?: string) {
  if (!UW_API_KEY) return { error: 'API key not configured', data: [] }
  
  try {
    let url = `${BASE_URL}/insider/recent`
    if (ticker) url = `${BASE_URL}/stock/${ticker}/insider-trades`
    
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 300 }
    })
    
    if (!res.ok) return { error: `API error: ${res.status}`, data: [] }
    
    const data = await res.json()
    return { data: data.data || data || [] }
  } catch (err) {
    return { error: 'Failed to fetch insider trades', data: [] }
  }
}

// Market tide (overall flow sentiment)
async function fetchMarketTide() {
  if (!UW_API_KEY) return { error: 'API key not configured', data: null }
  
  try {
    const res = await fetch(`${BASE_URL}/market/tide`, {
      headers: getHeaders(),
      next: { revalidate: 60 }
    })
    
    if (!res.ok) return { error: `API error: ${res.status}`, data: null }
    
    const data = await res.json()
    return { data: data.data || data }
  } catch (err) {
    return { error: 'Failed to fetch market tide', data: null }
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
