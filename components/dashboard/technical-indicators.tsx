'use client'

import { Activity, TrendingUp, TrendingDown, BarChart2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
    switch (signal?.toLowerCase()) {
      case 'bullish':
      case 'strong':
        return 'text-green-400'
      case 'bearish':
      case 'weak':
        return 'text-red-400'
      case 'overbought':
        return 'text-amber-400'
      case 'oversold':
        return 'text-blue-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getSignalBg = (signal: string) => {
    switch (signal?.toLowerCase()) {
      case 'bullish':
      case 'strong':
        return 'bg-green-500/20 border-green-500/40'
      case 'bearish':
      case 'weak':
        return 'bg-red-500/20 border-red-500/40'
      case 'overbought':
        return 'bg-amber-500/20 border-amber-500/40'
      case 'oversold':
        return 'bg-blue-500/20 border-blue-500/40'
      default:
        return 'bg-white/5 border-white/10'
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm">Technical Indicators</span>
          <span className="font-mono text-xs text-muted-foreground">{ticker}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${source === 'alpha_vantage' ? 'border-green-500/50 text-green-400' : 'border-amber-500/50 text-amber-400'}`}>
            {source === 'alpha_vantage' ? 'LIVE' : 'DEMO'}
          </Badge>
        </div>
        <button onClick={refresh} className="p-1 hover:bg-white/10 rounded transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* RSI */}
            {data.RSI && (
              <div className={`p-3 rounded-lg border ${getSignalBg(data.RSI.signal)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">RSI (14)</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSignalColor(data.RSI.signal)}`}>
                    {data.RSI.signal.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xl font-bold font-mono">{data.RSI.value.toFixed(1)}</div>
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      data.RSI.value > 70 ? 'bg-amber-400' : data.RSI.value < 30 ? 'bg-blue-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${data.RSI.value}%` }}
                  />
                </div>
              </div>
            )}

            {/* MACD */}
            {data.MACD && (
              <div className={`p-3 rounded-lg border ${getSignalBg(data.MACD.crossover)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">MACD</span>
                  {data.MACD.crossover !== 'none' && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSignalColor(data.MACD.crossover)}`}>
                      {data.MACD.crossover.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-mono">{data.MACD.macd.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">Signal: {data.MACD.signal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground">Hist:</span>
                  <span className={`text-xs font-mono ${data.MACD.histogram >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.MACD.histogram >= 0 ? '+' : ''}{data.MACD.histogram.toFixed(3)}
                  </span>
                </div>
              </div>
            )}

            {/* Bollinger Bands */}
            {data.BBANDS && (
              <div className="p-3 rounded-lg border bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Bollinger Bands</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upper:</span>
                    <span className="text-red-400">${data.BBANDS.upper.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Middle:</span>
                    <span>${data.BBANDS.middle.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lower:</span>
                    <span className="text-green-400">${data.BBANDS.lower.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Moving Averages */}
            {data.SMA && (
              <div className={`p-3 rounded-lg border ${getSignalBg(data.SMA.trend)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Moving Avgs</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSignalColor(data.SMA.trend)}`}>
                    {data.SMA.trend.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMA 20:</span>
                    <span>${data.SMA.sma20.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMA 50:</span>
                    <span>${data.SMA.sma50.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMA 200:</span>
                    <span>${data.SMA.sma200.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ADX */}
            {data.ADX && (
              <div className={`p-3 rounded-lg border ${getSignalBg(data.ADX.trend)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">ADX (Trend)</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSignalColor(data.ADX.trend)}`}>
                    {data.ADX.trend.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xl font-bold font-mono">{data.ADX.value.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {data.ADX.value > 25 ? 'Strong trend' : data.ADX.value > 20 ? 'Developing trend' : 'Weak/No trend'}
                </div>
              </div>
            )}

            {/* Stochastic */}
            {data.STOCH && (
              <div className={`p-3 rounded-lg border ${getSignalBg(data.STOCH.signal)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Stochastic</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSignalColor(data.STOCH.signal)}`}>
                    {data.STOCH.signal.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-mono">%K {data.STOCH.slowK.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">%D {data.STOCH.slowD.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
