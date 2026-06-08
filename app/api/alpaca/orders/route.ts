import { NextResponse } from 'next/server'

/**
 * Returns recent Alpaca paper-trading orders across all statuses.
 * Used by the Trade Updates panel to show live order activity via polling
 * (more reliable than a browser WebSocket, and never exposes the secret key).
 */
export async function GET() {
  const apiKeyId = process.env.ALPACA_API_KEY_ID || process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET_KEY || process.env.ALPACA_SECRET_API_KEY

  if (!apiKeyId || !apiSecret) {
    return NextResponse.json(
      { error: 'Alpaca API credentials not configured', connected: false },
      { status: 400 }
    )
  }

  try {
    // Fetch the most recent orders (all statuses), newest first.
    const res = await fetch(
      'https://paper-api.alpaca.markets/v2/orders?status=all&limit=50&direction=desc&nested=true',
      {
        headers: {
          'APCA-API-KEY-ID': apiKeyId,
          'APCA-API-SECRET-KEY': apiSecret,
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Failed to fetch orders: ${text}`, connected: false },
        { status: res.status }
      )
    }

    const orders = await res.json()

    const updates = (Array.isArray(orders) ? orders : []).map((o: any) => {
      // Derive an "event" from the order status so the UI can show meaningful states.
      const status: string = o.status || 'new'
      let event = status
      if (status === 'filled') event = 'fill'
      else if (status === 'partially_filled') event = 'partial_fill'
      else if (status === 'pending_new' || status === 'accepted') event = 'new'

      return {
        event,
        timestamp: o.filled_at || o.updated_at || o.submitted_at || o.created_at,
        price: o.filled_avg_price ?? o.limit_price ?? null,
        qty: o.filled_qty ?? o.qty,
        order: {
          id: o.id,
          client_order_id: o.client_order_id,
          symbol: o.symbol,
          asset_class: o.asset_class,
          side: o.side,
          qty: o.qty,
          filled_qty: o.filled_qty,
          filled_avg_price: o.filled_avg_price,
          order_type: o.order_type || o.type,
          type: o.type,
          time_in_force: o.time_in_force,
          limit_price: o.limit_price,
          stop_price: o.stop_price,
          status: o.status,
          created_at: o.created_at,
          updated_at: o.updated_at,
          submitted_at: o.submitted_at,
          filled_at: o.filled_at,
          canceled_at: o.canceled_at,
          expired_at: o.expired_at,
          legs: o.legs,
        },
      }
    })

    return NextResponse.json({ connected: true, updates })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
        connected: false,
      },
      { status: 500 }
    )
  }
}
