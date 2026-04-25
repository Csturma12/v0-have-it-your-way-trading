'use client'

import { useState } from 'react'
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
  AlertCircle,
  Activity,
} from 'lucide-react'

export interface TradingSignal {
  rank: number
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
  risk_notes: string[] | null
}

export interface ScannerSummary {
  market_bias: string
  best_opportunity: string
  risk_level: 'low' | 'medium' | 'high'
  notes: string
}

interface SignalsListProps {
  signals: TradingSignal[]
  scanner_summary: ScannerSummary | null
}

// Mirror the backend validateSignal logic exactly
function validateSignal(signal: TradingSignal): boolean {
  if (!['BUY', 'SELL', 'NO TRADE'].includes(signal.action)) return false
  if (signal.action === 'NO TRADE') return true
  if (signal.confidence < 0.65) return false
  if (!signal.risk_reward || signal.risk_reward < 2) return false
  if (!signal.entry || !signal.stop || !signal.target) return false
  if (signal.action === 'BUY') {
    if (signal.stop >= signal.entry) return false
    if (signal.target <= signal.entry) return false
  }
  if (signal.action === 'SELL') {
    if (signal.stop <= signal.entry) return false
    if (signal.target >= signal.entry) return false
  }
  return true
}

const ACTION_CONFIG = {
  BUY: {
    Icon: TrendingUp,
    badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    ring: 'ring-1 ring-emerald-500/20',
    accent: 'bg-emerald-500/8',
  },
  SELL: {
    Icon: TrendingDown,
    badge: 'bg-red-500/15 text-red-700 border-red-500/30',
    ring: 'ring-1 ring-red-500/20',
    accent: 'bg-red-500/8',
  },
  'NO TRADE': {
    Icon: MinusCircle,
    badge: 'bg-muted text-muted-foreground border-border',
    ring: '',
    accent: 'bg-muted/30',
  },
} as const

const RISK_LEVEL_CONFIG = {
  low: { color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  medium: { color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20' },
  high: { color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/20' },
}

const SETUP_COLORS: Record<string, string> = {
  BREAKOUT: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  PULLBACK: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  REVERSAL: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  MOMENTUM: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  'NO SETUP': 'bg-muted text-muted-foreground border-border',
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <Badge className="bg-amber-500 text-white border-amber-600 shrink-0">
        <Trophy className="w-3 h-3 mr-1" />
        #1
      </Badge>
    )
  if (rank <= 3)
    return (
      <Badge variant="outline" className="border-amber-500/50 text-amber-600 shrink-0">
        #{rank}
      </Badge>
    )
  return (
    <Badge variant="outline" className="text-muted-foreground shrink-0">
      #{rank}
    </Badge>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.75 ? 'bg-emerald-500' : value >= 0.65 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Confidence</span>
        <span className="font-medium text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SignalsList({ signals, scanner_summary }: SignalsListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0)

  const qualifyingSignals = signals.filter((s) => s.action !== 'NO TRADE' && validateSignal(s))
  const rejectedSignals = signals.filter((s) => s.action === 'NO TRADE' || !validateSignal(s))

  return (
    <div className="space-y-6">
      {/* Scanner Summary */}
      {scanner_summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Scanner Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Market Bias</p>
                <p className="text-sm font-semibold capitalize">{scanner_summary.market_bias}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Risk Level</p>
                <p className={`text-sm font-semibold capitalize ${RISK_LEVEL_CONFIG[scanner_summary.risk_level]?.color}`}>
                  {scanner_summary.risk_level}
                </p>
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Best Opportunity</p>
              <p className="text-sm font-medium">{scanner_summary.best_opportunity}</p>
            </div>
            {scanner_summary.notes && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {scanner_summary.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <p className="text-xl font-bold">{signals.length}</p>
          <p className="text-xs text-muted-foreground">Analyzed</p>
        </div>
        <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
          <p className="text-xl font-bold text-emerald-600">{qualifyingSignals.length}</p>
          <p className="text-xs text-muted-foreground">Qualifying</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <p className="text-xl font-bold text-muted-foreground">{rejectedSignals.length}</p>
          <p className="text-xs text-muted-foreground">Filtered Out</p>
        </div>
      </div>

      {/* Qualifying signals */}
      {qualifyingSignals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Ranked Signals
          </h3>

          {qualifyingSignals.map((signal, index) => {
            const cfg = ACTION_CONFIG[signal.action]
            const isExpanded = expandedIndex === index
            const riskRewardStr = signal.risk_reward ? `1:${signal.risk_reward.toFixed(1)}` : null

            return (
              <Card key={`${signal.ticker}-${signal.rank}`} className={`overflow-hidden ${cfg.ring}`}>
                {/* Header row — always visible */}
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                >
                  <CardHeader className={`pb-2 ${cfg.accent}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <RankBadge rank={signal.rank} />
                      <span className="text-lg font-bold">{signal.ticker}</span>
                      <Badge variant="outline" className={cfg.badge}>
                        <cfg.Icon className="w-3.5 h-3.5 mr-1" />
                        {signal.action}
                      </Badge>
                      <Badge variant="outline" className={SETUP_COLORS[signal.setup] ?? ''}>
                        {signal.setup}
                      </Badge>
                      <div className="flex-1" />
                      {riskRewardStr && (
                        <span className="text-xs text-muted-foreground font-medium">{riskRewardStr} R/R</span>
                      )}
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                    {/* Inline price summary when collapsed */}
                    {!isExpanded && signal.action !== 'NO TRADE' && signal.entry && (
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1 ml-0.5">
                        <span>Entry <span className="text-foreground font-medium">${signal.entry.toFixed(2)}</span></span>
                        <span>Stop <span className="text-red-600 font-medium">${signal.stop?.toFixed(2)}</span></span>
                        <span>Target <span className="text-emerald-600 font-medium">${signal.target?.toFixed(2)}</span></span>
                      </div>
                    )}
                  </CardHeader>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <CardContent className="space-y-4 pt-4">
                    {/* Confidence bar */}
                    <ConfidenceBar value={signal.confidence} />

                    {/* Price levels */}
                    {signal.action !== 'NO TRADE' && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Entry</p>
                          <p className="font-semibold text-sm">${signal.entry?.toFixed(2) ?? '—'}</p>
                        </div>
                        <div className="text-center p-3 bg-red-500/10 rounded-lg">
                          <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-red-500" />
                          <p className="text-xs text-muted-foreground">Stop Loss</p>
                          <p className="font-semibold text-sm text-red-600">${signal.stop?.toFixed(2) ?? '—'}</p>
                        </div>
                        <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                          <Target className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                          <p className="text-xs text-muted-foreground">Target</p>
                          <p className="font-semibold text-sm text-emerald-600">${signal.target?.toFixed(2) ?? '—'}</p>
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analysis</p>
                      <p className="text-sm text-foreground">{signal.reason}</p>
                    </div>

                    {/* Invalidation */}
                    {signal.invalid_if && signal.action !== 'NO TRADE' && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-700 mb-0.5">Trade Invalidation</p>
                          <p className="text-xs text-amber-700">{signal.invalid_if}</p>
                        </div>
                      </div>
                    )}

                    {/* Risk notes */}
                    {signal.risk_notes && signal.risk_notes.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk Notes</p>
                        <ul className="space-y-1">
                          {signal.risk_notes.map((note, i) => (
                            <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                              <span className="text-muted-foreground/50 shrink-0">•</span>
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Filtered / NO TRADE signals */}
      {rejectedSignals.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors select-none">
              <MinusCircle className="w-4 h-4" />
              <span>{rejectedSignals.length} ticker{rejectedSignals.length !== 1 ? 's' : ''} filtered out</span>
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </div>
          </summary>
          <div className="mt-3 space-y-2">
            {rejectedSignals.map((signal) => (
              <div
                key={`${signal.ticker}-rejected`}
                className="flex items-start justify-between gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-mono font-semibold">{signal.ticker}</span>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {signal.action}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground text-right leading-relaxed">{signal.reason}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
