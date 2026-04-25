import { NextRequest, NextResponse } from 'next/server'

// Tastytrade API endpoints
const TASTYTRADE_API_URL = 'https://api.tastytrade.com'
const TASTYTRADE_SANDBOX_URL = 'https://api.cert.tastytrade.com'

export async function GET(request: NextRequest) {
  const useSandbox = process.env.TASTYTRADE_SANDBOX === 'true'
  const baseUrl = useSandbox ? TASTYTRADE_SANDBOX_URL : TASTYTRADE_API_URL

  return NextResponse.json({
    provider: 'tastytrade',
    environment: useSandbox ? 'sandbox' : 'production',
    status: 'configured',
    docs: 'https://developer.tastytrade.com',
    authMethod: 'session_token',
    note: 'Tastytrade uses username/password to create a session token',
    requiredEnvVars: ['TASTYTRADE_USERNAME', 'TASTYTRADE_PASSWORD', 'TASTYTRADE_SANDBOX'],
    endpoints: {
      login: `${baseUrl}/sessions`,
      accounts: `${baseUrl}/customers/me/accounts`,
      positions: `${baseUrl}/accounts/{account_number}/positions`,
    },
  })
}

export async function POST(request: NextRequest) {
  const { action, username, password, accountNumber } = await request.json()

  const useSandbox = process.env.TASTYTRADE_SANDBOX === 'true'
  const baseUrl = useSandbox ? TASTYTRADE_SANDBOX_URL : TASTYTRADE_API_URL

  // Use provided credentials or fall back to env vars
  const loginUser = username || process.env.TASTYTRADE_USERNAME
  const loginPass = password || process.env.TASTYTRADE_PASSWORD

  if (action === 'login') {
    if (!loginUser || !loginPass) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      )
    }

    try {
      const response = await fetch(`${baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: loginUser,
          password: loginPass,
          'remember-me': true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return NextResponse.json(
          { error: error.error?.message || 'Authentication failed' },
          { status: 401 }
        )
      }

      const data = await response.json()
      
      return NextResponse.json({
        success: true,
        sessionToken: data.data['session-token'],
        user: {
          email: data.data.user.email,
          username: data.data.user.username,
          externalId: data.data.user['external-id'],
        },
      })
    } catch {
      return NextResponse.json(
        { error: 'Failed to connect to Tastytrade' },
        { status: 500 }
      )
    }
  }

  if (action === 'accounts') {
    const sessionToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    try {
      const response = await fetch(`${baseUrl}/customers/me/accounts`, {
        headers: { 'Authorization': sessionToken },
      })

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
      }

      const data = await response.json()
      return NextResponse.json({
        accounts: data.data.items.map((item: { account: { 'account-number': string; nickname: string; 'margin-or-cash': string; 'day-trader-status': boolean } }) => ({
          accountNumber: item.account['account-number'],
          nickname: item.account.nickname,
          marginOrCash: item.account['margin-or-cash'],
          dayTraderStatus: item.account['day-trader-status'],
        })),
      })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }
  }

  if (action === 'positions' && accountNumber) {
    const sessionToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    try {
      const response = await fetch(`${baseUrl}/accounts/${accountNumber}/positions`, {
        headers: { 'Authorization': sessionToken },
      })

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
      }

      const data = await response.json()
      return NextResponse.json({ positions: data.data.items })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
