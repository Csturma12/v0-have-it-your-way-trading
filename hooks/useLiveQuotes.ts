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
  
  // Stabilize tickers reference - only change when the actual tickers change
  const tickerKey = useMemo(() => tickers.sort().join(','), [tickers])
  const tickersRef = useRef<string[]>(tickers)
  
  // Update ref when tickers change
  useEffect(() => {
    tickersRef.current = tickers
  }, [tickerKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize quotes with loading state when tickers change
  useEffect(() => {
    if (tickers.length === 0) return
    const initial: Record<string, LiveQuote> = {}
    tickers.forEach(t => {
      initial[t] = { ticker: t, price: 0, change: 0, changePercent: 0, loading: true }
    })
    setQuotes(initial)
  }, [tickerKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuotes = useCallback(async () => {
    const currentTickers = tickersRef.current
    if (!enabled || currentTickers.length === 0) return

    const now = Date.now()
    const tickerParam = currentTickers.join(',')

    // Check if we can use cached data
    const allCached = currentTickers.every(t => {
      const cached = globalQuoteCache.get(t)
      return cached && (now - cached.timestamp) < QUOTE_CACHE_TTL
    })

    if (allCached) {
      // Use cached data
      const cachedQuotes: Record<string, LiveQuote> = {}
      currentTickers.forEach(t => {
        const cached = globalQuoteCache.get(t)
        if (cached) {
          cachedQuotes[t] = parseQuoteData(cached.quote as Record<string, unknown>, t)
        }
      })
      setQuotes(cachedQuotes)
      return
    }

    // Global throttle check - don't spam the API
    if (now - lastGlobalFetch < GLOBAL_THROTTLE_MS) {
      return // Skip this fetch, wait for next interval
    }

    // Deduplicate: if this exact request is already in flight, wait for it
    const existingFetch = pendingFetches.get(tickerParam)
    if (existingFetch) {
      try {
        const data = await existingFetch
        const fetchedQuotes = (data as { quotes?: Record<string, unknown> }).quotes ?? {}
        const nextQuotes: Record<string, LiveQuote> = {}
        currentTickers.forEach(t => {
          const q = fetchedQuotes[t] as Record<string, unknown> | undefined
          nextQuotes[t] = q ? parseQuoteData(q, t) : { ticker: t, price: 0, change: 0, changePercent: 0, loading: false, error: 'No data' }
        })
        setQuotes(nextQuotes)
        setLastUpdated(new Date())
      } catch {
        // Error already handled by original request
      }
      return
    }

    setIsLoading(true)
    
    const fetchPromise = fetch(`/api/polygon/batch-quotes?tickers=${encodeURIComponent(tickerParam)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch quotes')
        return res.json()
      })
    
    pendingFetches.set(tickerParam, fetchPromise)
    lastGlobalFetch = now
    
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

      const nextQuotes: Record<string, LiveQuote> = {}
      currentTickers.forEach(t => {
        const q = fetchedQuotes[t] as Record<string, unknown> | undefined
        nextQuotes[t] = q ? parseQuoteData(q, t) : { ticker: t, price: 0, change: 0, changePercent: 0, loading: false, error: 'No data' }
      })
      setQuotes(nextQuotes)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[useLiveQuotes] Error:', err)
      const errorQuotes: Record<string, LiveQuote> = {}
      currentTickers.forEach(t => {
        errorQuotes[t] = { ticker: t, price: 0, change: 0, changePercent: 0, loading: false, error: 'Fetch failed' }
      })
      setQuotes(errorQuotes)
    } finally {
      pendingFetches.delete(tickerParam)
      setIsLoading(false)
    }
  }, [enabled]) // Only depends on enabled, uses ref for tickers

  // Fetch on mount and at interval - use tickerKey to re-run when tickers change
  useEffect(() => {
    if (!enabled || tickerKey === '') return

    fetchQuotes()
    const interval = setInterval(fetchQuotes, refreshInterval)
    return () => clearInterval(interval)
  }, [tickerKey, fetchQuotes, refreshInterval, enabled])

  return { quotes, isLoading, lastUpdated, refresh: fetchQuotes }
}

/**
 * Fetches a single live quote for one ticker.
 */
export function useLiveQuote(ticker: string, options: UseLiveQuotesOptions = {}) {
  const { quotes, isLoading, lastUpdated, refresh } = useLiveQuotes(
    ticker ? [ticker] : [],
    options
  )
  return {
    quote: quotes[ticker] ?? { ticker, price: 0, change: 0, changePercent: 0, loading: true },
    isLoading,
    lastUpdated,
    refresh,
  }
}
