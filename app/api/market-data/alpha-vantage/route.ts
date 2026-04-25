import { NextRequest, NextResponse } from 'next/server'

// Alpha Vantage API - Intraday, daily, weekly, monthly timeseries
// Free tier: 5 req/min, 500 req/day
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const interval = searchParams.get('interval') || '5min' // 1min, 5min, 15min, 30min, 60min
  const outputsize = searchParams.get('outputsize') || 'compact' // compact (100 data points) or full (20+ years)

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Alpha Vantage API key not configured' }, { status: 500 })
  }

  try {
    const baseUrl = 'https://www.alphavantage.co/query'
    const params = new URLSearchParams({
      function: 'TIME_SERIES_INTRADAY',
      symbol: symbol.toUpperCase(),
      interval,
      outputsize,
      apikey: apiKey,
    })

    const response = await fetch(`${baseUrl}?${params}`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`)
    }

    const data = await response.json()

    // Alpha Vantage returns data in a specific format, transform to standard OHLCV
    const timeSeriesKey = `Time Series (${interval})`
    const timeSeries = data[timeSeriesKey] || {}

    const bars = Object.entries(timeSeries)
      .slice(0, 100) // Limit to last 100 candles
      .map(([timestamp, candle]: any) => ({
        time: Math.floor(new Date(timestamp).getTime() / 1000), // Unix timestamp
        open: parseFloat(candle['1. open']),
        high: parseFloat(candle['2. high']),
        low: parseFloat(candle['3. low']),
        close: parseFloat(candle['4. close']),
        volume: parseInt(candle['5. volume']),
      }))
      .reverse() // Oldest first

    return NextResponse.json({
      symbol,
      bars,
      interval,
      source: 'alpha_vantage',
    })
  } catch (error) {
    console.error('[v0] Alpha Vantage error:', error)
    return NextResponse.json({ error: 'Failed to fetch data from Alpha Vantage' }, { status: 500 })
  }
}
