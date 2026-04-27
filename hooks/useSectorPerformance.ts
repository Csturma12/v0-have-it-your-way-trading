'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SectorData {
  sector: string
  performance: number
}

export interface GainerLoser {
  ticker: string
  price: number
  change: number
  changePercent: number
  volume: number
}

interface SectorPerformanceData {
  realTimePerformance: SectorData[]
  daily: SectorData[]
  weekly: SectorData[]
  monthly: SectorData[]
  quarterly?: SectorData[]
  yearly?: SectorData[]
}

interface GainersLosersData {
  topGainers: GainerLoser[]
  topLosers: GainerLoser[]
  mostActive: GainerLoser[]
}

interface UseSectorPerformanceOptions {
  refreshInterval?: number
}

export type SectorTimeframe = 'live' | 'daily' | 'weekly' | 'monthly'

interface UseSectorPerformanceFullOptions extends UseSectorPerformanceOptions {
  timeframe?: SectorTimeframe
}

export function useSectorPerformance(options: UseSectorPerformanceFullOptions = {}) {
  const { refreshInterval = 300000, timeframe = 'live' } = options
  
  const [allSectors, setAllSectors] = useState<SectorPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')

  const fetchSectors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alpha-vantage/sectors?type=sectors')
      if (!res.ok) throw new Error('Failed to fetch sectors')
      const json = await res.json()
      setAllSectors(json)
      setSource(json.source || 'unknown')
    } catch {
      // Silently fail - mock data will be used
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSectors()
    const interval = setInterval(fetchSectors, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchSectors, refreshInterval])

  // Derive the active rows based on the selected timeframe
  const sectors = allSectors
    ? {
        ...allSectors,
        active:
          timeframe === 'daily'   ? allSectors.daily   :
          timeframe === 'weekly'  ? allSectors.weekly  :
          timeframe === 'monthly' ? allSectors.monthly :
          allSectors.realTimePerformance,
      }
    : null

  return { sectors, allSectors, loading, source, refresh: fetchSectors }
}

export function useGainersLosers(options: UseSectorPerformanceOptions = {}) {
  const { refreshInterval = 60000 } = options
  
  const [data, setData] = useState<GainersLosersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alpha-vantage/sectors?type=gainers')
      if (!res.ok) throw new Error('Failed to fetch gainers/losers')
      const json = await res.json()
      setData(json)
      setSource(json.source || 'unknown')
    } catch {
      // Silently fail - mock data will be used
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])

  return { data, loading, source, refresh: fetchData }
}
