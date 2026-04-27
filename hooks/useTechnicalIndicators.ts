'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Indicators {
  RSI?: { value: number; signal: string; overbought: boolean; oversold: boolean }
  MACD?: { macd: number; signal: number; histogram: number; crossover: string }
  BBANDS?: { upper: number; middle: number; lower: number; bandwidth: number; percentB: number }
  SMA?: { sma20: number; sma50: number; sma200: number; trend: string }
  EMA?: { ema12: number; ema26: number; trend: string }
  ADX?: { value: number; trend: string }
  STOCH?: { slowK: number; slowD: number; signal: string }
  ATR?: { value: number; volatility: string }
}

interface UseTechnicalIndicatorsOptions {
  indicators?: string[]
  refreshInterval?: number
}

export function useTechnicalIndicators(
  symbol: string,
  options: UseTechnicalIndicatorsOptions = {}
) {
  const { indicators = ['RSI', 'MACD', 'BBANDS', 'SMA'], refreshInterval = 300000 } = options
  
  const [data, setData] = useState<Indicators>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('unknown')

  const fetchIndicators = useCallback(async () => {
    if (!symbol) return

    try {
      const res = await fetch(
        `/api/alpha-vantage/indicators?symbol=${symbol}&indicators=${indicators.join(',')}`
      )
      
      if (!res.ok) throw new Error('Failed to fetch indicators')
      
      const json = await res.json()
      setData(json.indicators || {})
      setSource(json.source || 'unknown')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [symbol, indicators])

  useEffect(() => {
    fetchIndicators()
    const interval = setInterval(fetchIndicators, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchIndicators, refreshInterval])

  return { data, loading, error, source, refresh: fetchIndicators }
}
