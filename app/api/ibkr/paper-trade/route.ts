import { NextRequest, NextResponse } from 'next/server'

interface TradeRequest {
  accountId: string
  symbol: string
  action: 'buy' | 'sell'
  quantity: number
  orderType: 'market' | 'limit'
  limitPrice?: number
  stopPrice?: number
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('ibkr_access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with IBKR' },
        { status: 401 }
      )
    }

    const body: TradeRequest = await request.json()
    const { accountId, symbol, action, quantity, orderType, limitPrice, stopPrice } = body

    if (!accountId || !symbol || !action || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Build IBKR order payload
    const orderPayload = {
      conid: symbol, // IBKR contract ID (simplified - would need contract lookup)
      orderType: orderType === 'market' ? 'MKT' : 'LMT',
      side: action.toUpperCase(),
      quantity,
      price: limitPrice || undefined,
      auxPrice: stopPrice || undefined,
      tif: 'DAY', // Day order
      transmit: true, // Auto-execute
    }

    // Submit order to IBKR
    const orderResponse = await fetch(
      `https://api.ibkr.com/v1/api/iserver/account/${accountId}/orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      }
    )

    if (!orderResponse.ok) {
      const error = await orderResponse.text()
      console.error('[v0] IBKR order submission failed:', error)
      return NextResponse.json(
        { error: `Order submission failed: ${error}` },
        { status: orderResponse.status }
      )
    }

    const orderResult = await orderResponse.json()

    return NextResponse.json({
      success: true,
      orderId: orderResult.id,
      symbol,
      action,
      quantity,
      orderType,
      status: 'submitted',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] IBKR paper trade error:', error)
    return NextResponse.json(
      { error: 'Failed to submit order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('ibkr_access_token')?.value
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing authentication or accountId' },
        { status: 400 }
      )
    }

    // Get open orders
    const ordersResponse = await fetch(
      `https://api.ibkr.com/v1/api/iserver/account/${accountId}/orders`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!ordersResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: ordersResponse.status }
      )
    }

    const orders = await ordersResponse.json()
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('[v0] IBKR orders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
