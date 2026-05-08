'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, AlertCircle, Zap } from 'lucide-react'

const DATA_SOURCES = [
  {
    id: 'tradier',
    name: 'Tradier',
    description: 'Real-time quotes, live options chains with greeks, intraday bars',
    tier: 'Free (brokerage account)',
    latency: '~100ms',
    uptime: '99.9%',
    features: ['Stocks', 'Options', 'Real-time Quotes', 'Order Execution'],
    status: 'connected',
    recommended: true,
  },
  {
    id: 'uw',
    name: 'Unusual Whales',
    description: 'Options flow, dark pool, greeks, IV, shorts, earnings, insider, congress',
    tier: 'Paid subscription',
    latency: '~200ms',
    uptime: '99.9%',
    features: ['Options Flow', 'Dark Pool', 'Greeks', 'Shorts', 'Catalysts'],
    status: 'connected',
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: 'Company profiles, fundamentals, news, analyst ratings, ticker search',
    tier: 'Free (60 req/min)',
    latency: '~300ms',
    uptime: '99.8%',
    features: ['Fundamentals', 'News', 'Analyst Ratings', 'Company Info'],
    status: 'connected',
  },
  {
    id: 'polygon',
    name: 'Polygon.io',
    description: 'Historical daily bars, ticker details, backup fundamentals',
    tier: 'Free (5 req/min)',
    latency: '~500ms',
    uptime: '99.9%',
    features: ['Historical Bars', 'Ticker Search', 'Reference Data'],
    status: 'connected',
  },
]

export function MarketDataSelector() {
  const [selected, setSelected] = useState('polygon')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('preferred-data-source') || 'polygon'
    setSelected(saved)
  }, [])

  const handleSelect = (id: string) => {
    setSelected(id)
    localStorage.setItem('preferred-data-source', id)
  }

  if (!mounted) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-wide text-foreground font-mono">
          MARKET DATA SOURCES
        </h2>
        <Badge variant="outline" className="text-[11px] font-mono">
          {DATA_SOURCES.filter((d) => d.status === 'connected').length} active
        </Badge>
      </div>

      <div className="grid gap-3">
        {DATA_SOURCES.map((source) => (
          <Card
            key={source.id}
            className={`relative p-4 cursor-pointer transition-all border-2 ${
              selected === source.id
                ? 'border-theme-green bg-theme-green/5'
                : 'border-border hover:border-border/60'
            }`}
            onClick={() => handleSelect(source.id)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 cursor-pointer transition-colors ${
                  selected === source.id
                    ? 'border-theme-green bg-theme-green/20'
                    : 'border-border hover:border-border/60'
                }`}
                onClick={() => handleSelect(source.id)}
              >
                {selected === source.id && (
                  <div className="w-2 h-2 rounded-full bg-theme-green" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-foreground">{source.name}</h3>
                  {source.status === 'connected' && (
                    <Check className="w-3 h-3 text-theme-green flex-shrink-0" />
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-2">{source.description}</p>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="text-[10px]">
                    <span className="text-muted-foreground block">Tier:</span>
                    <span className="text-foreground font-mono">{source.tier}</span>
                  </div>
                  <div className="text-[10px]">
                    <span className="text-muted-foreground block">Latency:</span>
                    <span className="text-foreground font-mono">{source.latency}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {source.features.map((feature) => (
                    <Badge
                      key={feature}
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0"
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              {selected === source.id && (
                <Zap className="w-4 h-4 text-theme-green flex-shrink-0 mt-1" />
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20 flex gap-2">
        <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-blue-200">
          <p className="font-bold mb-1">Data Stack:</p>
          <p>Tradier (real-time) + UW (options intel) + Finnhub (fundamentals) + Polygon (historical). No Alpha Vantage needed.</p>
        </div>
      </div>
    </div>
  )
}
