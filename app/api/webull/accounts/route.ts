import { NextRequest, NextResponse } from 'next/server'

const WEBULL_API_BASE = 'https://openapi.webull.com/openapi'

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('webull_access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Webull not connected. Please login at /api/auth/webull?action=login' },
        { status: 401 }
      )
    }

    const accountsResponse = await fetch(`${WEBULL_API_BASE}/trading/v1/account/list`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!accountsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Webull accounts' },
        { status: accountsResponse.status }
      )
    }

    const accountsData = await accountsResponse.json()
    const accounts = accountsData.data || []
    const account = accounts[0]

    if (!account) {
      return NextResponse.json({ error: 'No Webull accounts found' }, { status: 404 })
    }

    // Fetch account balance
    const balanceResponse = await fetch(
      `${WEBULL_API_BASE}/trading/v1/account/balance?account_id=${account.account_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    let balance = null
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json()
      balance = balanceData.data
    }

    return NextResponse.json({
      broker: 'webull',
      accountId: account.account_id,
      accountNumber: account.account_no,
      accountType: account.account_type,
      status: account.status,
      balance: balance?.cash_balance ?? null,
      portfolioValue: balance?.net_liquidating_value ?? null,
      buyingPower: balance?.day_buying_power ?? null,
      currency: account.currency || 'USD',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch account' },
      { status: 500 }
    )
  }
}
