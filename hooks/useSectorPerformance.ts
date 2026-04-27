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

export function useSectorPerformance(options: UseSectorPerformanceOptions = {}) {
  const { refreshInterval = 300000 } = options
  
  const [sectors, setSectors] = useState<SectorPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')

  const fetchSectors = useCallback(async () => {
    try {
      const res = await fetch('/api/alpha-vantage/sectors?type=sectors')
      if (!res.ok) throw new Error('Failed to fetch sectors')
      
      const json = await res.json()
      setSectors(json)
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

  return { sectors, loading, source, refresh: fetchSectors }
}

export function useGainersLosers(options: UseSectorPerformanceOptions = {}) {
  const { refreshInterval = 60000 } = options
  
  const [data, setData] = useState<GainersLosersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('unknown')

  const fetchData = useCallback(async () => {
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
