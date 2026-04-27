import { useState, useEffect, useCallback } from 'react'

interface OptionsFlowData {
  id: string
  symbol: string
  strike: number
  type: 'call' | 'put'
  volume: number
  oi: number
  bid_iv: number
  ask_iv: number
  bid: number
  ask: number
  bid_size: number
  ask_size: number
  unusual: boolean
  timestamp: number
}

interface UseOptionsFlowOptions {
  symbol?: string
  type?: 'all' | 'call' | 'put'
  unusualOnly?: boolean
  refreshInterval?: number
}

export function useOptionsFlow(options: UseOptionsFlowOptions = {}) {
  const { symbol, type = 'all', unusualOnly = false, refreshInterval = 60000 } = options
  const [data, setData] = useState<OptionsFlowData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (symbol) params.append('symbol', symbol)
      params.append('type', type)
      if (unusualOnly) params.append('unusual', 'true')

      const res = await window.fetch(`/api/tradier/options-flow?${params}`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const json = await res.json()
      setData(json.data || [])
      setLastUpdated(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [symbol, type, unusualOnly])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, refreshInterval)
    return () => clearInterval(interval)
  }, [fetch, refreshInterval])

  return { data, loading, error, lastUpdated, refresh: fetch }
}
