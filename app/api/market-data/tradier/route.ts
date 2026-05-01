import { NextRequest, NextResponse } from 'next/server'

// Tradier Sandbox API - Free real-time quotes, options chains, account data
// Free tier: unlimited requests, 15-min delayed data in sandbox
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const endpoint = searchParams.get('endpoint') || 'quote' // quote, chains, history, lookup

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  const apiKey = process.env.TRADIER_API_KEY || process.env.TRADIER_TOKEN
  if (!apiKey) {
    // Graceful empty response so dependent widgets don't crash.
    return NextResponse.json({
      symbol,
      endpoint,
      data: null,
      source: 'tradier',
      ok: false,
      reason: 'TRADIER_API_KEY not configured',
    })
  }

  try {
    const baseUrl = 'https://sandbox.tradier.com/v1' // Sandbox is free

    let url = ''
    if (endpoint === 'quote') {
      url = `${baseUrl}/markets/quotes?symbols=${symbol.toUpperCase()}`
    } else if (endpoint === 'chains') {
      url = `${baseUrl}/markets/options/chains?symbol=${symbol.toUpperCase()}`
    } else if (endpoint === 'history') {
      const interval = searchParams.get('interval') || 'daily'
      const start = searchParams.get('start')
      const end = searchParams.get('end')
      url = `${baseUrl}/markets/history?symbol=${symbol.toUpperCase()}&interval=${interval}`
      if (start) url += `&start=${start}`
      if (end) url += `&end=${end}`
    } else if (endpoint === 'lookup') {
      url = `${baseUrl}/markets/lookup?q=${symbol}`
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      return NextResponse.json({
        symbol,
        endpoint,
        data: null,
        source: 'tradier',
        ok: false,
        reason: `Upstream ${response.status}`,
      })
    }

    const data = await response.json()

    return NextResponse.json({
      symbol,
      endpoint,
      data,
      source: 'tradier',
      ok: true,
    })
  } catch (error: any) {
    console.error('[v0] Tradier error:', error)
    return NextResponse.json({
      symbol,
      endpoint,
      data: null,
      source: 'tradier',
      ok: false,
      reason: error?.message || 'fetch failed',
    })
  }
}
