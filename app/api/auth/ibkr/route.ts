import { NextRequest, NextResponse } from 'next/server'

// Interactive Brokers Client Portal API
// IBKR uses a session-based auth via their Client Portal Gateway
const IBKR_GATEWAY_URL = process.env.IBKR_GATEWAY_URL || 'https://localhost:5000/v1/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'status') {
    // Check authentication status
    try {
      const response = await fetch(`${IBKR_GATEWAY_URL}/iserver/auth/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          authenticated: data.authenticated,
          competing: data.competing,
          connected: data.connected,
        })
      }
    } catch {
      return NextResponse.json({ authenticated: false, error: 'Gateway not reachable' })
    }
  }

  if (action === 'reauthenticate') {
    try {
      const response = await fetch(`${IBKR_GATEWAY_URL}/iserver/reauthenticate`, {
        method: 'POST',
      })
      return NextResponse.json(await response.json())
    } catch {
      return NextResponse.json({ error: 'Reauthentication failed' }, { status: 500 })
    }
  }

  return NextResponse.json({
    provider: 'ibkr',
    status: 'requires_gateway',
    note: 'IBKR requires running their Client Portal Gateway locally or on a server',
    docs: 'https://interactivebrokers.github.io/cpwebapi/',
    setup: [
      '1. Download Client Portal Gateway from IBKR',
      '2. Run the gateway on localhost:5000',
      '3. Authenticate via the gateway web interface',
      '4. Set IBKR_GATEWAY_URL environment variable',
    ],
    requiredEnvVars: ['IBKR_GATEWAY_URL'],
  })
}

// Get accounts
export async function POST(request: NextRequest) {
  const { action } = await request.json()

  if (action === 'accounts') {
    try {
      const response = await fetch(`${IBKR_GATEWAY_URL}/iserver/accounts`, {
        method: 'GET',
      })
      
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({ accounts: data.accounts })
      }
    } catch {
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }
  }

  if (action === 'positions') {
    const accountId = request.nextUrl.searchParams.get('accountId')
    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    try {
      const response = await fetch(
        `${IBKR_GATEWAY_URL}/portfolio/${accountId}/positions/0`,
        { method: 'GET' }
      )
      return NextResponse.json(await response.json())
    } catch {
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
