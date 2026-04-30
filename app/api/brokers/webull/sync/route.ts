import { NextRequest, NextResponse } from 'next/server'
import { WebullClient, getWebullCredentials, WebullTokens } from '@/lib/brokers/webull'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/brokers/webull/sync
 * Sync watchlist and positions from Webull
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
    
    // Get stored Webull tokens
    const { data: connection, error: fetchError } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker', 'webull')
      .single()
    
    if (fetchError || !connection) {
      return NextResponse.json({ error: 'Webull not connected' }, { status: 400 })
    }
    
    const credentials = getWebullCredentials()
    if (!credentials) {
      return NextResponse.json({ error: 'Webull not configured' }, { status: 503 })
    }
    
    // Create client with stored tokens
    const tokens: WebullTokens = {
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      accessTokenExpiry: new Date(connection.access_token_expiry),
      refreshTokenExpiry: new Date(connection.refresh_token_expiry),
    }
    
    const client = new WebullClient(credentials, tokens)
    
    // Fetch all data from Webull
    const [accounts, watchlists] = await Promise.all([
      client.getAccounts().catch(() => []),
      client.getWatchlists().catch(() => []),
    ])
    
    // Get positions from first account
    let positions: { ticker: string; quantity: number; marketValue: number }[] = []
    if (accounts.length > 0) {
      positions = await client.getPositions(accounts[0].accountId).catch(() => [])
    }
    
    // Collect all watchlist symbols
    const watchlistSymbols = new Set<string>()
    for (const wl of watchlists) {
      wl.symbols.forEach(s => watchlistSymbols.add(s.toUpperCase()))
    }
    
    // Also add symbols from positions
    positions.forEach(p => watchlistSymbols.add(p.ticker.toUpperCase()))
    
    const allSymbols = Array.from(watchlistSymbols)
    
    // Update user's watchlist in database
    await supabase.from('user_watchlists').upsert({
      user_id: user.id,
      tickers: allSymbols,
      source: 'webull',
      last_synced: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    
    // Update connection last_sync
    const newTokens = client.getTokens()
    await supabase.from('broker_connections').update({
      access_token: newTokens.accessToken,
      refresh_token: newTokens.refreshToken,
      access_token_expiry: newTokens.accessTokenExpiry.toISOString(),
      refresh_token_expiry: newTokens.refreshTokenExpiry.toISOString(),
      last_sync: new Date().toISOString(),
    }).eq('user_id', user.id).eq('broker', 'webull')
    
    return NextResponse.json({
      success: true,
      accountCount: accounts.length,
      watchlistCount: watchlists.length,
      positionCount: positions.length,
      symbolCount: allSymbols.length,
      symbols: allSymbols.slice(0, 20), // Return first 20 for preview
      hasMore: allSymbols.length > 20,
    })
  } catch (error) {
    console.error('[Webull Sync Error]', error)
    return NextResponse.json({ error: 'Failed to sync with Webull' }, { status: 500 })
  }
}
