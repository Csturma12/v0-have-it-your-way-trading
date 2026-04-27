import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.ALPACA_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Alpaca API key not configured' }, { status: 400 })
    }

    const response = await fetch('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': apiKey,
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
