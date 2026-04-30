import { NextRequest, NextResponse } from 'next/server'

const WEBULL_TOKEN_URL = 'https://openapi.webull.com/openapi/oauth2/v1/token'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('[Webull OAuth] Error:', error)
    return NextResponse.redirect(new URL('/integrations?error=webull_auth_failed', req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/integrations?error=no_code', req.url))
  }

  try {
    const appKey = process.env.WEBULL_APP_KEY
    const appSecret = process.env.WEBULL_APP_SECRET

    if (!appKey || !appSecret) {
      throw new Error('Webull credentials not configured')
    }

    const host = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : req.nextUrl.origin
    const redirectUri = process.env.WEBULL_REDIRECT_URI || `${host}/api/auth/webull/callback`

    const tokenResponse = await fetch(WEBULL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('[Webull OAuth] Token exchange failed:', errorData)
      throw new Error('Token exchange failed')
    }

    const tokens = await tokenResponse.json()

    const response = NextResponse.redirect(new URL('/integrations?success=webull_connected', req.url))

    response.cookies.set('webull_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
    })

    if (tokens.refresh_token) {
      response.cookies.set('webull_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    response.cookies.set('webull_connected', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })

    console.log('[Webull OAuth] Successfully connected')
    return response
  } catch (error) {
    console.error('[Webull OAuth] Error:', error)
    return NextResponse.redirect(new URL('/integrations?error=webull_auth_failed', req.url))
  }
}
