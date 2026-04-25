'use client'

import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react'

interface TradingSignal {
  ticker: string
  action: 'BUY' | 'SELL' | 'NO TRADE'
  setup: 'BREAKOUT' | 'PULLBACK' | 'REVERSAL' | 'MOMENTUM' | 'NO SETUP'
  confidence: number
  entry: number | null
  stop: number | null
  target: number | null
  risk_reward: number | null
  reason: string
  invalid_if: string
}

interface SignalCardProps {
  signal: TradingSignal
  rank?: number
}

export function SignalCard({ signal, rank }: SignalCardProps) {
  const isTradeSignal = signal.action !== 'NO TRADE'
  const isBuy = signal.action === 'BUY'
  const isSell = signal.action === 'SELL'

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return 'bg-green-500/20 text-green-700 border-green-500/30'
      case 'SELL':
        return 'bg-red-500/20 text-red-700 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-500/30'
    }
  }

  const getSetupColor = (setup: string) => {
    switch (setup) {
      case 'BREAKOUT':
        return 'bg-blue-500/10 text-blue-700'
      case 'PULLBACK':
        return 'bg-purple-500/10 text-purple-700'
      case 'REVERSAL':
        return 'bg-orange-500/10 text-orange-700'
      case 'MOMENTUM':
        return 'bg-cyan-500/10 text-cyan-700'
      default:
        return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getRiskRewardColor = (rr: number | null) => {
    if (!rr) return 'text-muted-foreground'
    if (rr >= 3) return 'text-green-600 font-semibold'
    if (rr >= 2) return 'text-green-500 font-semibold'
    return 'text-orange-500'
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600'
    if (conf >= 0.6) return 'text-emerald-500'
    if (conf >= 0.4) return 'text-yellow-500'
    return 'text-orange-500'
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {rank && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
              #{rank}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold">{signal.ticker}</span>
              <Badge variant="default" className={getActionColor(signal.action)}>
                {isBuy && <ArrowUpRight className="w-3 h-3 mr-1" />}
                {isSell && <ArrowDownLeft className="w-3 h-3 mr-1" />}
                {signal.action}
              </Badge>
            </div>
            <Badge variant="secondary" className={getSetupColor(signal.setup)}>
              {signal.setup}
            </Badge>
          </div>
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-muted-foreground">Confidence</span>
          <span className={`text-sm font-semibold ${getConfidenceColor(signal.confidence)}`}>
            {(signal.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all rounded-full ${
              signal.confidence >= 0.75
                ? 'bg-green-500'
                : signal.confidence >= 0.5
                  ? 'bg-emerald-500'
                  : 'bg-yellow-500'
            }`}
            style={{ width: `${signal.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Reason */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Setup Reason</p>
        <p className="text-sm text-foreground">{signal.reason}</p>
      </div>

      {/* Trade Details */}
      {isTradeSignal && signal.entry && (
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Entry</p>
            <p className="text-sm font-semibold">${signal.entry.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Stop</p>
            <p className="text-sm font-semibold text-red-500">
              ${signal.stop?.toFixed(2) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Target</p>
            <p className="text-sm font-semibold text-green-500">
              ${signal.target?.toFixed(2) || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Risk/Reward */}
      {isTradeSignal && signal.risk_reward && (
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
          <span className="text-sm font-medium text-muted-foreground">Risk/Reward Ratio</span>
          <span className={`text-lg font-bold ${getRiskRewardColor(signal.risk_reward)}`}>
            1:{signal.risk_reward.toFixed(2)}
          </span>
        </div>
      )}

      {/* Invalid Conditions */}
      {signal.invalid_if && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-900 mb-1">Trade Invalid If</p>
              <p className="text-xs text-amber-800">{signal.invalid_if}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Trade Explanation */}
      {!isTradeSignal && (
        <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-gray-900 mb-1">Why No Trade?</p>
              <p className="text-xs text-gray-700">{signal.reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
