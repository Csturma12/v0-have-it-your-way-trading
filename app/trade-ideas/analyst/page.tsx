'use client'

import { useState } from 'react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { TickerAutocomplete } from '@/components/ui/ticker-autocomplete'
import {
  BookOpen, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Search, RefreshCw, Building2, Target, AlertCircle, Star,
  ArrowUp, ArrowDown, Minus, BarChart3, Users, Loader
} from 'lucide-react'
import useSWR from 'swr'

type ConsensusRating = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'

interface AnalystRecommendation {
  symbol: string
  firm: string
  toGrade: string
  fromGrade: string | null
  action: 'upgrade' | 'downgrade' | 'maintain' | 'init'
  date: string
}

interface AnalystRating {
  symbol: string
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  period: string
}

interface AnalystData {
  symbol: string
  ratings: AnalystRating | null
  recommendations: AnalystRecommendation[]
  consensus: ConsensusRating
  consensusScore: number
  priceTarget: {
    current: number | null
    high: number
    low: number
    mean: number
  }
  recentActivity: string
}

// Default tickers to show
const DEFAULT_TICKERS = ['AAPL', 'NVDA', 'META', 'MSFT', 'AMZN', 'GOOGL', 'TSLA']

const fetcher = (url: string) => fetch(url).then(r => r.json())

const consensusColors: Record<ConsensusRating, string> = {
  strong_buy: 'text-green-400 bg-green-500/10 border-green-500/30',
  buy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  hold: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  sell: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  strong_sell: 'text-red-400 bg-red-500/10 border-red-500/30',
}

const consensusLabel: Record<ConsensusRating, string> = {
  strong_buy: 'STRONG BUY',
  buy: 'BUY',
  hold: 'HOLD',
  sell: 'SELL',
  strong_sell: 'STRONG SELL',
}

const actionColors: Record<string, string> = {
  upgrade: 'text-green-400',
  downgrade: 'text-red-400',
  init: 'text-cyan-400',
  maintain: 'text-muted-foreground',
}

const actionIcons: Record<string, typeof ArrowUp> = {
  upgrade: ArrowUp,
  downgrade: ArrowDown,
  init: Star,
  maintain: Minus,
}

function AnalystCard({ symbol, onRemove }: { symbol: string; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading, error, mutate } = useSWR<{ data: AnalystData }>(
    `/api/analyst?symbol=${symbol}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const analyst = data?.data

  const total = analyst?.ratings
    ? (analyst.ratings.strongBuy + analyst.ratings.buy + analyst.ratings.hold + analyst.ratings.sell + analyst.ratings.strongSell)
    : 0

  const bullishPct = total > 0 && analyst?.ratings
    ? Math.round(((analyst.ratings.strongBuy + analyst.ratings.buy) / total) * 100)
    : 0

  return (
    <div className={`rounded-xl border bg-card/50 overflow-hidden transition-all ${
      analyst?.consensus === 'strong_buy' || analyst?.consensus === 'buy'
        ? 'border-green-500/30'
        : analyst?.consensus === 'sell' || analyst?.consensus === 'strong_sell'
        ? 'border-red-500/30'
        : 'border-amber-500/30'
    }`}>
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-bold text-lg font-mono text-foreground">{symbol}</span>
              {analyst?.recentActivity && (
                <span className="text-[10px] text-muted-foreground">{analyst.recentActivity}</span>
              )}
            </div>

            {isLoading && (
              <Loader className="w-4 h-4 text-muted-foreground animate-spin" />
            )}

            {analyst && (
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${consensusColors[analyst.consensus]}`}>
                {consensusLabel[analyst.consensus]}
              </span>
            )}

            {error && (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertCircle className="w-3 h-3" />
                Failed to load
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {analyst?.priceTarget?.mean > 0 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Avg Target</div>
                <div className="font-bold text-foreground">${analyst.priceTarget.mean.toFixed(0)}</div>
              </div>
            )}

            {analyst && total > 0 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Bullish</div>
                <div className="font-bold text-green-400">{bullishPct}%</div>
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); mutate() }}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors text-xs font-mono"
              >
                ✕
              </button>
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
        </div>

        {/* Rating Bar */}
        {analyst?.ratings && total > 0 && (
          <div className="mt-3 flex rounded-full overflow-hidden h-2 gap-px">
            {analyst.ratings.strongBuy > 0 && (
              <div
                className="bg-green-500"
                style={{ width: `${(analyst.ratings.strongBuy / total) * 100}%` }}
                title={`Strong Buy: ${analyst.ratings.strongBuy}`}
              />
            )}
            {analyst.ratings.buy > 0 && (
              <div
                className="bg-emerald-400"
                style={{ width: `${(analyst.ratings.buy / total) * 100}%` }}
                title={`Buy: ${analyst.ratings.buy}`}
              />
            )}
            {analyst.ratings.hold > 0 && (
              <div
                className="bg-amber-400"
                style={{ width: `${(analyst.ratings.hold / total) * 100}%` }}
                title={`Hold: ${analyst.ratings.hold}`}
              />
            )}
            {analyst.ratings.sell > 0 && (
              <div
                className="bg-orange-400"
                style={{ width: `${(analyst.ratings.sell / total) * 100}%` }}
                title={`Sell: ${analyst.ratings.sell}`}
              />
            )}
            {analyst.ratings.strongSell > 0 && (
              <div
                className="bg-red-500"
                style={{ width: `${(analyst.ratings.strongSell / total) * 100}%` }}
                title={`Strong Sell: ${analyst.ratings.strongSell}`}
              />
            )}
          </div>
        )}
      </button>

      {/* Expanded Details */}
      {expanded && analyst && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/20">
          {/* Rating Breakdown */}
          {analyst.ratings && total > 0 && (
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Analyst Ratings ({total} analysts)
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Strong Buy', count: analyst.ratings.strongBuy, color: 'text-green-400' },
                  { label: 'Buy', count: analyst.ratings.buy, color: 'text-emerald-400' },
                  { label: 'Hold', count: analyst.ratings.hold, color: 'text-amber-400' },
                  { label: 'Sell', count: analyst.ratings.sell, color: 'text-orange-400' },
                  { label: 'Strong Sell', count: analyst.ratings.strongSell, color: 'text-red-400' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="text-center p-2 rounded-lg bg-background border border-border">
                    <div className={`text-xl font-bold ${color}`}>{count}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Target */}
          {analyst.priceTarget?.mean > 0 && (
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Target className="w-3 h-3" />
                Price Targets
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-background border border-border text-center">
                  <div className="text-xs text-muted-foreground">Low</div>
                  <div className="font-bold text-red-400">${analyst.priceTarget.low.toFixed(0)}</div>
                </div>
                <div className="p-2 rounded-lg bg-background border border-primary/30 text-center">
                  <div className="text-xs text-muted-foreground">Mean</div>
                  <div className="font-bold text-foreground">${analyst.priceTarget.mean.toFixed(0)}</div>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border text-center">
                  <div className="text-xs text-muted-foreground">High</div>
                  <div className="font-bold text-green-400">${analyst.priceTarget.high.toFixed(0)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Recommendations */}
          {analyst.recommendations && analyst.recommendations.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Recent Analyst Actions (Last 90 Days)
              </div>
              <div className="space-y-1.5">
                {analyst.recommendations.slice(0, 8).map((rec, idx) => {
                  const ActionIcon = actionIcons[rec.action] || Minus
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <ActionIcon className={`w-3.5 h-3.5 ${actionColors[rec.action]}`} />
                        <span className="text-sm font-medium text-foreground">{rec.firm}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          {rec.fromGrade && (
                            <span className="text-[10px] text-muted-foreground">{rec.fromGrade} → </span>
                          )}
                          <span className={`text-[10px] font-bold ${actionColors[rec.action]}`}>{rec.toGrade}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{rec.date}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {analyst.recommendations?.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No recent analyst actions found in the last 90 days
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AnalystPage() {
  const [tickerSearch, setTickerSearch] = useState('')
  const [tickers, setTickers] = useState<string[]>(DEFAULT_TICKERS)

  const addTicker = (symbol: string) => {
    const upper = symbol.toUpperCase()
    if (upper && !tickers.includes(upper)) {
      setTickers(prev => [upper, ...prev])
    }
    setTickerSearch('')
  }

  const removeTicker = (symbol: string) => {
    setTickers(prev => prev.filter(t => t !== symbol))
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-primary" />
              Analyst Research
            </h1>
            <p className="text-muted-foreground">
              Wall Street analyst ratings, consensus scores, and price targets from Finnhub
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <TickerAutocomplete
              value={tickerSearch}
              onChange={setTickerSearch}
              onSelect={(ticker) => addTicker(ticker.symbol)}
              placeholder="Add a ticker to track..."
              className="w-64"
            />
            <button
              onClick={() => { if (tickerSearch) addTicker(tickerSearch) }}
              disabled={!tickerSearch}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Search className="w-3.5 h-3.5" />
              Add Ticker
            </button>

            <div className="flex items-center gap-1.5 ml-auto text-[10px] text-muted-foreground font-mono">
              <BarChart3 className="w-3.5 h-3.5" />
              {tickers.length} tickers tracked
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Strong Buy', color: 'bg-green-500' },
              { label: 'Buy', color: 'bg-emerald-400' },
              { label: 'Hold', color: 'bg-amber-400' },
              { label: 'Sell', color: 'bg-orange-400' },
              { label: 'Strong Sell', color: 'bg-red-500' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
              </div>
            ))}
          </div>

          {/* Ticker Cards */}
          <div className="space-y-4">
            {tickers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No tickers tracked</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Search and add a ticker above to see analyst data</p>
              </div>
            ) : (
              tickers.map(symbol => (
                <AnalystCard
                  key={symbol}
                  symbol={symbol}
                  onRemove={() => removeTicker(symbol)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
