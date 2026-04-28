import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKeyId = process.env.ALPACA_API_KEY_ID || process.env.ALPACA_API_KEY
    const apiSecret = process.env.ALPACA_API_SECRET_KEY || process.env.ALPACA_SECRET_API_KEY
    
    if (!apiKeyId || !apiSecret) {
      return NextResponse.json({ error: 'Alpaca API credentials not configured' }, { status: 400 })
    }

    const response = await fetch('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch account' }, { status: response.status })
    }

    const account = await response.json()

    return NextResponse.json({
      broker: 'alpaca',
      accountId: account.id,
      accountNumber: account.account_number,
      status: account.status,
      balance: parseFloat(account.cash),
      portfolioValue: parseFloat(account.portfolio_value),
      buyingPower: parseFloat(account.buying_power),
      daytradeCount: account.daytrade_count,
      recentTrades: account.trade_suspended_by_user ? 'Suspended' : 'Active',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch account' },
      { status: 500 }
    )
  }
}
