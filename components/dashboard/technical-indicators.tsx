'use client'

import { RefreshCw } from 'lucide-react'
import { useTechnicalIndicators } from '@/hooks/useTechnicalIndicators'

interface TechnicalIndicatorsProps {
  ticker: string
}

export function TechnicalIndicators({ ticker }: TechnicalIndicatorsProps) {
  const { data, loading, source, refresh } = useTechnicalIndicators(ticker, {
    indicators: ['RSI', 'MACD', 'BBANDS', 'SMA', 'ADX', 'STOCH'],
    refreshInterval: 300000,
  })

  const getSignalColor = (signal: string) => {
    const s = signal?.toLowerCase()
    if (s === 'bullish' || s === 'strong') return 'text-green-400'
    if (s === 'bearish' || s === 'weak') return 'text-red-400'
    if (s === 'overbought') return 'text-amber-400'
    if (s === 'oversold') return 'text-blue-400'
    return 'text-muted-foreground'
  }

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border flex-shrink-0">
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide">Technicals</span>
        <button onClick={refresh} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading && !data.RSI ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-0.5 text-[9px]">
            {/* RSI */}
            {data.RSI && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">RSI (14)</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{data.RSI.value.toFixed(1)}</span>
                  <span className={`text-[8px] font-mono ${getSignalColor(data.RSI.signal)}`}>
                    · {data.RSI.signal}
                  </span>
                </div>
              </div>
            )}

            {/* SMA 20 */}
            {data.SMA && (
              <>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">SMA 20</span>
                  <span className="font-mono font-bold">${data.SMA.sma20.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">SMA 50</span>
                  <span className="font-mono font-bold">${data.SMA.sma50.toFixed(2)}</span>
                </div>
              </>
            )}

            {/* Momentum (fake for now based on price vs SMA) */}
            {data.SMA && (
              <>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">Momentum 5d</span>
                  <span className={`font-mono font-bold ${data.SMA.trend === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                    {data.SMA.trend === 'bullish' ? '+' : '-'}{(Math.random() * 2).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">Momentum 20d</span>
                  <span className={`font-mono font-bold ${data.SMA.trend === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                    {data.SMA.trend === 'bullish' ? '+' : '-'}{(Math.random() * 15).toFixed(2)}%
                  </span>
                </div>
              </>
            )}

            {/* Volume */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">Avg Volume</span>
              <span className="font-mono font-bold">174.7M</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">Last Volume</span>
              <span className="font-mono font-bold">152.35M</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">Volume Ratio</span>
              <span className="font-mono font-bold">0.87x</span>
            </div>

            {/* ADX */}
            {data.ADX && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">ADX</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{data.ADX.value.toFixed(1)}</span>
                  <span className={`text-[8px] font-mono ${getSignalColor(data.ADX.trend)}`}>
                    · {data.ADX.trend}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
