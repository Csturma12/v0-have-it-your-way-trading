'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

export interface TradeIdea {
  id: string
  ticker: string
  company: string
  action: 'buy' | 'sell' | 'hold'
  currentPrice: number
  priceTarget: number
  stopLoss: number
  confidence: number
  timeframe: 'day' | 'swing' | 'position' | 'longterm'
  category: 'momentum' | 'value' | 'growth' | 'technical' | 'event'
  risk: 'low' | 'medium' | 'high'
  sentiment: 'bullish' | 'bearish' | 'neutral'
  thesis: string
  keyPoints: string[]
  technicalSignals: { indicator: string; signal: string; strength: 'weak' | 'moderate' | 'strong' }[]
  catalysts: string[]
  risks: string[]
  provider: 'claude' | 'openai'
  generatedAt: string
}

interface UseTradeIdeasOptions {
  provider: 'claude' | 'openai'
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useTradeIdeas({ provider }: UseTradeIdeasOptions) {
  const [generatedIdeas, setGeneratedIdeas] = useState<TradeIdea[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's watchlist from Supabase bot config
  const { data: watchlistData } = useSWR('/api/bot?action=config', fetcher, {
    revalidateOnFocus: false
  })

  const watchlist: string[] = watchlistData?.config?.watchlist || []

  const generateIdea = useCallback(async (ticker: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/trade-ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, provider })
      })

      if (!response.ok) {
        throw new Error('Failed to generate trade idea')
      }

      const data = await response.json()
      
      if (data.success && data.idea) {
        setGeneratedIdeas(prev => {
          // Replace if same ticker exists, otherwise add
          const existing = prev.findIndex(i => i.ticker === ticker)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = data.idea
            return updated
          }
          return [data.idea, ...prev]
        })
        return data.idea
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate idea')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [provider])

  const generateIdeasForWatchlist = useCallback(async () => {
    if (watchlist.length === 0) return

    setIsGenerating(true)
    setError(null)

    const results: TradeIdea[] = []

    // Generate ideas sequentially to avoid rate limits
    for (const ticker of watchlist.slice(0, 10)) {
      try {
        const response = await fetch('/api/trade-ideas/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, provider })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.idea) {
            results.push(data.idea)
          }
        }
      } catch {
        // Continue with next ticker
      }
    }

    setGeneratedIdeas(results)
    setIsGenerating(false)
  }, [watchlist, provider])

  const removeIdea = useCallback((id: string) => {
    setGeneratedIdeas(prev => prev.filter(i => i.id !== id))
  }, [])

  const clearIdeas = useCallback(() => {
    setGeneratedIdeas([])
  }, [])

  return {
    ideas: generatedIdeas,
    isGenerating,
    error,
    watchlist,
    generateIdea,
    generateIdeasForWatchlist,
    removeIdea,
    clearIdeas
  }
}
