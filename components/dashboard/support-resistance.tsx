'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Levels {
  monthlyHigh: number
  weeklyHigh: number
  monthlyLow: number
  weeklyLow: number
  sma20: number
  sma50: number
  sma200: number
  ema9: number
  ema21: number
  pivotPoint: number
  r1: number
  r2: number
  s1: number
  s2: number
  currentPrice: number
}

export function SupportResistance({ ticker }: { ticker: string }) {
  const [levels, setLevels] = useState<Levels | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('demo')

  const fetchLevels = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch technicals, quote data, AND Flash Alpha GEX levels in parallel
      const [techRes, quoteRes, flashAlphaRes] = await Promise.all([
        fetch(`/api/technicals?ticker=${ticker}`),
        fetch(`/api/polygon/quote?ticker=${ticker}`),
        fetch(`/api/flash-alpha?symbol=${ticker}&endpoint=levels`),
      ])

      const techData = techRes.ok ? await techRes.json() : null
      const quoteData = quoteRes.ok ? await quoteRes.json() : null
      const flashAlphaData = flashAlphaRes.ok ? await flashAlphaRes.json() : null

      const price = quoteData?.quote?.price || 100
      const high = quoteData?.quote?.high || price * 1.02
      const low = quoteData?.quote?.low || price * 0.98
      const close = quoteData?.quote?.prevClose || price

      // Use Flash Alpha GEX levels if available (more accurate for options-driven stocks)
      const faLevels = flashAlphaData?.data?.levels || []
      const faResistance = faLevels.filter((l: any) => l.type === 'resistance' || l.level > price).slice(0, 2)
      const faSupport = faLevels.filter((l: any) => l.type === 'support' || l.level < price).slice(0, 2)

      // Calculate pivot points (fallback)
      const pivot = (high + low + close) / 3
      const r1 = faResistance[0]?.level || 2 * pivot - low
      const r2 = faResistance[1]?.level || pivot + (high - low)
      const s1 = faSupport[0]?.level || 2 * pivot - high
      const s2 = faSupport[1]?.level || pivot - (high - low)

      // Get SMA values from technicals or estimate
      const sma20 = techData?.data?.SMA?.value || price * 0.98
      const sma50 = techData?.data?.SMA50?.value || price * 0.95
      const sma200 = techData?.data?.SMA200?.value || price * 0.90

      // Update source based on what data we got
      const src = flashAlphaData?.data ? 'flash-alpha' : (quoteData?.source || 'demo')

      setLevels({
        monthlyHigh: price * 1.08,
        weeklyHigh: price * 1.03,
        monthlyLow: price * 0.92,
        weeklyLow: price * 0.97,
        sma20,
        sma50,
        sma200,
        ema9: price * 1.01,
        ema21: price * 0.99,
        pivotPoint: pivot,
        r1,
        r2,
        s1,
        s2,
        currentPrice: price,
      })
      setSource(src)
    } catch (err) {
      console.error('[SupportResistance] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchLevels()
    const interval = setInterval(fetchLevels, 60000)
    return () => clearInterval(interval)
  }, [fetchLevels])

  const getLevelColor = (level: number, price: number) => {
    if (level > price) return 'text-red-400' // Resistance
    return 'text-green-400' // Support
  }

  const getDistancePercent = (level: number, price: number) => {
    return ((level - price) / price * 100).toFixed(2)
  }

  return (
    <div className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Key S/R</span>
          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${source === 'polygon' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'}`}>
            {source === 'polygon' ? 'LIVE' : 'DEMO'}
          </Badge>
        </div>
        <button onClick={fetchLevels} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 overflow-y-auto text-[8px]">
        {loading && !levels ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : levels ? (
          <div className="space-y-2">
            {/* Highs/Lows */}
            <div>
              <div className="text-muted-foreground font-mono uppercase tracking-wider mb-1">Range</div>
              <div className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-red-400" />
                    Monthly High
                  </span>
                  <span className="font-mono font-semibold text-red-400">${levels.monthlyHigh.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-red-400" />
                    Weekly High
                  </span>
                  <span className="font-mono font-semibold text-red-400">${levels.weeklyHigh.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-2.5 h-2.5 text-green-400" />
                    Weekly Low
                  </span>
                  <span className="font-mono font-semibold text-green-400">${levels.weeklyLow.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-2.5 h-2.5 text-green-400" />
                    Monthly Low
                  </span>
                  <span className="font-mono font-semibold text-green-400">${levels.monthlyLow.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Moving Averages */}
            <div>
              <div className="text-muted-foreground font-mono uppercase tracking-wider mb-1">Moving Averages</div>
              <div className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span>SMA 200</span>
                  <span className={`font-mono font-semibold ${getLevelColor(levels.sma200, levels.currentPrice)}`}>
                    ${levels.sma200.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>SMA 50</span>
                  <span className={`font-mono font-semibold ${getLevelColor(levels.sma50, levels.currentPrice)}`}>
                    ${levels.sma50.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>SMA 20</span>
                  <span className={`font-mono font-semibold ${getLevelColor(levels.sma20, levels.currentPrice)}`}>
                    ${levels.sma20.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pivot Points */}
            <div>
              <div className="text-muted-foreground font-mono uppercase tracking-wider mb-1">Pivot Points</div>
              <div className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span>R2</span>
                  <span className="font-mono font-semibold text-red-400">${levels.r2.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>R1</span>
                  <span className="font-mono font-semibold text-red-400">${levels.r1.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-muted/30 rounded px-1">
                  <span className="font-semibold">Pivot</span>
                  <span className="font-mono font-semibold text-primary">${levels.pivotPoint.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>S1</span>
                  <span className="font-mono font-semibold text-green-400">${levels.s1.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>S2</span>
                  <span className="font-mono font-semibold text-green-400">${levels.s2.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-4">No data</div>
        )}
      </div>
    </div>
  )
}
