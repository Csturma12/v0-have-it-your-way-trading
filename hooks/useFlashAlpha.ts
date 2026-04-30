'use client'

import { useState, useEffect, useCallback } from 'react'

export interface GexData {
  strike: number
  gex: number
  callGex: number
  putGex: number
}

export interface DexData {
  strike: number
  dex: number
  callDex: number
  putDex: number
}

export interface LevelsData {
  callWall: number
  putWall: number
  flipPoint: number
  maxPain: number
  netGex: number
  totalGex: number
}

interface FlashAlphaResponse<T> {
  symbol: string
  endpoint: string
  data: T
  timestamp: string
}

export function useGex(symbol: string | null, enabled = true) {
  const [data, setData] = useState<GexData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGex = useCallback(async () => {
    if (!symbol || !enabled) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/flash-alpha?symbol=${symbol}&endpoint=gex`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch GEX')
      }
      const json: FlashAlphaResponse<GexData[]> = await res.json()
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [symbol, enabled])

  useEffect(() => {
    fetchGex()
  }, [fetchGex])

  return { data, loading, error, refetch: fetchGex }
}

export function useDex(symbol: string | null, enabled = true) {
  const [data, setData] = useState<DexData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDex = useCallback(async () => {
    if (!symbol || !enabled) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/flash-alpha?symbol=${symbol}&endpoint=dex`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch DEX')
      }
      const json: FlashAlphaResponse<DexData[]> = await res.json()
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [symbol, enabled])

  useEffect(() => {
    fetchDex()
  }, [fetchDex])

  return { data, loading, error, refetch: fetchDex }
}

export function useLevels(symbol: string | null, enabled = true) {
  const [data, setData] = useState<LevelsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLevels = useCallback(async () => {
    if (!symbol || !enabled) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/flash-alpha?symbol=${symbol}&endpoint=levels`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch levels')
      }
      const json: FlashAlphaResponse<LevelsData> = await res.json()
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [symbol, enabled])

  useEffect(() => {
    fetchLevels()
  }, [fetchLevels])

  return { data, loading, error, refetch: fetchLevels }
}

// Combined hook for all exposure data
export function useExposure(symbol: string | null, enabled = true) {
  const gex = useGex(symbol, enabled)
  const dex = useDex(symbol, enabled)
  const levels = useLevels(symbol, enabled)

  const refetchAll = useCallback(() => {
    gex.refetch()
    dex.refetch()
    levels.refetch()
  }, [gex, dex, levels])

  return {
    gex: gex.data,
    dex: dex.data,
    levels: levels.data,
    loading: gex.loading || dex.loading || levels.loading,
    error: gex.error || dex.error || levels.error,
    refetch: refetchAll,
  }
}
