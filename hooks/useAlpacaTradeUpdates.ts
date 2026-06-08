'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import useSWR from 'swr'

/**
 * Alpaca trade updates hook.
 *
 * Uses reliable polling against /api/alpaca/orders instead of a browser
 * WebSocket. The previous WebSocket approach exposed the API secret to the
 * client and frequently failed to stay connected in the preview environment
 * (binary frame handling + auth handshake). Polling the REST orders endpoint
 * gives us the same live order activity without those issues.
 */

export interface AlpacaTradeUpdate {
  event:
    | 'new'
    | 'fill'
    | 'partial_fill'
    | 'canceled'
    | 'expired'
    | 'done_for_day'
    | 'replaced'
    | 'accepted'
    | 'rejected'
    | 'pending_new'
    | 'pending_cancel'
    | 'pending_replace'
    | 'stopped'
    | 'calculated'
    | 'suspended'
    | 'order_replace_rejected'
    | 'order_cancel_rejected'
    | string
  timestamp?: string
  price?: string | null
  qty?: string
  position_qty?: string
  execution_id?: string
  order: {
    id: string
    client_order_id: string
    symbol: string
    asset_class: 'us_equity' | 'us_option' | 'crypto' | string
    side: 'buy' | 'sell'
    qty: string
    filled_qty: string
    filled_avg_price: string | null
    order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | string
    type: string
    time_in_force: string
    limit_price: string | null
    stop_price: string | null
    status: string
    created_at: string
    updated_at: string
    submitted_at: string
    filled_at: string | null
    canceled_at: string | null
    expired_at: string | null
    legs?: any[]
  }
}

interface OrdersResponse {
  connected: boolean
  updates?: AlpacaTradeUpdate[]
  error?: string
}

interface UseAlpacaTradeUpdatesOptions {
  onTradeUpdate?: (update: AlpacaTradeUpdate) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: string) => void
  enabled?: boolean
  /** Poll interval in ms. Defaults to 5s. */
  refreshInterval?: number
}

const fetcher = async (url: string): Promise<OrdersResponse> => {
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch orders')
  }
  return data
}

export function useAlpacaTradeUpdates(options: UseAlpacaTradeUpdatesOptions = {}) {
  const {
    onTradeUpdate,
    onConnected,
    onDisconnected,
    onError,
    enabled = true,
    refreshInterval = 5000,
  } = options

  const [updates, setUpdates] = useState<AlpacaTradeUpdate[]>([])
  const [lastUpdate, setLastUpdate] = useState<AlpacaTradeUpdate | null>(null)
  const seenRef = useRef<Map<string, string>>(new Map())
  const wasConnectedRef = useRef(false)

  const { data, error, mutate } = useSWR<OrdersResponse>(
    enabled ? '/api/alpaca/orders' : null,
    fetcher,
    {
      refreshInterval: enabled ? refreshInterval : 0,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  const isConnected = !!data?.connected && !error

  // Track connect/disconnect transitions.
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      wasConnectedRef.current = true
      onConnected?.()
    } else if (!isConnected && wasConnectedRef.current) {
      wasConnectedRef.current = false
      onDisconnected?.()
    }
  }, [isConnected, onConnected, onDisconnected])

  // Surface errors.
  useEffect(() => {
    if (error) {
      onError?.(error instanceof Error ? error.message : 'Connection error')
    }
  }, [error, onError])

  // Diff incoming orders and emit new/changed events.
  useEffect(() => {
    const incoming = data?.updates
    if (!incoming || incoming.length === 0) return

    // Newest-first list from the API.
    setUpdates(incoming.slice(0, 50))
    setLastUpdate(incoming[0] ?? null)

    // Fire callback only for orders we haven't seen in this state before.
    const seen = seenRef.current
    // Iterate oldest-first so callbacks arrive in chronological order.
    for (let i = incoming.length - 1; i >= 0; i--) {
      const u = incoming[i]
      const key = u.order.id
      const stateSig = `${u.order.status}:${u.order.filled_qty}`
      if (seen.get(key) !== stateSig) {
        seen.set(key, stateSig)
        // Skip the very first hydration burst to avoid replaying history.
        if (wasConnectedRef.current) {
          onTradeUpdate?.(u)
        }
      }
    }
  }, [data, onTradeUpdate])

  const connect = useCallback(() => {
    mutate()
  }, [mutate])

  const disconnect = useCallback(() => {
    // No persistent connection to tear down with polling.
  }, [])

  return {
    isConnected,
    lastUpdate,
    updates,
    connect,
    disconnect,
    refresh: mutate,
    clearUpdates: () => setUpdates([]),
  }
}
