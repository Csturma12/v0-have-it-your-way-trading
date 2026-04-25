'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Radio } from '@/components/ui/radio'
import { Check, AlertCircle, Zap } from 'lucide-react'

const DATA_SOURCES = [
  {
    id: 'polygon',
    name: 'Polygon.io',
    description: 'Real-time, full historical data, options chains',
    tier: 'Free (5 req/min) / Premium',
    latency: '~500ms',
    uptime: '99.9%',
    features: ['Stocks', 'Options', 'Crypto', 'Forex', 'Indices'],
    status: 'connected',
  },
  {
    id: 'alpha_vantage',
    name: 'Alpha Vantage',
    description: 'Intraday, daily, weekly, monthly timeseries',
    tier: 'Free (25 req/day, 5 req/min)',
    latency: '~1000ms',
    uptime: '99.5%',
    features: ['Stocks', 'Technical Indicators'],
    status: 'connected',
  },
  {
    id: 'tradier',
    name: 'Tradier Sandbox',
    description: 'Options chains, account data, 15-min delayed quotes',
    tier: 'Free Forever',
    latency: '~200ms',
    uptime: '99.8%',
    features: ['Stocks', 'Options', 'Account Data'],
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
              <Radio
                checked={selected === source.id}
                onChange={() => handleSelect(source.id)}
                className="mt-1 flex-shrink-0"
              />

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

      <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20 flex gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-yellow-700">
          <p className="font-bold mb-1">Rate Limits:</p>
          <p>Polygon: 5 req/min free. Alpha Vantage: 5 req/min, 500/day. Tradier: unlimited.</p>
        </div>
      </div>
    </div>
  )
}
