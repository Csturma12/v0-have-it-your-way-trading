'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Indicators } from '@/hooks/useTechnicalIndicators'
import type { Signal, TradeRecommendation } from '@/lib/trading-bot/pattern-detector'

interface AITradeIdea {
  ticker: string
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  source: 'claude' | 'openai'
  priceTarget?: number
  currentPrice?: number
}

interface ScanResult {
  signals: Signal[]
  recommendations: TradeRecommendation[]
  executedTrades: Array<{
    ticker: string
    side: string
    quantity: number
    price: number
    orderId?: string
    patternName?: string
  }>
  timestamp: string
}

interface UseBotScannerOptions {
  enabled: boolean
  watchlist: string[]
  scanInterval?: number // seconds
}

export function useBotScanner(options: UseBotScannerOptions) {
  const { enabled, watchlist, scanInterval = 60 } = options
  
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchIndicators = async (ticker: string): Promise<Indicators | null> => {
    try {
      const res = await fetch(`/api/alpha-vantage/indicators?symbol=${ticker}&indicators=RSI,MACD,BBANDS,SMA`)
      if (!res.ok) return null
      const data = await res.json()
      return data.indicators || null
    } catch {
      return null
    }
  }

  const fetchPrice = async (ticker: string): Promise<number> => {
    try {
      const res = await fetch(`/api/polygon?endpoint=snapshot&ticker=${ticker}`)
      if (!res.ok) return 0
      const data = await res.json()
      return data.ticker?.lastTrade?.p || data.ticker?.prevDay?.c || 0
    } catch {
      return 0
    }
  }

  const runScan = useCallback(async (
    claudeIdeas: AITradeIdea[] = [],
    openaiIdeas: AITradeIdea[] = []
  ): Promise<ScanResult | null> => {
    if (!enabled || watchlist.length === 0) return null

    setIsScanning(true)
    setError(null)

    try {
      // Fetch indicators and prices for all tickers in parallel
      const [indicatorsResults, priceResults] = await Promise.all([
        Promise.all(watchlist.map(async ticker => ({
          ticker,
          indicators: await fetchIndicators(ticker)
        }))),
        Promise.all(watchlist.map(async ticker => ({
          ticker,
          price: await fetchPrice(ticker)
        })))
      ])

      // Build maps
      const indicatorsMap: Record<string, Indicators> = {}
      const pricesMap: Record<string, number> = {}

      for (const result of indicatorsResults) {
        if (result.indicators) {
          indicatorsMap[result.ticker] = result.indicators
        }
      }

      for (const result of priceResults) {
        if (result.price > 0) {
          pricesMap[result.ticker] = result.price
        }
      }

      // Run scan via API
      const response = await fetch('/api/bot/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicatorsMap,
          pricesMap,
          claudeIdeas,
          openaiIdeas
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Scan failed')
      }

      const result: ScanResult = await response.json()
      setLastScan(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsScanning(false)
    }
  }, [enabled, watchlist])

  // Auto-scan on interval when enabled
  useEffect(() => {
    if (enabled && scanInterval > 0) {
      // Initial scan
      runScan()

      // Set up interval
      intervalRef.current = setInterval(() => {
        runScan()
      }, scanInterval * 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, scanInterval, runScan])

  return {
    isScanning,
    lastScan,
    error,
    runScan
  }
}
