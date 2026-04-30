/**
 * Webull API Integration Service
 * OAuth 2.0 authentication and trading API access
 * Docs: https://developer.webull.com/apis/docs/connect-api/authentication
 */

// Environment-based configuration
const WEBULL_CONFIG = {
  // Production endpoints
  prod: {
    authUrl: 'https://us-oauth-open-api.webullbroker.com/oauth-openapi',
    apiUrl: 'https://us-oauth-open-api.webullbroker.com/oauth-openapi',
  },
  // UAT/Test environment
  uat: {
    authUrl: 'https://us-oauth-open-api.uat.webullbroker.com/oauth-openapi',
    apiUrl: 'https://us-oauth-open-api.uat.webullbroker.com/oauth-openapi',
  },
}

export interface WebullCredentials {
  appKey: string
  appSecret: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface WebullTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiry: Date
  refreshTokenExpiry: Date
}

export interface WebullAccount {
  accountId: string
  accountType: string
  currency: string
  buyingPower: number
  totalValue: number
}

export interface WebullPosition {
  ticker: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  unrealizedPL: number
  unrealizedPLPercent: number
}

export interface WebullWatchlist {
  id: string
  name: string
  symbols: string[]
}

/**
 * Generate Webull OAuth authorization URL
 */
export function getWebullAuthUrl(credentials: WebullCredentials, state?: string): string {
  const env = process.env.WEBULL_ENV === 'production' ? 'prod' : 'uat'
  const baseUrl = WEBULL_CONFIG[env].authUrl
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    ...(state && { state }),
  })
  
  return `${baseUrl}/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeWebullCode(
  credentials: WebullCredentials,
  authCode: string
): Promise<WebullTokens> {
  const env = process.env.WEBULL_ENV === 'production' ? 'prod' : 'uat'
  const baseUrl = WEBULL_CONFIG[env].apiUrl
  const timestamp = Date.now().toString()
  
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-key': credentials.appKey,
      'x-app-secret': credentials.appSecret,
      'x-timestamp': timestamp,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: credentials.redirectUri,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Webull token exchange failed: ${error}`)
  }
  
  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    refreshTokenExpiry: new Date(Date.now() + data.refresh_token_expires_in * 1000),
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshWebullToken(
  credentials: WebullCredentials,
  refreshToken: string
): Promise<WebullTokens> {
  const env = process.env.WEBULL_ENV === 'production' ? 'prod' : 'uat'
  const baseUrl = WEBULL_CONFIG[env].apiUrl
  const timestamp = Date.now().toString()
  
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-key': credentials.appKey,
      'x-app-secret': credentials.appSecret,
      'x-timestamp': timestamp,
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to refresh Webull token')
  }
  
  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    refreshTokenExpiry: new Date(Date.now() + data.refresh_token_expires_in * 1000),
  }
}

/**
 * Create authenticated Webull API client
 */
export class WebullClient {
  private credentials: WebullCredentials
  private tokens: WebullTokens
  private baseUrl: string
  
  constructor(credentials: WebullCredentials, tokens: WebullTokens) {
    this.credentials = credentials
    this.tokens = tokens
    const env = process.env.WEBULL_ENV === 'production' ? 'prod' : 'uat'
    this.baseUrl = WEBULL_CONFIG[env].apiUrl
  }
  
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Check if token needs refresh
    if (new Date() >= this.tokens.accessTokenExpiry) {
      this.tokens = await refreshWebullToken(this.credentials, this.tokens.refreshToken)
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.tokens.accessToken}`,
        'x-app-key': this.credentials.appKey,
        'x-timestamp': Date.now().toString(),
        ...options?.headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Webull API error: ${response.status}`)
    }
    
    return response.json()
  }
  
  /**
   * Get list of user accounts
   */
  async getAccounts(): Promise<WebullAccount[]> {
    const data = await this.request<{ accounts: WebullAccount[] }>('/account/list')
    return data.accounts || []
  }
  
  /**
   * Get positions for an account
   */
  async getPositions(accountId: string): Promise<WebullPosition[]> {
    const data = await this.request<{ positions: WebullPosition[] }>(`/account/${accountId}/positions`)
    return data.positions || []
  }
  
  /**
   * Get user's watchlists
   */
  async getWatchlists(): Promise<WebullWatchlist[]> {
    const data = await this.request<{ watchlists: WebullWatchlist[] }>('/watchlist/list')
    return data.watchlists || []
  }
  
  /**
   * Get symbols from a specific watchlist
   */
  async getWatchlistSymbols(watchlistId: string): Promise<string[]> {
    const data = await this.request<{ symbols: string[] }>(`/watchlist/${watchlistId}/symbols`)
    return data.symbols || []
  }
  
  /**
   * Get all unique symbols across all watchlists
   */
  async getAllWatchlistSymbols(): Promise<string[]> {
    const watchlists = await this.getWatchlists()
    const allSymbols = new Set<string>()
    
    for (const wl of watchlists) {
      wl.symbols.forEach(s => allSymbols.add(s))
    }
    
    return Array.from(allSymbols)
  }
  
  /**
   * Get current tokens (for storage)
   */
  getTokens(): WebullTokens {
    return this.tokens
  }
}

/**
 * Webull connection status
 */
export interface WebullConnectionStatus {
  connected: boolean
  lastSync: Date | null
  accountCount: number
  positionCount: number
  watchlistCount: number
  error?: string
}

/**
 * Check if Webull credentials are configured
 */
export function isWebullConfigured(): boolean {
  return !!(
    process.env.WEBULL_APP_KEY &&
    process.env.WEBULL_APP_SECRET &&
    process.env.WEBULL_CLIENT_ID &&
    process.env.WEBULL_CLIENT_SECRET
  )
}

/**
 * Get Webull credentials from environment
 */
export function getWebullCredentials(): WebullCredentials | null {
  if (!isWebullConfigured()) return null
  
  return {
    appKey: process.env.WEBULL_APP_KEY!,
    appSecret: process.env.WEBULL_APP_SECRET!,
    clientId: process.env.WEBULL_CLIENT_ID!,
    clientSecret: process.env.WEBULL_CLIENT_SECRET!,
    redirectUri: process.env.WEBULL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/brokers/webull/callback`,
  }
}
