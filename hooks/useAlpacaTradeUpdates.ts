'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Alpaca WebSocket trade updates hook.
 * Connects to wss://paper-api.alpaca.markets/stream for real-time order updates.
 * 
 * Events: new, fill, partial_fill, canceled, expired, replaced, rejected, etc.
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
  timestamp?: string
  price?: string
  qty?: string
  position_qty?: string
  execution_id?: string
  order: {
    id: string
    client_order_id: string
    symbol: string
    asset_class: 'us_equity' | 'us_option' | 'crypto'
    side: 'buy' | 'sell'
    qty: string
    filled_qty: string
    filled_avg_price: string | null
    order_type: 'market' | 'limit' | 'stop' | 'stop_limit'
    type: string
    time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok'
    limit_price: string | null
    stop_price: string | null
    status: string
    created_at: string
    updated_at: string
    submitted_at: string
    filled_at: string | null
    canceled_at: string | null
    expired_at: string | null
    legs?: any[] // For multi-leg options
  }
}

interface UseAlpacaTradeUpdatesOptions {
  onTradeUpdate?: (update: AlpacaTradeUpdate) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: string) => void
  enabled?: boolean
}

export function useAlpacaTradeUpdates(options: UseAlpacaTradeUpdatesOptions = {}) {
  const { 
    onTradeUpdate, 
    onConnected, 
    onDisconnected, 
    onError,
    enabled = true 
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<AlpacaTradeUpdate | null>(null)
  const [updates, setUpdates] = useState<AlpacaTradeUpdate[]>([])

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      // Fetch credentials from our API (never expose keys to client)
      const credRes = await fetch('/api/alpaca/ws-auth')
      if (!credRes.ok) {
        const err = await credRes.json()
        onError?.(err.error || 'Failed to get WebSocket credentials')
        return
      }
      const { key, secret, url } = await credRes.json()

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        // Send authentication message
        ws.send(JSON.stringify({
          action: 'auth',
          key,
          secret,
        }))
      }

      ws.onmessage = (event) => {
        try {
          // Alpaca uses binary frames for trade_updates
          let data: any
          if (event.data instanceof Blob) {
            // Handle binary data
            const reader = new FileReader()
            reader.onload = () => {
              try {
                data = JSON.parse(reader.result as string)
                handleMessage(data)
              } catch (e) {
                console.error('[Alpaca WS] Failed to parse binary message:', e)
              }
            }
            reader.readAsText(event.data)
            return
          } else {
            data = JSON.parse(event.data)
          }
          handleMessage(data)
        } catch (e) {
          console.error('[Alpaca WS] Failed to parse message:', e)
        }
      }

      ws.onerror = (event) => {
        console.error('[Alpaca WS] WebSocket error:', event)
        onError?.('WebSocket connection error')
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        onDisconnected?.()
        
        // Reconnect after 5 seconds if enabled
        if (enabled && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 5000)
        }
      }

      function handleMessage(data: any) {
        // Handle authorization response
        if (data.stream === 'authorization') {
          if (data.data?.status === 'authorized') {
            // Subscribe to trade updates
            ws.send(JSON.stringify({
              action: 'listen',
              data: {
                streams: ['trade_updates']
              }
            }))
          } else {
            onError?.('WebSocket authorization failed')
            ws.close()
          }
          return
        }

        // Handle listening confirmation
        if (data.stream === 'listening') {
          setIsConnected(true)
          onConnected?.()
          return
        }

        // Handle trade updates
        if (data.stream === 'trade_updates') {
          const update: AlpacaTradeUpdate = data.data
          setLastUpdate(update)
          setUpdates(prev => [update, ...prev].slice(0, 50)) // Keep last 50
          onTradeUpdate?.(update)
          return
        }

        // Handle errors
        if (data.action === 'error') {
          onError?.(data.data?.error_message || 'Unknown WebSocket error')
        }
      }

    } catch (e) {
      console.error('[Alpaca WS] Connection error:', e)
      onError?.(e instanceof Error ? e.message : 'Connection failed')
    }
  }, [enabled, onTradeUpdate, onConnected, onDisconnected, onError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect')
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    isConnected,
    lastUpdate,
    updates,
    connect,
    disconnect,
    clearUpdates: () => setUpdates([]),
  }
}
