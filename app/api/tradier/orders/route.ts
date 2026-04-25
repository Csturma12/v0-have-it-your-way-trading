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
    const response = await fetch(
      `${BASE_URL}/accounts/${ACCOUNT_ID}/orders`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        },
        next: { revalidate: 20 },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `Tradier API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Tradier orders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Tradier orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!API_KEY || !ACCOUNT_ID) {
    return NextResponse.json(
      { error: 'Tradier credentials not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { symbol, side, quantity, price, order_type } = body

    if (!symbol || !side || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, side, quantity' },
        { status: 400 }
      )
    }

    const orderData = new URLSearchParams()
    orderData.append('class', order_type || 'equity')
    orderData.append('symbol', symbol)
    orderData.append('side', side)
    orderData.append('quantity', quantity)
    orderData.append('type', 'market')
    
    if (price) {
      orderData.append('price', price)
      orderData.set('type', 'limit')
    }

    orderData.append('duration', 'day')

    const response = await fetch(
      `${BASE_URL}/accounts/${ACCOUNT_ID}/orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: orderData.toString(),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Tradier order error: ${error}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Tradier order creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create Tradier order' },
      { status: 500 }
    )
  }
}
