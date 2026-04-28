import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { ticker, side, quantity, orderType, limitPrice, stopPrice } = await req.json()
    const apiKeyId = process.env.ALPACA_API_KEY_ID || process.env.ALPACA_API_KEY
    const apiSecret = process.env.ALPACA_API_SECRET_KEY || process.env.ALPACA_SECRET_API_KEY

    if (!apiKeyId || !apiSecret) {
      return NextResponse.json({ error: 'Alpaca API credentials not configured' }, { status: 400 })
    }

    if (!ticker || !side || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const orderData: any = {
      symbol: ticker,
      qty: parseFloat(quantity),
      side: side.toLowerCase(),
      type: orderType || 'market',
      time_in_force: 'day',
    }

    if (orderType === 'limit' && limitPrice) {
      orderData.limit_price = parseFloat(limitPrice)
    }

    if (orderType === 'stop' && stopPrice) {
      orderData.stop_price = parseFloat(stopPrice)
    }

    const response = await fetch('https://paper-api.alpaca.markets/v2/orders', {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: `Order failed: ${error}` }, { status: response.status })
    }

    const order = await response.json()

    return NextResponse.json({
      success: true,
      orderId: order.id,
      ticker: order.symbol,
      side: order.side,
      quantity: order.qty,
      type: order.order_type,
      status: order.status,
      filledQty: order.filled_qty,
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
    const apiKeyId = process.env.ALPACA_API_KEY_ID || process.env.ALPACA_API_KEY
    const apiSecret = process.env.ALPACA_API_SECRET_KEY || process.env.ALPACA_SECRET_API_KEY
    
    if (!apiKeyId || !apiSecret) {
      return NextResponse.json({ error: 'Alpaca API credentials not configured' }, { status: 400 })
    }

    const response = await fetch('https://paper-api.alpaca.markets/v2/orders?status=open', {
      headers: {
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: response.status })
    }

    const orders = await response.json()

    return NextResponse.json({
      orders: orders.map((o: any) => ({
        orderId: o.id,
        ticker: o.symbol,
        side: o.side,
        quantity: o.qty,
        filledQty: o.filled_qty,
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
