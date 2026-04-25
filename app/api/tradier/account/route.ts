import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.TRADIER_API_KEY
const ACCOUNT_ID = process.env.TRADIER_ACCOUNT_ID
const BASE_URL = 'https://sandbox.tradier.com/v1'

export async function GET(request: NextRequest) {
  if (!API_KEY || !ACCOUNT_ID) {
    return NextResponse.json(
      { error: 'Tradier credentials not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(`${BASE_URL}/accounts/${ACCOUNT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Tradier API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Tradier account fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Tradier account' },
      { status: 500 }
    )
  }
}
