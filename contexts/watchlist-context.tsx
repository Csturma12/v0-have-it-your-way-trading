'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WatchlistContextType {
  // Watchlist state
  tickers: string[]
  source: 'manual' | 'tradingview' | 'webull' | 'alpaca'
  lastSynced: Date | null
  isLoading: boolean
  
  // Actions
  addTicker: (ticker: string) => void
  removeTicker: (ticker: string) => void
  setTickers: (tickers: string[], source?: WatchlistContextType['source']) => void
  refreshFromDatabase: () => Promise<void>
  syncToDatabase: () => Promise<void>
}

const WatchlistContext = createContext<WatchlistContextType | null>(null)

const DEFAULT_TICKERS = ['NVDA', 'TSLA', 'AMD', 'META', 'AAPL']

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [tickers, setTickersState] = useState<string[]>(DEFAULT_TICKERS)
  const [source, setSource] = useState<WatchlistContextType['source']>('manual')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Load user and watchlist on mount
  useEffect(() => {
    const loadUserWatchlist = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        if (!supabase) {
          setIsLoading(false)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }
        
        setUserId(user.id)

        // Load from user_watchlists table
        const { data } = await supabase
          .from('user_watchlists')
          .select('ticker, source, last_synced')
          .eq('user_id', user.id)
          .order('added_at', { ascending: false })

        if (data && data.length > 0) {
          const loadedTickers = data.map(d => d.ticker)
          setTickersState(loadedTickers)
          // Get source from first record (they should all have same source)
          if (data[0].source) setSource(data[0].source as WatchlistContextType['source'])
          if (data[0].last_synced) setLastSynced(new Date(data[0].last_synced))
        }
      } catch (error) {
        console.error('[WatchlistContext] Load error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserWatchlist()
  }, [])

  // Sync watchlist to database
  const syncToDatabase = useCallback(async () => {
    if (!userId) return
    
    try {
      const supabase = createClient()
      if (!supabase) return

      // Delete existing watchlist items
      await supabase
        .from('user_watchlists')
        .delete()
        .eq('user_id', userId)

      // Insert new items
      if (tickers.length > 0) {
        const records = tickers.map(ticker => ({
          user_id: userId,
          ticker,
          source,
          last_synced: new Date().toISOString(),
        }))

        await supabase
          .from('user_watchlists')
          .insert(records)
      }

      setLastSynced(new Date())
    } catch (error) {
      console.error('[WatchlistContext] Sync error:', error)
    }
  }, [userId, tickers, source])

  // Refresh from database
  const refreshFromDatabase = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) return

      const { data } = await supabase
        .from('user_watchlists')
        .select('ticker, source, last_synced')
        .eq('user_id', userId)
        .order('added_at', { ascending: false })

      if (data && data.length > 0) {
        setTickersState(data.map(d => d.ticker))
        if (data[0].source) setSource(data[0].source as WatchlistContextType['source'])
        if (data[0].last_synced) setLastSynced(new Date(data[0].last_synced))
      }
    } catch (error) {
      console.error('[WatchlistContext] Refresh error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Add ticker
  const addTicker = useCallback((ticker: string) => {
    const upper = ticker.toUpperCase().trim()
    if (!upper || tickers.includes(upper)) return
    
    setTickersState(prev => [...prev, upper])
    setSource('manual')
  }, [tickers])

  // Remove ticker
  const removeTicker = useCallback((ticker: string) => {
    setTickersState(prev => prev.filter(t => t !== ticker.toUpperCase()))
  }, [])

  // Set all tickers (from sync)
  const setTickers = useCallback((newTickers: string[], newSource?: WatchlistContextType['source']) => {
    const uniqueTickers = [...new Set(newTickers.map(t => t.toUpperCase().trim()).filter(Boolean))]
    setTickersState(uniqueTickers)
    if (newSource) setSource(newSource)
    setLastSynced(new Date())
  }, [])

  // Auto-sync when tickers change (debounced)
  useEffect(() => {
    if (!userId) return
    
    const timer = setTimeout(() => {
      syncToDatabase()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [tickers, userId, syncToDatabase])

  // Broadcast watchlist changes to other components
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('watchlist:updated', { detail: { tickers, source } }))
  }, [tickers, source])

  return (
    <WatchlistContext.Provider value={{
      tickers,
      source,
      lastSynced,
      isLoading,
      addTicker,
      removeTicker,
      setTickers,
      refreshFromDatabase,
      syncToDatabase,
    }}>
      {children}
    </WatchlistContext.Provider>
  )
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider')
  }
  return context
}

// Hook for components that want to listen to watchlist without requiring the provider
export function useWatchlistTickers(): string[] {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_TICKERS)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tickers: string[] }>).detail
      if (detail?.tickers) {
        setTickers(detail.tickers)
      }
    }

    window.addEventListener('watchlist:updated', handler)
    return () => window.removeEventListener('watchlist:updated', handler)
  }, [])

  return tickers
}
