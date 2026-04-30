import { NextRequest, NextResponse } from 'next/server'

// Webull paper trading uses the same API base but with paper account credentials
const WEBULL_PAPER_BASE = 'https://openapi.webull.com/openapi'

export async function POST(req: NextRequest) {
  try {
    const { ticker, side, quantity, orderType, limitPrice, stopPrice } = await req.json()
    const accessToken = req.cookies.get('webull_access_token')?.value
    const paperAccountId = process.env.WEBULL_PAPER_ACCOUNT_ID

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Webull not connected. Please login at /api/auth/webull?action=login' },
        { status: 401 }
      )
    }

    if (!ticker || !side || !quantity) {
      return NextResponse.json({ error: 'Missing required fields: ticker, side, quantity' }, { status: 400 })
    }

    const orderData: Record<string, unknown> = {
      stock_code: ticker,
      action: side.toUpperCase(),
      order_type: (orderType || 'MKT').toUpperCase(),
      qty: String(quantity),
      time_in_force: 'DAY',
      paper_trading: true,
    }

    if (paperAccountId) {
      orderData.account_id = paperAccountId
    }

    if ((orderType === 'limit' || orderType === 'LMT') && limitPrice) {
      orderData.limit_price = String(limitPrice)
    }

    if ((orderType === 'stop' || orderType === 'STP') && stopPrice) {
      orderData.stop_price = String(stopPrice)
    }

    const response = await fetch(`${WEBULL_PAPER_BASE}/trading/v1/order/place`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Paper trade failed: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    const order = result.data || result

    return NextResponse.json({
      success: true,
      paper: true,
      orderId: order.order_id,
      ticker,
      side: side.toUpperCase(),
      quantity,
      type: orderType || 'MKT',
      status: order.status,
      message: `[PAPER] ${side.toUpperCase()} order placed for ${quantity} ${ticker}`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to place paper trade' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('webull_access_token')?.value
    const paperAccountId = process.env.WEBULL_PAPER_ACCOUNT_ID

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Webull not connected' },
        { status: 401 }
      )
    }

    const params = new URLSearchParams({ status: 'working', paper_trading: 'true' })
    if (paperAccountId) params.set('account_id', paperAccountId)

    const response = await fetch(
      `${WEBULL_PAPER_BASE}/trading/v1/order/list?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch paper orders' }, { status: response.status })
    }

    const data = await response.json()
    const orders = data.data?.items || data.data || []

    return NextResponse.json({
      paper: true,
      orders: orders.map((o: Record<string, unknown>) => ({
        orderId: o.order_id,
        ticker: o.stock_code,
        side: o.action,
        quantity: o.qty,
        filledQty: o.filled_qty,
        type: o.order_type,
        status: o.status,
        createdAt: o.create_time,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch paper orders' },
      { status: 500 }
    )
  }
}
