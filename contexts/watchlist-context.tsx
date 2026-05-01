'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ===========================================
// TYPES
// ===========================================

export type WatchlistPurpose = 'general' | 'pattern_scan' | 'signals' | 'sector' | 'custom'

export interface Watchlist {
  id: string
  name: string
  tickers: string[]
  purpose: WatchlistPurpose
  source: 'manual' | 'tradingview' | 'webull' | 'alpaca'
  color: string
  isActive: boolean
  scanEnabled: boolean  // If true, bot actively scans these tickers for patterns
  lastSynced: Date | null
}

export interface WatchlistContextType {
  // All watchlists
  watchlists: Watchlist[]
  isLoading: boolean
  
  // Active/primary watchlist (for backward compatibility)
  activeWatchlist: Watchlist | null
  tickers: string[]  // Tickers from active watchlist
  source: 'manual' | 'tradingview' | 'webull' | 'alpaca'
  lastSynced: Date | null
  
  // Pattern scan watchlists (for bot)
  patternScanTickers: string[]  // All tickers from watchlists with scanEnabled=true
  
  // Watchlist actions
  createWatchlist: (name: string, purpose: WatchlistPurpose, color?: string) => Promise<Watchlist | null>
  deleteWatchlist: (id: string) => Promise<void>
  renameWatchlist: (id: string, name: string) => Promise<void>
  setActiveWatchlist: (id: string) => void
  toggleScanEnabled: (id: string, enabled: boolean) => Promise<void>
  
  // Ticker actions (on active watchlist)
  addTicker: (ticker: string, watchlistId?: string) => void
  removeTicker: (ticker: string, watchlistId?: string) => void
  setTickers: (tickers: string[], source?: WatchlistContextType['source'], watchlistId?: string) => void
  
  // Refresh
  refreshFromDatabase: () => Promise<void>
}

const WatchlistContext = createContext<WatchlistContextType | null>(null)

const DEFAULT_TICKERS = [
  'SP:SPX', 'TVC:DXY', 'BITSTAMP:BTCUSD', 'BINANCE:BTCUSDT', 'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'TVC:USOIL', 'TVC:UKOIL', 'COMEX:GC1!', 'TVC:VIX', 'TVC:GOLD',
  'NASDAQ:CRWV', 'NYSE:PFE', 'NASDAQ:GOOG', 'NASDAQ:NFLX', 'NYSE:CCJ', 'NYSE:AGI', 'NASDAQ:FITB', 'BCBA:ARKK', 'NYSE:QS', 'NYSE:BA', 'NYSE:NIO', 'NASDAQ:WYFI', 'NASDAQ:IREN', 'NYSE:CSTM',
  'NASDAQ:NVDA', 'NASDAQ:TSLA', 'NASDAQ:AAPL', 'NASDAQ:MSFT', 'NASDAQ:AMD', 'NASDAQ:AMZN', 'NASDAQ:PLTR', 'NASDAQ:META', 'NASDAQ:MU', 'NASDAQ:INTC', 'NASDAQ:GOOGL', 'NASDAQ:AVGO', 'NASDAQ:SNDK',
  'NYSE:ORCL', 'NASDAQ:HOOD', 'NASDAQ:COIN', 'NASDAQ:SOFI', 'NASDAQ:ARM', 'NASDAQ:NBIS', 'NYSE:TSM', 'NASDAQ:RKLB', 'NASDAQ:MRVL', 'NYSE:HIMS', 'NYSE:OKLO', 'NASDAQ:POET', 'NYSE:NOW', 'NYSE:UNH',
  'NASDAQ:ASTS', 'NASDAQ:QCOM', 'NYSE:BE', 'NYSE:XOM', 'NASDAQ:LITE', 'NASDAQ:SMCI', 'NYSE:CRM', 'NASDAQ:APLD', 'NASDAQ:PYPL', 'NASDAQ:ADBE', 'NYSE:NKE', 'NASDAQ:CRWD', 'NYSE:LLY', 'NYSE:VRT',
  'NASDAQ:ASML', 'NYSE:JPM', 'NYSE:BAC', 'NYSE:NVO', 'NYSE:GEV', 'NYSE:KO', 'NASDAQ:PANW', 'NYSE:CVX', 'NASDAQ:STX', 'NYSE:DELL', 'NYSE:MP', 'NASDAQ:COST', 'NSE:SUNPHARMA', 'NYSE:CLS', 'NYSE:V',
  'NYSE:IBM', 'NASDAQ:OPEN', 'NYSE:SNOW', 'NYSE:PL', 'NYSE:OXY', 'NYSE:CAT', 'NASDAQ:CEG', 'NYSE:BRK.B', 'NASDAQ:SHOP', 'NASDAQ:SOUN', 'NYSE:LMT', 'NYSE:CIEN', 'NASDAQ:BULL', 'NYSE:VST', 'NASDAQ:LULU',
  'AMEX:UEC', 'NSE:TATASTEEL', 'NASDAQ:CSCO', 'NYSE:RBLX', 'NYSE:PG', 'NYSE:RTX', 'NASDAQ:QUBT', 'NASDAQ:PLUG', 'NYSE:NET', 'NYSE:GE', 'NYSE:HD', 'NASDAQ:HUT', 'NASDAQ:DDOG', 'NASDAQ:MELI', 'NASDAQ:INTU',
  'NYSE:C', 'NYSE:AXP', 'NYSE:DOCN', 'NYSE:XYZ', 'NASDAQ:FISV', 'NYSE:KLAR', 'NYSE:PSUS', 'NYSE:PS', 'NASDAQ:SPACEX', 'NASDAQ:DISCORD', 'NASDAQ:ANTHROPIC', 'NASDAQ:OPENAI', 'NASDAQ:DATABRICKS',
  'NASDAQ:STRIPE', 'NASDAQ:CANVA', 'NYSE:ALB', 'NYSE:DOW', 'NYSE:CF', 'NYSE:NTR', 'NASDAQ:MSTR', 'NYSE:SPOT', 'NASDAQ:FSLY', 'NASDAQ:TTD', 'NYSE:HPQ', 'TSX:CSU', 'NYSE:IOT', 'NASDAQ:MNDY', 'NASDAQ:Z', 'NASDAQ:ABNB'
]

const DEFAULT_WATCHLIST: Watchlist = {
  id: 'default',
  name: 'My Watchlist',
  tickers: DEFAULT_TICKERS,
  purpose: 'general',
  source: 'manual',
  color: 'cyan',
  isActive: true,
  scanEnabled: false,
  lastSynced: null,
}

// ===========================================
// PROVIDER
// ===========================================

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([DEFAULT_WATCHLIST])
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('default')
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasLoadedRef = useRef(false)

  // Derived state
  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0] || null
  const tickers = activeWatchlist?.tickers || []
  const source = activeWatchlist?.source || 'manual'
  const lastSynced = activeWatchlist?.lastSynced || null
  
  // All tickers from watchlists with scanEnabled=true (for bot pattern scanning)
  const patternScanTickers = [...new Set(
    watchlists
      .filter(w => w.scanEnabled)
      .flatMap(w => w.tickers)
  )]

  // Load watchlists from database
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loadWatchlists = async () => {
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

        // Load all watchlists for this user
        const { data, error } = await supabase
          .from('user_watchlists')
          .select('*')
          .eq('user_id', user.id)
          .order('name')

        if (error) {
          console.error('[WatchlistContext] Load error:', error)
        }

        if (data && data.length > 0) {
          const loaded: Watchlist[] = data.map(row => ({
            id: row.id,
            name: row.name || 'My Watchlist',
            tickers: Array.isArray(row.tickers) ? row.tickers : [],
            purpose: (row.purpose as WatchlistPurpose) || 'general',
            source: (row.source as Watchlist['source']) || 'manual',
            color: row.color || 'cyan',
            isActive: row.is_active !== false,
            scanEnabled: row.scan_enabled === true,
            lastSynced: row.last_synced ? new Date(row.last_synced) : null,
          }))
          
          setWatchlists(loaded)
          
          // Set active to first general watchlist or first in list
          const generalList = loaded.find(w => w.purpose === 'general') || loaded[0]
          if (generalList) {
            setActiveWatchlistId(generalList.id)
          }
        }
      } catch (error) {
        console.error('[WatchlistContext] Load error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadWatchlists()
  }, [])

  // Save a specific watchlist to database
  const saveWatchlist = useCallback(async (watchlist: Watchlist) => {
    if (!userId) return
    
    try {
      const supabase = createClient()
      if (!supabase) return

      const now = new Date().toISOString()
      
      await supabase
        .from('user_watchlists')
        .upsert({
          id: watchlist.id === 'default' ? undefined : watchlist.id, // Let DB generate ID for new
          user_id: userId,
          name: watchlist.name,
          tickers: watchlist.tickers,
          purpose: watchlist.purpose,
          source: watchlist.source,
          color: watchlist.color,
          is_active: watchlist.isActive,
          scan_enabled: watchlist.scanEnabled,
          last_synced: now,
        }, { onConflict: 'id' })
    } catch (error) {
      console.error('[WatchlistContext] Save error:', error)
    }
  }, [userId])

  // Debounced save when watchlists change
  useEffect(() => {
    if (!userId || isLoading) return
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      // Save all watchlists that have been modified
      watchlists.forEach(w => {
        if (w.id !== 'default') { // Don't save the default placeholder
          saveWatchlist(w)
        }
      })
    }, 1500)
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [watchlists, userId, isLoading, saveWatchlist])

  // Create new watchlist
  const createWatchlist = useCallback(async (
    name: string, 
    purpose: WatchlistPurpose, 
    color: string = 'cyan'
  ): Promise<Watchlist | null> => {
    if (!userId) return null
    
    try {
      const supabase = createClient()
      if (!supabase) return null

      const { data, error } = await supabase
        .from('user_watchlists')
        .insert({
          user_id: userId,
          name,
          tickers: [],
          purpose,
          source: 'manual',
          color,
          is_active: true,
          scan_enabled: purpose === 'pattern_scan', // Auto-enable scanning for pattern watchlists
        })
        .select()
        .single()

      if (error) {
        console.error('[WatchlistContext] Create error:', error)
        return null
      }

      const newWatchlist: Watchlist = {
        id: data.id,
        name: data.name,
        tickers: [],
        purpose: data.purpose as WatchlistPurpose,
        source: 'manual',
        color: data.color,
        isActive: true,
        scanEnabled: data.scan_enabled,
        lastSynced: new Date(),
      }

      setWatchlists(prev => [...prev.filter(w => w.id !== 'default'), newWatchlist])
      return newWatchlist
    } catch (error) {
      console.error('[WatchlistContext] Create error:', error)
      return null
    }
  }, [userId])

  // Delete watchlist
  const deleteWatchlist = useCallback(async (id: string) => {
    if (!userId || id === 'default') return
    
    try {
      const supabase = createClient()
      if (!supabase) return

      await supabase
        .from('user_watchlists')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      setWatchlists(prev => {
        const remaining = prev.filter(w => w.id !== id)
        // If deleted active, switch to another
        if (activeWatchlistId === id && remaining.length > 0) {
          setActiveWatchlistId(remaining[0].id)
        }
        return remaining.length > 0 ? remaining : [DEFAULT_WATCHLIST]
      })
    } catch (error) {
      console.error('[WatchlistContext] Delete error:', error)
    }
  }, [userId, activeWatchlistId])

  // Rename watchlist
  const renameWatchlist = useCallback(async (id: string, name: string) => {
    setWatchlists(prev => prev.map(w => 
      w.id === id ? { ...w, name } : w
    ))
  }, [])

  // Toggle scan enabled
  const toggleScanEnabled = useCallback(async (id: string, enabled: boolean) => {
    setWatchlists(prev => prev.map(w => 
      w.id === id ? { ...w, scanEnabled: enabled } : w
    ))
  }, [])

  // Set active watchlist
  const setActiveWatchlist = useCallback((id: string) => {
    setActiveWatchlistId(id)
  }, [])

  // Add ticker to a watchlist
  const addTicker = useCallback((ticker: string, watchlistId?: string) => {
    const upper = ticker.toUpperCase().trim()
    if (!upper) return
    
    const targetId = watchlistId || activeWatchlistId
    
    setWatchlists(prev => prev.map(w => {
      if (w.id !== targetId) return w
      if (w.tickers.includes(upper)) return w
      return { ...w, tickers: [...w.tickers, upper], source: 'manual' as const }
    }))
  }, [activeWatchlistId])

  // Remove ticker from a watchlist
  const removeTicker = useCallback((ticker: string, watchlistId?: string) => {
    const targetId = watchlistId || activeWatchlistId
    
    setWatchlists(prev => prev.map(w => {
      if (w.id !== targetId) return w
      return { ...w, tickers: w.tickers.filter(t => t !== ticker.toUpperCase()) }
    }))
  }, [activeWatchlistId])

  // Set all tickers for a watchlist
  const setTickers = useCallback((
    newTickers: string[], 
    newSource?: WatchlistContextType['source'],
    watchlistId?: string
  ) => {
    const targetId = watchlistId || activeWatchlistId
    const uniqueTickers = [...new Set(newTickers.map(t => t.toUpperCase().trim()).filter(Boolean))]
    
    setWatchlists(prev => prev.map(w => {
      if (w.id !== targetId) return w
      return { 
        ...w, 
        tickers: uniqueTickers, 
        source: newSource || w.source 
      }
    }))
  }, [activeWatchlistId])

  // Refresh from database
  const refreshFromDatabase = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    hasLoadedRef.current = false
    
    // Re-trigger the load effect
    const supabase = createClient()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    try {
      const { data } = await supabase
        .from('user_watchlists')
        .select('*')
        .eq('user_id', userId)
        .order('name')

      if (data && data.length > 0) {
        const loaded: Watchlist[] = data.map(row => ({
          id: row.id,
          name: row.name || 'My Watchlist',
          tickers: Array.isArray(row.tickers) ? row.tickers : [],
          purpose: (row.purpose as WatchlistPurpose) || 'general',
          source: (row.source as Watchlist['source']) || 'manual',
          color: row.color || 'cyan',
          isActive: row.is_active !== false,
          scanEnabled: row.scan_enabled === true,
          lastSynced: row.last_synced ? new Date(row.last_synced) : null,
        }))
        
        setWatchlists(loaded)
      }
    } catch (error) {
      console.error('[WatchlistContext] Refresh error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Broadcast changes
  useEffect(() => {
    if (isLoading) return
    window.dispatchEvent(new CustomEvent('watchlist:updated', { 
      detail: { 
        tickers, 
        source,
        patternScanTickers,
        watchlists 
      } 
    }))
  }, [tickers, source, patternScanTickers, watchlists, isLoading])

  return (
    <WatchlistContext.Provider value={{
      watchlists,
      isLoading,
      activeWatchlist,
      tickers,
      source,
      lastSynced,
      patternScanTickers,
      createWatchlist,
      deleteWatchlist,
      renameWatchlist,
      setActiveWatchlist,
      toggleScanEnabled,
      addTicker,
      removeTicker,
      setTickers,
      refreshFromDatabase,
    }}>
      {children}
    </WatchlistContext.Provider>
  )
}

// ===========================================
// HOOKS
// ===========================================

const DEFAULT_CONTEXT: WatchlistContextType = {
  watchlists: [DEFAULT_WATCHLIST],
  isLoading: false,
  activeWatchlist: DEFAULT_WATCHLIST,
  tickers: DEFAULT_TICKERS,
  source: 'manual',
  lastSynced: null,
  patternScanTickers: [],
  createWatchlist: async () => null,
  deleteWatchlist: async () => {},
  renameWatchlist: async () => {},
  setActiveWatchlist: () => {},
  toggleScanEnabled: async () => {},
  addTicker: () => {},
  removeTicker: () => {},
  setTickers: () => {},
  refreshFromDatabase: async () => {},
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  return context ?? DEFAULT_CONTEXT
}

// Get tickers from active watchlist (backward compatible)
export function useWatchlistTickers(): string[] {
  const { tickers } = useWatchlist()
  return tickers
}

// Get all tickers with scan enabled (for bot pattern scanning)
export function usePatternScanTickers(): string[] {
  const { patternScanTickers } = useWatchlist()
  return patternScanTickers
}

// Get watchlists by purpose
export function useWatchlistsByPurpose(purpose: WatchlistPurpose): Watchlist[] {
  const { watchlists } = useWatchlist()
  return watchlists.filter(w => w.purpose === purpose)
}
