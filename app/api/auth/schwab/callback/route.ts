import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('[Schwab OAuth] Error:', error)
    return NextResponse.redirect(new URL('/integrations?error=schwab_auth_failed', req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/integrations?error=no_code', req.url))
  }

  try {
    const clientId = process.env.SCHWAB_CLIENT_ID
    const clientSecret = process.env.SCHWAB_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://v0-have-it-your-way-trading.vercel.app'}/api/auth/schwab/callback`

    if (!clientId || !clientSecret) {
      throw new Error('Schwab credentials not configured')
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.schwabapi.com/v1/oauth/token', {
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
      const errorData = await tokenResponse.text()
      console.error('[Schwab OAuth] Token exchange failed:', errorData)
      throw new Error('Token exchange failed')
    }

    const tokens = await tokenResponse.json()

    // In production, store tokens securely (encrypted in database, etc.)
    // For now, we'll set a cookie to indicate connection success
    const response = NextResponse.redirect(new URL('/integrations?success=schwab_connected', req.url))
    
    // Store tokens securely - in production use encrypted storage
    response.cookies.set('schwab_connected', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    console.log('[Schwab OAuth] Successfully connected')
    return response

  } catch (error) {
    console.error('[Schwab OAuth] Error:', error)
    return NextResponse.redirect(new URL('/integrations?error=schwab_auth_failed', req.url))
  }
}
