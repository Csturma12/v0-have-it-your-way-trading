import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('ibkr_access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with IBKR' },
        { status: 401 }
      )
    }

    // Get IBKR accounts
    const accountsResponse = await fetch('https://api.ibkr.com/v1/api/iserver/accounts', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!accountsResponse.ok) {
      if (accountsResponse.status === 401) {
        // Try to refresh token
        const refreshToken = request.cookies.get('ibkr_refresh_token')?.value
        if (!refreshToken) {
          return NextResponse.json(
            { error: 'Token expired and no refresh token available' },
            { status: 401 }
          )
        }

        // Refresh the token
        const refreshResponse = await fetch('https://api.ibkr.com/auth/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: process.env.IBKR_CLIENT_ID || '',
            client_secret: process.env.IBKR_CLIENT_SECRET || '',
          }),
        })

        if (!refreshResponse.ok) {
          return NextResponse.json(
            { error: 'Token refresh failed' },
            { status: 401 }
          )
        }

        const newTokens = await refreshResponse.json()
        const response = NextResponse.json({ error: 'Token refreshed, retry' }, { status: 401 })
        response.cookies.set({
          name: 'ibkr_access_token',
          value: newTokens.access_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: newTokens.expires_in || 3600,
        })
        return response
      }

      return NextResponse.json(
        { error: `IBKR API error: ${accountsResponse.statusText}` },
        { status: accountsResponse.status }
      )
    }

    const accounts = await accountsResponse.json()
    
    // Get account summary for each account
    const accountSummaries = await Promise.all(
      (accounts.accounts || []).map(async (account: string) => {
        try {
          const summaryResponse = await fetch(
            `https://api.ibkr.com/v1/api/iserver/account/${account}/summary`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          )
          
          if (summaryResponse.ok) {
            const summary = await summaryResponse.json()
            return {
              id: account,
              summary,
            }
          }
          return { id: account, summary: null }
        } catch {
          return { id: account, summary: null }
        }
      })
    )

    return NextResponse.json({
      accounts: accountSummaries,
    })
  } catch (error) {
    console.error('[v0] IBKR accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}
