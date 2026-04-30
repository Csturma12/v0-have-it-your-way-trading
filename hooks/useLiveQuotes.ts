'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Global deduplication - prevent multiple components from fetching the same tickers simultaneously
const pendingFetches = new Map<string, Promise<Record<string, unknown>>>()

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
  const tickersRef = useRef(tickers.join(','))

  // Initialize quotes with loading state
  useEffect(() => {
    const tickerKey = tickers.join(',')
    if (tickerKey !== tickersRef.current) {
      tickersRef.current = tickerKey
      const initial: Record<string, LiveQuote> = {}
      tickers.forEach(t => {
        initial[t] = { ticker: t, price: 0, change: 0, changePercent: 0, loading: true }
      })
      setQuotes(initial)
    }
  }, [tickers])

  const fetchQuotes = useCallback(async () => {
    if (!enabled || tickers.length === 0) return

    const tickerParam = tickers.join(',')
    
    // Deduplicate: if this exact request is already in flight, wait for it
    const existingFetch = pendingFetches.get(tickerParam)
    if (existingFetch) {
      try {
        const data = await existingFetch
        const fetchedQuotes = (data as { quotes?: Record<string, unknown> }).quotes ?? {}
        setQuotes(prev => {
          const next: Record<string, LiveQuote> = {}
          tickers.forEach(t => {
            const q = fetchedQuotes[t] as Record<string, unknown> | undefined
            next[t] = q ? parseQuoteData(q, t) : { ...prev[t], loading: false, error: 'No data' }
          })
          return next
        })
        setLastUpdated(new Date())
      } catch {
        // Error already handled by original request
      }
      return
    }

    setIsLoading(true)
    
    const fetchPromise = fetch(`/api/polygon/batch-quotes?tickers=${tickerParam}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch quotes')
        return res.json()
      })
    
    pendingFetches.set(tickerParam, fetchPromise)
    
    try {
      const data = await fetchPromise
      const fetchedQuotes = data.quotes ?? {}

      setQuotes(prev => {
        const next: Record<string, LiveQuote> = {}
        tickers.forEach(t => {
          const q = fetchedQuotes[t]
          next[t] = q ? parseQuoteData(q, t) : { ...prev[t], loading: false, error: 'No data' }
        })
        return next
      })
      setLastUpdated(new Date())
    } catch (err) {
      console.error('[useLiveQuotes] Error:', err)
      setQuotes(prev => {
        const next: Record<string, LiveQuote> = {}
        tickers.forEach(t => {
          next[t] = { ...prev[t], loading: false, error: 'Fetch failed' }
        })
        return next
      })
    } finally {
      pendingFetches.delete(tickerParam)
      setIsLoading(false)
    }
  }, [tickers, enabled])

  // Fetch on mount and at interval
  useEffect(() => {
    if (!enabled || tickers.length === 0) return

    fetchQuotes()
    const interval = setInterval(fetchQuotes, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchQuotes, refreshInterval, enabled, tickers.length])

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
