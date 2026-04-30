import { NextRequest, NextResponse } from 'next/server'
import { getWebullAuthUrl, getWebullCredentials, isWebullConfigured } from '@/lib/brokers/webull'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

/**
 * GET /api/brokers/webull/auth
 * Initiate Webull OAuth flow - redirects user to Webull login
 */
export async function GET() {
  // Check if Webull is configured
  if (!isWebullConfigured()) {
    return NextResponse.json(
      { error: 'Webull integration not configured. Please add WEBULL_* environment variables.' },
      { status: 503 }
    )
  }
  
  const credentials = getWebullCredentials()
  if (!credentials) {
    return NextResponse.json({ error: 'Invalid Webull configuration' }, { status: 500 })
  }
  
  // Generate state for CSRF protection
  const state = uuidv4()
  
  // Store state in cookie for verification on callback
  const authUrl = getWebullAuthUrl(credentials, state)
  
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('webull_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  })
  
  return response
}

/**
 * POST /api/brokers/webull/auth
 * Check Webull connection status
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Check for stored Webull tokens
    const { data: connection } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker', 'webull')
      .single()
    
    if (!connection) {
      return NextResponse.json({
        connected: false,
        configured: isWebullConfigured(),
      })
    }
    
    // Check if tokens are still valid
    const accessExpiry = new Date(connection.access_token_expiry)
    const refreshExpiry = new Date(connection.refresh_token_expiry)
    const now = new Date()
    
    return NextResponse.json({
      connected: true,
      configured: true,
      accessTokenValid: now < accessExpiry,
      refreshTokenValid: now < refreshExpiry,
      lastSync: connection.last_sync,
    })
  } catch (error) {
    console.error('[Webull Auth Check]', error)
    return NextResponse.json({ error: 'Failed to check connection status' }, { status: 500 })
  }
}
