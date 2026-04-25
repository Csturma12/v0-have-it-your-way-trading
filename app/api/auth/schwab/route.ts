import { NextRequest, NextResponse } from 'next/server'

// Schwab OAuth 2.0 endpoints (formerly TD Ameritrade)
const SCHWAB_AUTH_URL = 'https://api.schwabapi.com/v1/oauth/authorize'
const SCHWAB_TOKEN_URL = 'https://api.schwabapi.com/v1/oauth/token'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // Check for required env vars
  const clientId = process.env.SCHWAB_CLIENT_ID
  const clientSecret = process.env.SCHWAB_CLIENT_SECRET
  const redirectUri = process.env.SCHWAB_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/schwab/callback`

  if (!clientId) {
    return NextResponse.json(
      { error: 'SCHWAB_CLIENT_ID not configured' },
      { status: 500 }
    )
  }

  if (action === 'login') {
    // Redirect to Schwab OAuth login
    const authUrl = new URL(SCHWAB_AUTH_URL)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'PlaceTrades AccountAccess MoveMoney')
    
    return NextResponse.redirect(authUrl.toString())
  }

  // Handle OAuth callback
  const code = searchParams.get('code')
  if (code && clientSecret) {
    try {
      const tokenResponse = await fetch(SCHWAB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token')
      }

      const tokens = await tokenResponse.json()
      
      // In production, store tokens securely (encrypted in database)
      // For now, redirect back to integrations page with success
      return NextResponse.redirect(
        `${request.nextUrl.origin}/integrations?connected=schwab&status=success`
      )
    } catch {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/integrations?connected=schwab&status=error`
      )
    }
  }

  return NextResponse.json({
    provider: 'schwab',
    status: clientId ? 'configured' : 'not_configured',
    oauthUrl: `${request.nextUrl.origin}/api/auth/schwab?action=login`,
    docs: 'https://developer.schwab.com',
    requiredEnvVars: ['SCHWAB_CLIENT_ID', 'SCHWAB_CLIENT_SECRET', 'SCHWAB_REDIRECT_URI'],
  })
}
