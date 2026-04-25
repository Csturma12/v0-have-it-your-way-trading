'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  MinusCircle,
  Target,
  ShieldAlert,
  DollarSign,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
  rank: number | null
}

interface SignalsListProps {
  signals: TradingSignal[]
  summary: string
}

export function SignalsList({ signals, summary }: SignalsListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  const actionConfig = {
    BUY: {
      icon: TrendingUp,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      bgColor: 'bg-emerald-500/5',
    },
    SELL: {
      icon: TrendingDown,
      color: 'bg-red-500/10 text-red-600 border-red-500/20',
      bgColor: 'bg-red-500/5',
    },
    'NO TRADE': {
      icon: MinusCircle,
      color: 'bg-muted text-muted-foreground border-border',
      bgColor: 'bg-muted/30',
    },
  }

  const getRankBadge = (rank: number | null) => {
    if (!rank) return null
    if (rank === 1) {
      return (
        <Badge className="bg-amber-500 text-white border-amber-600">
          <Trophy className="w-3 h-3 mr-1" />
          #1 Best
        </Badge>
      )
    }
    if (rank <= 3) {
      return (
        <Badge variant="outline" className="border-amber-500/50 text-amber-600">
          #{rank}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        #{rank}
      </Badge>
    )
  }

  const passesFilter = (signal: TradingSignal) => {
    return (
      signal.action !== 'NO TRADE' &&
      (signal.risk_reward ?? 0) >= 2 &&
      signal.confidence >= 0.6
    )
  }

  const qualifyingSignals = signals.filter(passesFilter)
  const rejectedSignals = signals.filter((s) => !passesFilter(s))

  return (
    <div className="space-y-6">
      {/* Summary */}
      {summary && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-2xl font-bold">{signals.length}</p>
          <p className="text-xs text-muted-foreground">Total Analyzed</p>
        </div>
        <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
          <p className="text-2xl font-bold text-emerald-600">{qualifyingSignals.length}</p>
          <p className="text-xs text-muted-foreground">Qualifying Signals</p>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-2xl font-bold text-muted-foreground">{rejectedSignals.length}</p>
          <p className="text-xs text-muted-foreground">Filtered Out</p>
        </div>
      </div>

      {/* Qualifying Signals */}
      {qualifyingSignals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Top Trading Signals
          </h3>
          {qualifyingSignals.map((signal, index) => {
            const config = actionConfig[signal.action]
            const ActionIcon = config.icon
            const isExpanded = expandedIndex === index
            const confidencePercent = Math.round(signal.confidence * 100)

            return (
              <Card key={signal.ticker} className={`overflow-hidden ${config.bgColor}`}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getRankBadge(signal.rank)}
                        <CardTitle className="text-xl">{signal.ticker}</CardTitle>
                        <Badge variant="outline" className={config.color}>
                          <ActionIcon className="w-4 h-4 mr-1" />
                          {signal.action}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {signal.setup}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{confidencePercent}% conf</span>
                        {signal.risk_reward && (
                          <span className="text-sm text-muted-foreground">
                            1:{signal.risk_reward.toFixed(1)} R/R
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {isExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {/* Price Levels */}
                    {signal.action !== 'NO TRADE' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-background/50 rounded-lg">
                          <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Entry</p>
                          <p className="font-semibold">${signal.entry?.toFixed(2) || '—'}</p>
                        </div>
                        <div className="text-center p-3 bg-red-500/10 rounded-lg">
                          <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-red-500" />
                          <p className="text-xs text-muted-foreground">Stop Loss</p>
                          <p className="font-semibold text-red-600">
                            ${signal.stop?.toFixed(2) || '—'}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                          <Target className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                          <p className="text-xs text-muted-foreground">Target</p>
                          <p className="font-semibold text-emerald-600">
                            ${signal.target?.toFixed(2) || '—'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div>
                      <p className="text-sm font-medium mb-1">Analysis</p>
                      <p className="text-sm text-muted-foreground">{signal.reason}</p>
                    </div>

                    {/* Invalidation */}
                    {signal.invalid_if && signal.action !== 'NO TRADE' && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-xs font-medium text-amber-600 mb-1">Trade Invalidation</p>
                        <p className="text-sm text-amber-700">{signal.invalid_if}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Rejected Signals (Collapsed) */}
      {rejectedSignals.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <MinusCircle className="w-4 h-4" />
              <span>{rejectedSignals.length} ticker(s) filtered out</span>
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </div>
          </summary>
          <div className="mt-3 space-y-2">
            {rejectedSignals.map((signal) => (
              <div
                key={signal.ticker}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{signal.ticker}</span>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {signal.action}
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs max-w-xs truncate">
                  {signal.reason}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
