import { NextRequest, NextResponse } from 'next/server'
import { exchangeWebullCode, getWebullCredentials } from '@/lib/brokers/webull'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/brokers/webull/callback
 * OAuth callback handler - exchanges code for tokens
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/brokers?error=${encodeURIComponent(error)}`, req.url)
    )
  }
  
  // Verify state (CSRF protection)
  const storedState = req.cookies.get('webull_oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/settings/brokers?error=invalid_state', req.url)
    )
  }
  
  if (!code) {
    return NextResponse.redirect(
      new URL('/settings/brokers?error=no_code', req.url)
    )
  }
  
  try {
    const credentials = getWebullCredentials()
    if (!credentials) {
      throw new Error('Webull not configured')
    }
    
    // Exchange code for tokens
    const tokens = await exchangeWebullCode(credentials, code)
    
    // Get authenticated user
    const supabase = await createClient()
    if (!supabase) {
      throw new Error('Database not available')
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?redirect=/settings/brokers', req.url)
      )
    }
    
    // Store tokens in database (encrypted in production)
    await supabase.from('broker_connections').upsert({
      user_id: user.id,
      broker: 'webull',
      access_token: tokens.accessToken, // Should be encrypted in production
      refresh_token: tokens.refreshToken, // Should be encrypted in production
      access_token_expiry: tokens.accessTokenExpiry.toISOString(),
      refresh_token_expiry: tokens.refreshTokenExpiry.toISOString(),
      connected_at: new Date().toISOString(),
      last_sync: null,
    }, {
      onConflict: 'user_id,broker',
    })
    
    // Clear OAuth state cookie
    const response = NextResponse.redirect(
      new URL('/settings/brokers?success=webull_connected', req.url)
    )
    response.cookies.delete('webull_oauth_state')
    
    return response
  } catch (error) {
    console.error('[Webull Callback Error]', error)
    return NextResponse.redirect(
      new URL(`/settings/brokers?error=${encodeURIComponent('Failed to connect Webull')}`, req.url)
    )
  }
}
