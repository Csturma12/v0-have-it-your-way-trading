import { NextRequest, NextResponse } from 'next/server'

const WEBULL_API_BASE = 'https://openapi.webull.com/openapi'

export async function POST(req: NextRequest) {
  try {
    const { ticker, side, quantity, orderType, limitPrice, stopPrice, accountId } = await req.json()
    const accessToken = req.cookies.get('webull_access_token')?.value

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
    }

    if (orderType === 'limit' || orderType === 'LMT') {
      if (!limitPrice) {
        return NextResponse.json({ error: 'limitPrice required for limit orders' }, { status: 400 })
      }
      orderData.limit_price = String(limitPrice)
    }

    if (orderType === 'stop' || orderType === 'STP') {
      if (!stopPrice) {
        return NextResponse.json({ error: 'stopPrice required for stop orders' }, { status: 400 })
      }
      orderData.stop_price = String(stopPrice)
    }

    if (accountId) {
      orderData.account_id = accountId
    }

    const response = await fetch(`${WEBULL_API_BASE}/trading/v1/order/place`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Order failed: ${errorText}` }, { status: response.status })
    }

    const result = await response.json()
    const order = result.data || result

    return NextResponse.json({
      success: true,
      orderId: order.order_id,
      ticker,
      side: side.toUpperCase(),
      quantity,
      type: orderType || 'MKT',
      status: order.status,
      message: `${side.toUpperCase()} order placed for ${quantity} ${ticker}`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to place order' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('webull_access_token')?.value
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'working'
    const accountId = searchParams.get('account_id') || ''

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Webull not connected. Please login at /api/auth/webull?action=login' },
        { status: 401 }
      )
    }

    const params = new URLSearchParams({ status })
    if (accountId) params.set('account_id', accountId)

    const response = await fetch(
      `${WEBULL_API_BASE}/trading/v1/order/list?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: response.status })
    }

    const data = await response.json()
    const orders = data.data?.items || data.data || []

    return NextResponse.json({
      orders: orders.map((o: Record<string, unknown>) => ({
        orderId: o.order_id,
        ticker: o.stock_code,
        side: o.action,
        quantity: o.qty,
        filledQty: o.filled_qty,
        type: o.order_type,
        limitPrice: o.limit_price,
        status: o.status,
        createdAt: o.create_time,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { orderId, accountId } = await req.json()
    const accessToken = req.cookies.get('webull_access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Webull not connected' },
        { status: 401 }
      )
    }

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    }

    const body: Record<string, string> = { order_id: orderId }
    if (accountId) body.account_id = accountId

    const response = await fetch(`${WEBULL_API_BASE}/trading/v1/order/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Cancel failed: ${errorText}` }, { status: response.status })
    }

    return NextResponse.json({ success: true, orderId, message: 'Order cancelled' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
