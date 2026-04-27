import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const username = process.env.TASTYTRADE_USERNAME
    const password = process.env.TASTYTRADE_PASSWORD

    if (!username || !password) {
      return NextResponse.json({ error: 'Tastytrade credentials not configured' }, { status: 400 })
    }

    // Login to get session token
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

    // Get accounts
    const accountsResponse = await fetch('https://api.tastyworks.com/customers/me/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!accountsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 400 })
    }

    const { data: accounts } = await accountsResponse.json()
    const account = accounts.items[0]

    // Get account balance
    const balanceResponse = await fetch(
      `https://api.tastyworks.com/accounts/${account.account_number}/balances`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const { data: balance } = await balanceResponse.json()

    return NextResponse.json({
      broker: 'tastytrade',
      accountId: account.account_number,
      accountType: account.account_type,
      status: account.is_margin_enabled ? 'Margin' : 'Cash',
      balance: balance.cash_balance,
      portfolioValue: balance.net_liquidating_value,
      buyingPower: balance.buying_power,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch account' },
      { status: 500 }
    )
  }
}
