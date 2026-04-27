import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { ticker, side, quantity, orderType, limitPrice, stopPrice } = await req.json()
    const username = process.env.TASTYTRADE_USERNAME
    const password = process.env.TASTYTRADE_PASSWORD

    if (!username || !password) {
      return NextResponse.json({ error: 'Tastytrade credentials not configured' }, { status: 400 })
    }

    if (!ticker || !side || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Login
    const loginResponse = await fetch('https://api.tastyworks.com/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: username, password }),
    })

    if (!loginResponse.ok) {
      return NextResponse.json({ error: 'Tastytrade login failed' }, { status: 401 })
    }

    const { data: session } = await loginResponse.json()
    const token = session.user.remember_token

    // Get account
    const accountsResponse = await fetch('https://api.tastyworks.com/customers/me/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const { data: accounts } = await accountsResponse.json()
    const accountNumber = accounts.items[0].account_number

    // Place order
    const orderData = {
      orders: [
        {
          symbol: ticker,
          quantity: parseFloat(quantity),
          side: side.toLowerCase(),
          order_type: orderType || 'market',
          time_in_force: 'day',
          ...(orderType === 'limit' && limitPrice && { limit_price: parseFloat(limitPrice) }),
          ...(orderType === 'stop' && stopPrice && { stop_price: parseFloat(stopPrice) }),
        },
      ],
    }

    const orderResponse = await fetch(
      `https://api.tastyworks.com/accounts/${accountNumber}/orders`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      }
    )

    if (!orderResponse.ok) {
      const error = await orderResponse.text()
      return NextResponse.json({ error: `Order failed: ${error}` }, { status: orderResponse.status })
    }

    const result = await orderResponse.json()

    return NextResponse.json({
      success: true,
      orderId: result.data.order_id,
      ticker: ticker,
      side: side,
      quantity: quantity,
      type: orderType,
      status: 'Placed',
      message: `${side.toUpperCase()} order placed for ${quantity} ${ticker}`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to place order' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const username = process.env.TASTYTRADE_USERNAME
    const password = process.env.TASTYTRADE_PASSWORD

    if (!username || !password) {
      return NextResponse.json({ error: 'Tastytrade credentials not configured' }, { status: 400 })
    }

    // Login
    const loginResponse = await fetch('https://api.tastyworks.com/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: username, password }),
    })

    const { data: session } = await loginResponse.json()
    const token = session.user.remember_token

    // Get accounts
    const accountsResponse = await fetch('https://api.tastyworks.com/customers/me/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const { data: accounts } = await accountsResponse.json()
    const accountNumber = accounts.items[0].account_number

    // Get open orders
    const ordersResponse = await fetch(
      `https://api.tastyworks.com/accounts/${accountNumber}/orders?status=open`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const { data: orders } = await ordersResponse.json()

    return NextResponse.json({
      orders: orders.items.map((o: any) => ({
        orderId: o.order_id,
        ticker: o.symbol,
        side: o.side,
        quantity: o.quantity,
        filledQty: o.filled_quantity,
        type: o.order_type,
        status: o.status,
        createdAt: o.created_at,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
