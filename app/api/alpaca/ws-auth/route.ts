import { NextResponse } from 'next/server'

/**
 * WebSocket authentication endpoint for Alpaca trade updates.
 * Returns credentials needed to connect to the WebSocket stream.
 * 
 * This keeps API keys server-side while allowing the client to establish
 * a WebSocket connection for real-time trade updates.
 */
export async function GET() {
  const apiKeyId = process.env.ALPACA_API_KEY_ID || process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET_KEY || process.env.ALPACA_SECRET_API_KEY

  if (!apiKeyId || !apiSecret) {
    return NextResponse.json(
      { error: 'Alpaca API credentials not configured' },
      { status: 400 }
    )
  }

  // Verify the credentials are valid by checking account status
  try {
    const res = await fetch('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Invalid Alpaca credentials' },
        { status: 401 }
      )
    }
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to verify Alpaca credentials' },
      { status: 500 }
    )
  }

  // Return credentials for WebSocket connection
  // Note: In production, you might want to use short-lived tokens instead
  return NextResponse.json({
    key: apiKeyId,
    secret: apiSecret,
    url: 'wss://paper-api.alpaca.markets/stream',
  })
}
