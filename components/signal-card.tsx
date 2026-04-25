'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, MinusCircle, Target, ShieldAlert, DollarSign } from 'lucide-react'

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
}

export function SignalCard({ signal }: SignalCardProps) {
  const actionConfig = {
    BUY: { icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    SELL: { icon: TrendingDown, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    'NO TRADE': { icon: MinusCircle, color: 'bg-muted text-muted-foreground border-border' },
  }

  const config = actionConfig[signal.action]
  const ActionIcon = config.icon

  const confidencePercent = Math.round(signal.confidence * 100)
  const confidenceColor =
    confidencePercent >= 70
      ? 'text-emerald-600'
      : confidencePercent >= 50
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">{signal.ticker}</CardTitle>
          <Badge variant="outline" className={`text-lg px-4 py-1 ${config.color}`}>
            <ActionIcon className="w-5 h-5 mr-2" />
            {signal.action}
          </Badge>
        </div>
        <Badge variant="secondary" className="w-fit">
          {signal.setup}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Confidence Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className={`font-semibold ${confidenceColor}`}>{confidencePercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                confidencePercent >= 70
                  ? 'bg-emerald-500'
                  : confidencePercent >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        {/* Price Levels */}
        {signal.action !== 'NO TRADE' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Entry</p>
              <p className="font-semibold">${signal.entry?.toFixed(2) || '—'}</p>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-red-500" />
              <p className="text-xs text-muted-foreground">Stop Loss</p>
              <p className="font-semibold text-red-600">${signal.stop?.toFixed(2) || '—'}</p>
            </div>
            <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
              <Target className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="font-semibold text-emerald-600">${signal.target?.toFixed(2) || '—'}</p>
            </div>
          </div>
        )}

        {/* Risk/Reward */}
        {signal.risk_reward && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Risk/Reward Ratio</span>
            <span className="font-bold text-lg">1:{signal.risk_reward.toFixed(1)}</span>
          </div>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Analysis</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{signal.reason}</p>
        </div>

        {/* Invalidation */}
        {signal.invalid_if && signal.action !== 'NO TRADE' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs font-medium text-amber-600 mb-1">Trade Invalidation</p>
            <p className="text-sm text-amber-700">{signal.invalid_if}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
