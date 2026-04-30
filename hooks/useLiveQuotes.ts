'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// Global deduplication - prevent multiple components from fetching the same tickers simultaneously
const pendingFetches = new Map<string, Promise<Record<string, unknown>>>()

// Global throttle - minimum time between ANY quote fetches (prevents API flooding)
let lastGlobalFetch = 0
const GLOBAL_THROTTLE_MS = 5000 // 5 seconds minimum between fetches

// Global cache for quotes (shared across all hook instances)
const globalQuoteCache = new Map<string, { quote: unknown; timestamp: number }>()
const QUOTE_CACHE_TTL = 15000 // 15 seconds

export interface LiveQuote {
  ticker: string
  price: number
  change: number
  changePercent: number
  bid?: number
  ask?: number
  volume?: string
  prevClose?: number
  loading: boolean
  error?: string
}

interface UseLiveQuotesOptions {
  refreshInterval?: number // ms, default 30000
  enabled?: boolean
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`
  return vol.toString()
}

function parseQuoteData(q: Record<string, unknown>, ticker: string): LiveQuote {
  return {
    ticker,
    price: (q.price ?? q.last ?? 0) as number,
    change: (q.change ?? 0) as number,
    changePercent: (q.changePct ?? q.changePercent ?? 0) as number,
    bid: q.bid as number | undefined,
    ask: q.ask as number | undefined,
    volume: q.volume ? formatVolume(q.volume as number) : undefined,
    prevClose: q.prevClose as number | undefined,
    loading: false,
  }
}

/**
 * Fetches live quotes for a list of tickers from Polygon API.
 * Auto-refreshes at the specified interval.
 */
export function useLiveQuotes(
  tickers: string[],
  options: UseLiveQuotesOptions = {}
) {
  const { refreshInterval = 30000, enabled = true } = options
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Stabilize tickers array - only change when actual tickers change
  const tickerKey = tickers.sort().join(',')
  const stableTickers = useMemo(() => tickers, [tickerKey])
  
  // Use ref to track current tickers without causing re-renders
  const tickersRef = useRef<string[]>(stableTickers)
  const mountedRef = useRef(true)
  
  // Update ref when tickers actually change
  useEffect(() => {
    tickersRef.current = stableTickers
  }, [stableTickers])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Initialize quotes with loading state when tickers change
  useEffect(() => {
    if (stableTickers.length === 0) return
    
    const initial: Record<string, LiveQuote> = {}
    stableTickers.forEach(t => {
      // Check cache first
      const cached = globalQuoteCache.get(t)
      if (cached && (Date.now() - cached.timestamp) < QUOTE_CACHE_TTL) {
        initial[t] = parseQuoteData(cached.quote as Record<string, unknown>, t)
      } else {
        initial[t] = { ticker: t, price: 0, change: 0, changePercent: 0, loading: true }
      }
    })
    setQuotes(initial)
  }, [stableTickers])

  const fetchQuotes = useCallback(async () => {
    const currentTickers = tickersRef.current
    if (!enabled || currentTickers.length === 0) return

    const now = Date.now()
    
    // Check if all tickers are cached
    const allCached = currentTickers.every(t => {
      const cached = globalQuoteCache.get(t)
      return cached && (now - cached.timestamp) < QUOTE_CACHE_TTL
    })

    if (allCached) {
      // Use cached data without triggering unnecessary state updates
      const cachedQuotes: Record<string, LiveQuote> = {}
      currentTickers.forEach(t => {
        const cached = globalQuoteCache.get(t)
        if (cached) {
          cachedQuotes[t] = parseQuoteData(cached.quote as Record<string, unknown>, t)
        }
      })
      if (mountedRef.current) {
        setQuotes(cachedQuotes)
      }
      return
    }

    // Global throttle check
    if (now - lastGlobalFetch < GLOBAL_THROTTLE_MS) {
      return // Too soon, skip fetch
    }

    const tickerParam = currentTickers.join(',')
    
    // Deduplicate: if this exact request is already in flight, skip
    if (pendingFetches.has(tickerParam)) {
      return
    }

    if (mountedRef.current) {
      setIsLoading(true)
    }
    
    const fetchPromise = fetch(`/api/polygon/batch-quotes?tickers=${tickerParam}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch quotes')
        return res.json()
      })
    
    pendingFetches.set(tickerParam, fetchPromise)
    lastGlobalFetch = Date.now()
    
    try {
      const data = await fetchPromise
      const fetchedQuotes = (data as { quotes?: Record<string, unknown> }).quotes ?? {}
      const fetchTime = Date.now()

      // Update global cache
      currentTickers.forEach(t => {
        if (fetchedQuotes[t]) {
          globalQuoteCache.set(t, { quote: fetchedQuotes[t], timestamp: fetchTime })
        }
      })

      if (mountedRef.current) {
        const next: Record<string, LiveQuote> = {}
        currentTickers.forEach(t => {
          const q = fetchedQuotes[t] as Record<string, unknown> | undefined
          next[t] = q ? parseQuoteData(q, t) : { ticker: t, price: 0, change: 0, changePercent: 0, loading: false, error: 'No data' }
        })
        setQuotes(next)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('[useLiveQuotes] Error:', err)
      if (mountedRef.current) {
        const next: Record<string, LiveQuote> = {}
        currentTickers.forEach(t => {
          next[t] = { ticker: t, price: 0, change: 0, changePercent: 0, loading: false, error: 'Fetch failed' }
        })
        setQuotes(next)
      }
    } finally {
      pendingFetches.delete(tickerParam)
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [enabled]) // Only depend on enabled, use ref for tickers

  // Fetch on mount and at interval - separate effect with stable dependencies
  useEffect(() => {
    if (!enabled || stableTickers.length === 0) return

    // Initial fetch with small delay to batch multiple mounts
    const initialTimeout = setTimeout(fetchQuotes, 100)
    
    // Set up interval for refresh
    const interval = setInterval(fetchQuotes, refreshInterval)
    
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [enabled, refreshInterval, stableTickers.length]) // Don't include fetchQuotes to prevent infinite loop

  return { quotes, isLoading, lastUpdated, refresh: fetchQuotes }
}

/**
 * Fetches a single live quote for one ticker.
 */
export function useLiveQuote(ticker: string, options: UseLiveQuotesOptions = {}) {
  const tickerArray = useMemo(() => ticker ? [ticker] : [], [ticker])
  const { quotes, isLoading, lastUpdated, refresh } = useLiveQuotes(tickerArray, options)
  
  return {
    quote: quotes[ticker] ?? { ticker, price: 0, change: 0, changePercent: 0, loading: true },
    isLoading,
    lastUpdated,
    refresh,
  }
}
