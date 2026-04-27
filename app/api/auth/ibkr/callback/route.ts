import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/integrations?error=${error}&error_description=${searchParams.get('error_description') || ''}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/integrations?error=missing_code', request.url)
    )
  }

  try {
    // Exchange authorization code for tokens with IBKR
    const tokenResponse = await fetch('https://api.ibkr.com/auth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.IBKR_CLIENT_ID || '',
        client_secret: process.env.IBKR_CLIENT_SECRET || '',
        redirect_uri: `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/auth/ibkr/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('[v0] IBKR token exchange failed:', error)
      return NextResponse.redirect(
        new URL(`/integrations?error=token_exchange_failed`, request.url)
      )
    }

    const tokens = await tokenResponse.json()
    
    // Store tokens in secure httpOnly cookie (production would use a database)
    const response = NextResponse.redirect(
      new URL('/integrations?success=ibkr_connected', request.url)
    )
    
    response.cookies.set({
      name: 'ibkr_access_token',
      value: tokens.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
    })

    if (tokens.refresh_token) {
      response.cookies.set({
        name: 'ibkr_refresh_token',
        value: tokens.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      })
    }

    return response
  } catch (error) {
    console.error('[v0] IBKR OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/integrations?error=oauth_failed`, request.url)
    )
  }
}
