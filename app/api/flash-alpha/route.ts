import { NextRequest, NextResponse } from 'next/server'

const FLASH_ALPHA_BASE = 'https://api.flashalpha.io'
// Support both the typo and correct spelling
const API_KEY = process.env.FLASH_ALPHA_API_KEY || process.env.FLASh_ALHPA_API_KEY

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()
  const endpoint = searchParams.get('endpoint') // 'gex' | 'dex' | 'levels'

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'Flash Alpha API key not configured' }, { status: 500 })
  }

  const validEndpoints = ['gex', 'dex', 'levels']
  if (!endpoint || !validEndpoints.includes(endpoint)) {
    return NextResponse.json({ error: 'Invalid endpoint. Use: gex, dex, or levels' }, { status: 400 })
  }

  try {
    const url = `${FLASH_ALPHA_BASE}/v1/exposure/${endpoint}/${symbol}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Flash Alpha] ${endpoint} error for ${symbol}:`, response.status, errorText)
      return NextResponse.json(
        { error: `Flash Alpha API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ 
      symbol, 
      endpoint,
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Flash Alpha] Request failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Flash Alpha data' },
      { status: 500 }
    )
  }
}
