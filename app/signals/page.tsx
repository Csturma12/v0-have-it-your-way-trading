'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Signal,
  Brain,
  Sparkles,
  Fish,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface VettedSignal {
  id: string
  ticker: string
  action: 'BUY' | 'SELL' | 'NO TRADE'
  setup: string
  confidence: number
  entry: number
  stop: number
  target: number
  riskReward: number
  reason: string
  invalidIf: string
  claudeVerified: boolean
  openaiVerified: boolean
  whalesVerified: boolean
  timestamp: string
  riskNotes: string[]
}

const MOCK_SIGNALS: VettedSignal[] = [
  {
    id: '1',
    ticker: 'NVDA',
    action: 'BUY',
    setup: 'BREAKOUT',
    confidence: 0.94,
    entry: 875.50,
    stop: 850.00,
    target: 950.00,
    riskReward: 2.92,
    reason: 'Breaking out of 2-week consolidation with strong volume. AI chip demand continues to surge with data center buildouts.',
    invalidIf: 'Price closes below $850 or if market-wide tech selloff occurs',
    claudeVerified: true,
    openaiVerified: true,
    whalesVerified: true,
    timestamp: new Date().toISOString(),
    riskNotes: ['Earnings in 3 weeks - IV elevated', 'RSI approaching overbought'],
  },
  {
    id: '2',
    ticker: 'LLY',
    action: 'BUY',
    setup: 'MOMENTUM',
    confidence: 0.91,
    entry: 792.00,
    stop: 770.00,
    target: 850.00,
    riskReward: 2.64,
    reason: 'GLP-1 dominance continues with Mounjaro and Zepbound sales exceeding expectations. Strong institutional accumulation.',
    invalidIf: 'FDA safety concerns or competitor breakthrough',
    claudeVerified: true,
    openaiVerified: true,
    whalesVerified: true,
    timestamp: new Date().toISOString(),
    riskNotes: ['High valuation multiples', 'Competition from NVO'],
  },
  {
    id: '3',
    ticker: 'TSLA',
    action: 'SELL',
    setup: 'REVERSAL',
    confidence: 0.78,
    entry: 177.50,
    stop: 190.00,
    target: 155.00,
    riskReward: 1.80,
    reason: 'Bearish reversal pattern forming. EV demand concerns and margin pressure. Dark pool activity showing distribution.',
    invalidIf: 'Robotaxi event exceeds expectations or FSD breakthrough',
    claudeVerified: true,
    openaiVerified: false,
    whalesVerified: true,
    timestamp: new Date().toISOString(),
    riskNotes: ['High short interest', 'Musk factor unpredictable'],
  },
  {
    id: '4',
    ticker: 'META',
    action: 'BUY',
    setup: 'PULLBACK',
    confidence: 0.86,
    entry: 502.00,
    stop: 485.00,
    target: 550.00,
    riskReward: 2.82,
    reason: 'Healthy pullback to 20-day EMA. Ad revenue growth strong, AI investments paying off. Options flow bullish.',
    invalidIf: 'Regulatory pressure escalates or ad market weakens',
    claudeVerified: true,
    openaiVerified: true,
    whalesVerified: false,
    timestamp: new Date().toISOString(),
    riskNotes: ['Reality Labs losses continue'],
  },
  {
    id: '5',
    ticker: 'JPM',
    action: 'BUY',
    setup: 'BREAKOUT',
    confidence: 0.82,
    entry: 198.50,
    stop: 192.00,
    target: 215.00,
    riskReward: 2.54,
    reason: 'Breaking out of 6-month range. NII expansion continues, investment banking recovery underway.',
    invalidIf: 'Fed cuts rates aggressively or credit concerns emerge',
    claudeVerified: true,
    openaiVerified: true,
    whalesVerified: true,
    timestamp: new Date().toISOString(),
    riskNotes: ['Rate sensitive', 'Commercial real estate exposure'],
  },
]

export default function SignalsPage() {
  const [signals, setSignals] = useState<VettedSignal[]>(MOCK_SIGNALS)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const filteredSignals = signals.filter((s) => {
    if (filter === 'ALL') return s.action !== 'NO TRADE'
    return s.action === filter
  })

  const refreshSignals = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setLastUpdated(new Date())
    setIsLoading(false)
  }

  const getVerificationCount = (signal: VettedSignal) => {
    return [signal.claudeVerified, signal.openaiVerified, signal.whalesVerified].filter(Boolean).length
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Signal className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold font-mono">TODAY&apos;S SIGNALS</h1>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {filteredSignals.length} Active
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-mono text-muted-foreground">
                <Clock className="w-3 h-3 inline mr-1" />
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSignals}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Verification Legend */}
      <div className="border-b border-border bg-card/30 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Verified By:
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-theme-gold" />
                <span className="text-xs font-mono text-foreground">Claude</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-foreground">OpenAI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Fish className="w-4 h-4 text-theme-cyan" />
                <span className="text-xs font-mono text-foreground">Unusual Whales</span>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            {(['ALL', 'BUY', 'SELL'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                  filter === f
                    ? f === 'BUY'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : f === 'SELL'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Signals Grid */}
      <main className="p-6">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredSignals.map((signal) => {
            const verificationCount = getVerificationCount(signal)
            const isBuy = signal.action === 'BUY'

            return (
              <div
                key={signal.id}
                className={`rounded-lg border bg-card p-5 transition-all hover:shadow-lg ${
                  isBuy ? 'border-green-500/30' : 'border-red-500/30'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold font-mono">{signal.ticker}</span>
                      <Badge
                        variant="outline"
                        className={`${
                          isBuy
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {isBuy ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {signal.action}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {signal.setup}
                    </Badge>
                  </div>

                  {/* Verification Status */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      {signal.claudeVerified ? (
                        <Brain className="w-4 h-4 text-theme-gold" />
                      ) : (
                        <Brain className="w-4 h-4 text-muted-foreground/30" />
                      )}
                      {signal.openaiVerified ? (
                        <Sparkles className="w-4 h-4 text-primary" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-muted-foreground/30" />
                      )}
                      {signal.whalesVerified ? (
                        <Fish className="w-4 h-4 text-theme-cyan" />
                      ) : (
                        <Fish className="w-4 h-4 text-muted-foreground/30" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {verificationCount}/3 verified
                    </span>
                  </div>
                </div>

                {/* Confidence */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">Confidence</span>
                    <span className={`text-sm font-mono font-bold ${
                      signal.confidence >= 0.85 ? 'text-green-400' :
                      signal.confidence >= 0.75 ? 'text-theme-gold' : 'text-orange-400'
                    }`}>
                      {(signal.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        signal.confidence >= 0.85 ? 'bg-green-500' :
                        signal.confidence >= 0.75 ? 'bg-theme-gold' : 'bg-orange-500'
                      }`}
                      style={{ width: `${signal.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {/* Price Levels */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 bg-muted/30 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">ENTRY</div>
                    <div className="text-sm font-mono font-bold">${signal.entry.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">STOP</div>
                    <div className="text-sm font-mono font-bold text-red-400">${signal.stop.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded text-center">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">TARGET</div>
                    <div className="text-sm font-mono font-bold text-green-400">${signal.target.toFixed(2)}</div>
                  </div>
                </div>

                {/* Risk/Reward */}
                <div className="flex items-center justify-between p-2 bg-primary/5 rounded border border-primary/10 mb-4">
                  <span className="text-xs font-mono text-muted-foreground">Risk/Reward</span>
                  <span className={`text-sm font-mono font-bold ${
                    signal.riskReward >= 2.5 ? 'text-green-400' : 'text-theme-gold'
                  }`}>
                    1:{signal.riskReward.toFixed(2)}
                  </span>
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <div className="text-xs font-mono text-muted-foreground mb-1">THESIS</div>
                  <p className="text-xs text-foreground leading-relaxed">{signal.reason}</p>
                </div>

                {/* Risk Notes */}
                {signal.riskNotes.length > 0 && (
                  <div className="mb-4 p-2 bg-amber-500/5 border border-amber-500/20 rounded">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-mono text-amber-500">RISK NOTES</span>
                    </div>
                    <ul className="space-y-0.5">
                      {signal.riskNotes.map((note, idx) => (
                        <li key={idx} className="text-[10px] text-amber-400/80 flex items-start gap-1">
                          <span className="text-amber-500/50">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Invalid If */}
                <div className="p-2 bg-muted/30 border border-border/50 rounded">
                  <div className="flex items-center gap-1 mb-1">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-mono text-muted-foreground">INVALID IF</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{signal.invalidIf}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center">
            <strong className="text-foreground/60">Disclaimer:</strong> These signals are vetted by Claude, OpenAI, and cross-referenced with Unusual Whales data.
            This is for paper trading and educational purposes only. Always do your own research.
          </p>
        </div>
      </main>
    </div>
  )
}
