'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
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
}

const WatchlistContext = createContext<WatchlistContextType | null>(null)

const DEFAULT_TICKERS = ['NVDA', 'TSLA', 'AMD', 'META', 'AAPL']

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [tickers, setTickersState] = useState<string[]>(DEFAULT_TICKERS)
  const [source, setSource] = useState<WatchlistContextType['source']>('manual')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasLoadedRef = useRef(false)

  // Load user and watchlist on mount
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loadUserWatchlist = async () => {
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

        // Load from user_watchlists table (array approach - one row per user)
        const { data, error } = await supabase
          .from('user_watchlists')
          .select('tickers, source, last_synced')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('[WatchlistContext] Load error:', error)
        }

        if (data?.tickers && Array.isArray(data.tickers) && data.tickers.length > 0) {
          setTickersState(data.tickers)
          if (data.source) setSource(data.source as WatchlistContextType['source'])
          if (data.last_synced) setLastSynced(new Date(data.last_synced))
        }
      } catch (error) {
        console.error('[WatchlistContext] Load error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserWatchlist()
  }, [])

  // Save watchlist to database (debounced)
  const saveToDatabase = useCallback(async (tickersToSave: string[], sourceToSave: string) => {
    if (!userId) return
    
    try {
      const supabase = createClient()
      if (!supabase) return

      const now = new Date().toISOString()
      
      await supabase
        .from('user_watchlists')
        .upsert({
          user_id: userId,
          tickers: tickersToSave,
          source: sourceToSave,
          last_synced: now,
        }, { onConflict: 'user_id' })

      setLastSynced(new Date())
    } catch (error) {
      console.error('[WatchlistContext] Save error:', error)
    }
  }, [userId])

  // Debounced save when tickers change
  useEffect(() => {
    if (!userId || isLoading) return
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(tickers, source)
    }, 1500)
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [tickers, source, userId, isLoading, saveToDatabase])

  // Refresh from database
  const refreshFromDatabase = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) return

      const { data } = await supabase
        .from('user_watchlists')
        .select('tickers, source, last_synced')
        .eq('user_id', userId)
        .maybeSingle()

      if (data?.tickers && Array.isArray(data.tickers)) {
        setTickersState(data.tickers)
        if (data.source) setSource(data.source as WatchlistContextType['source'])
        if (data.last_synced) setLastSynced(new Date(data.last_synced))
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
    if (!upper) return
    
    setTickersState(prev => {
      if (prev.includes(upper)) return prev
      return [...prev, upper]
    })
    setSource('manual')
  }, [])

  // Remove ticker
  const removeTicker = useCallback((ticker: string) => {
    setTickersState(prev => prev.filter(t => t !== ticker.toUpperCase()))
  }, [])

  // Set all tickers (from sync or bulk add)
  const setTickers = useCallback((newTickers: string[], newSource?: WatchlistContextType['source']) => {
    const uniqueTickers = [...new Set(newTickers.map(t => t.toUpperCase().trim()).filter(Boolean))]
    setTickersState(uniqueTickers)
    if (newSource) setSource(newSource)
  }, [])

  // Broadcast watchlist changes to other components (WatchlistPanel, QuickTradeIdeas, etc.)
  useEffect(() => {
    if (isLoading) return
    window.dispatchEvent(new CustomEvent('watchlist:updated', { detail: { tickers, source } }))
  }, [tickers, source, isLoading])

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
    }}>
      {children}
    </WatchlistContext.Provider>
  )
}

const DEFAULT_CONTEXT: WatchlistContextType = {
  tickers: DEFAULT_TICKERS,
  source: 'manual',
  lastSynced: null,
  isLoading: false,
  addTicker: () => {},
  removeTicker: () => {},
  setTickers: () => {},
  refreshFromDatabase: async () => {},
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  // Return default context if not in provider (happens during SSR/static gen)
  return context ?? DEFAULT_CONTEXT
}

// Hook for components that want to listen to watchlist without full context
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
