'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook for real-time watchlist updates using Supabase Realtime
 * Subscribes to user_watchlists table changes and notifies on INSERT/UPDATE/DELETE
 */
export function useWatchlistRealtime(userId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    if (!supabase) return

    // Subscribe to real-time changes on user_watchlists table for this user
    const channel = supabase
      .channel(`watchlist:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_watchlists',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useWatchlistRealtime] Change detected:', payload.eventType)
          // Payload contains the data and event type
          // Components can trigger refetch/revalidation here if needed
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
        console.log(`[useWatchlistRealtime] Status: ${status}`)
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      setIsConnected(false)
    }
  }, [userId])

  return { isConnected }
}
