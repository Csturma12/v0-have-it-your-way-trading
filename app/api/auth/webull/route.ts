import { NextRequest, NextResponse } from 'next/server'

const WEBULL_AUTH_URL = 'https://openapi.webull.com/openapi/oauth2/v1/authorize'
const WEBULL_TOKEN_URL = 'https://openapi.webull.com/openapi/oauth2/v1/token'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  const appKey = process.env.WEBULL_APP_KEY
  const appSecret = process.env.WEBULL_APP_SECRET

  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : request.nextUrl.origin
  const redirectUri = process.env.WEBULL_REDIRECT_URI || `${host}/api/auth/webull/callback`

  if (!appKey) {
    return NextResponse.json(
      { error: 'WEBULL_APP_KEY not configured' },
      { status: 500 }
    )
  }

  if (action === 'login') {
    const authUrl = new URL(WEBULL_AUTH_URL)
    authUrl.searchParams.set('client_id', appKey)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'trade account market_data')

    return NextResponse.redirect(authUrl.toString())
  }

  if (action === 'logout') {
    const response = NextResponse.redirect(new URL('/integrations?disconnected=webull', request.url))
    response.cookies.delete('webull_access_token')
    response.cookies.delete('webull_refresh_token')
    response.cookies.delete('webull_connected')
    return response
  }

  return NextResponse.json({
    provider: 'webull',
    status: appKey ? 'configured' : 'not_configured',
    oauthUrl: `${request.nextUrl.origin}/api/auth/webull?action=login`,
    docs: 'https://developer.webull.com',
    requiredEnvVars: ['WEBULL_APP_KEY', 'WEBULL_APP_SECRET', 'WEBULL_REDIRECT_URI'],
  })
}
