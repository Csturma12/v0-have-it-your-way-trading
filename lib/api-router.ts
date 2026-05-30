/**
 * API Router — Distributes requests across providers to avoid rate limits.
 * 
 * Provider Rate Limits (approximate):
 * - UW (Unusual Whales): 60 req/min, strict daily limits
 * - Tradier: 120 req/min (real-time data)
 * - Finnhub: 60 req/min (free tier)
 * - Polygon: 5 req/min (free) or 100+ req/min (paid)
 * - Schwab: OAuth-based, generous limits when authenticated
 * 
 * Strategy:
 * 1. Use Tradier as primary for real-time quotes (fastest, most generous)
 * 2. Use Polygon as secondary for quotes (15-min delayed on free tier)
 * 3. Use Finnhub for fundamentals, news, earnings (good free tier)
 * 4. Use UW only for exclusive data (options flow, dark pool, GEX)
 * 5. Add Schwab as parallel data lane when OAuth is valid
 */

export type DataCategory = 
  | 'quote'           // Real-time stock price
  | 'options-chain'   // Options chains with greeks
  | 'options-flow'    // Unusual options activity (UW exclusive)
  | 'dark-pool'       // Dark pool prints (UW exclusive)
  | 'gex'             // Gamma exposure (UW exclusive)
  | 'fundamentals'    // Company metrics, financials
  | 'profile'         // Company info, description
  | 'news'            // Company/market news
  | 'earnings'        // Earnings calendar
  | 'insider'         // Insider transactions
  | 'analyst'         // Analyst ratings, price targets
  | 'technicals'      // Technical indicators
  | 'bars'            // Historical OHLCV data

export type Provider = 'tradier' | 'polygon' | 'finnhub' | 'uw' | 'schwab'

/**
 * Provider capabilities and priority for each data category.
 * First provider in the array is preferred; others are fallbacks.
 */
export const PROVIDER_PRIORITY: Record<DataCategory, Provider[]> = {
  // Quotes: Tradier (real-time) -> Schwab (real-time if auth'd) -> Polygon (delayed)
  'quote': ['tradier', 'schwab', 'polygon'],
  
  // Options chains: Tradier (real-time greeks) -> Schwab -> UW
  'options-chain': ['tradier', 'schwab'],
  
  // UW-exclusive data (no fallbacks)
  'options-flow': ['uw'],
  'dark-pool': ['uw'],
  'gex': ['uw'],
  
  // Fundamentals: Finnhub (best free tier) -> Polygon
  'fundamentals': ['finnhub', 'polygon'],
  
  // Profile: Finnhub -> Polygon
  'profile': ['finnhub', 'polygon'],
  
  // News: Finnhub -> Polygon (both have good news)
  'news': ['finnhub', 'polygon'],
  
  // Earnings: Finnhub (best calendar) -> UW (backup)
  'earnings': ['finnhub', 'uw'],
  
  // Insider: Finnhub -> UW
  'insider': ['finnhub', 'uw'],
  
  // Analyst: Finnhub only (best coverage)
  'analyst': ['finnhub'],
  
  // Technicals: Polygon (has indicator APIs)
  'technicals': ['polygon'],
  
  // Historical bars: Polygon (best historical data) -> Tradier
  'bars': ['polygon', 'tradier'],
}

/**
 * Check if a provider's API key is configured.
 */
export function isProviderConfigured(provider: Provider): boolean {
  switch (provider) {
    case 'tradier':
      return !!process.env.TRADIER_API_KEY
    case 'polygon':
      return !!process.env.POLYGON_API_KEY
    case 'finnhub':
      return !!process.env.FINNHUB_API_KEY
    case 'uw':
      return !!process.env.UNUSUAL_WHALES_API_KEY
    case 'schwab':
      // Schwab requires OAuth tokens, not just API key
      return !!(process.env.SCHWAB_CLIENT_ID && process.env.SCHWAB_CLIENT_SECRET)
    default:
      return false
  }
}

/**
 * Get the best available provider for a data category.
 * Returns the first configured provider from the priority list.
 */
export function getBestProvider(category: DataCategory): Provider | null {
  const providers = PROVIDER_PRIORITY[category]
  for (const provider of providers) {
    if (isProviderConfigured(provider)) {
      return provider
    }
  }
  return null
}

/**
 * Get all configured providers for a data category (for parallel fetching).
 */
export function getConfiguredProviders(category: DataCategory): Provider[] {
  const providers = PROVIDER_PRIORITY[category]
  return providers.filter(isProviderConfigured)
}

/**
 * Simple in-memory rate limiter to track API calls.
 * In production, consider using Redis (Upstash) for distributed rate limiting.
 */
const callCounts: Record<Provider, { count: number; resetAt: number }> = {
  tradier: { count: 0, resetAt: 0 },
  polygon: { count: 0, resetAt: 0 },
  finnhub: { count: 0, resetAt: 0 },
  uw: { count: 0, resetAt: 0 },
  schwab: { count: 0, resetAt: 0 },
}

const RATE_LIMITS: Record<Provider, number> = {
  tradier: 120,  // per minute
  polygon: 5,    // per minute (free tier)
  finnhub: 60,   // per minute
  uw: 60,        // per minute
  schwab: 120,   // per minute (generous)
}

/**
 * Check if we're likely to hit rate limits for a provider.
 * Returns true if we should try a different provider.
 */
export function isRateLimited(provider: Provider): boolean {
  const now = Date.now()
  const state = callCounts[provider]
  
  // Reset counter every minute
  if (now > state.resetAt) {
    state.count = 0
    state.resetAt = now + 60_000
  }
  
  return state.count >= RATE_LIMITS[provider] * 0.8 // 80% threshold
}

/**
 * Record an API call for rate limiting tracking.
 */
export function recordApiCall(provider: Provider): void {
  const now = Date.now()
  const state = callCounts[provider]
  
  if (now > state.resetAt) {
    state.count = 1
    state.resetAt = now + 60_000
  } else {
    state.count++
  }
}

/**
 * Get a provider that isn't rate limited for the given category.
 */
export function getAvailableProvider(category: DataCategory): Provider | null {
  const providers = getConfiguredProviders(category)
  for (const provider of providers) {
    if (!isRateLimited(provider)) {
      return provider
    }
  }
  // If all are rate limited, return the first one anyway (it may work)
  return providers[0] || null
}
