'use client'

import { useState, useEffect, useCallback } from 'react'

export interface OptionContract {
  strike: number
  bid: number
  ask: number
  last: number
  volume: number
  oi: number
  iv: number
  delta: number
  gamma: number
  theta: number
  vega: number
}

export interface OptionsChainData {
  symbol: string
  underlyingPrice: number
  expirations: string[]
  selectedExpiration: string
  chain: {
    calls: OptionContract[]
    puts: OptionContract[]
  }
  source: string
}

interface UseOptionsChainOptions {
  expiration?: string
  greeks?: boolean
  refreshInterval?: number
}

export function useOptionsChain(
  symbol: string,
  options: UseOptionsChainOptions = {}
) {
  const { expiration, greeks = true, refreshInterval = 60000 } = options
  
  const [data, setData] = useState<OptionsChainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChain = useCallback(async () => {
    if (!symbol) return

    try {
      let url = `/api/tradier/options-chains?symbol=${symbol}&greeks=${greeks}`
      if (expiration) url += `&expiration=${expiration}`
      
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch options chain')
      
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [symbol, expiration, greeks])

  useEffect(() => {
    fetchChain()
    const interval = setInterval(fetchChain, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchChain, refreshInterval])

  const setExpiration = useCallback((exp: string) => {
    // Re-fetch with new expiration
    fetch(`/api/tradier/options-chains?symbol=${symbol}&expiration=${exp}&greeks=${greeks}`)
      .then(res => res.json())
      .then(setData)
      .catch(() => {})
  }, [symbol, greeks])

  return { data, loading, error, setExpiration, refresh: fetchChain }
}
