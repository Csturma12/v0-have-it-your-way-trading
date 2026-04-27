'use client'

import { useState } from 'react'
import { Activity, RefreshCw, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useOptionsChain } from '@/hooks/useOptionsChain'

interface OptionsChainProps {
  ticker: string
}

export function OptionsChain({ ticker }: OptionsChainProps) {
  const [showCalls, setShowCalls] = useState(true)
  const [expDropdownOpen, setExpDropdownOpen] = useState(false)
  
  const { data, loading, setExpiration, refresh } = useOptionsChain(ticker, {
    greeks: true,
    refreshInterval: 60000,
  })

  const contracts = showCalls ? data?.chain.calls : data?.chain.puts
  const atmStrike = data?.underlyingPrice ? Math.round(data.underlyingPrice / 5) * 5 : 0

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-sm">Options Chain</span>
          <span className="font-mono text-xs text-muted-foreground">{ticker}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${data?.source === 'tradier' ? 'border-green-500/50 text-green-400' : 'border-amber-500/50 text-amber-400'}`}>
            {data?.source === 'tradier' ? 'LIVE' : 'DEMO'}
          </Badge>
        </div>
        <button onClick={refresh} className="p-1 hover:bg-white/10 rounded transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        {/* Expiration selector */}
        <div className="relative">
          <button
            onClick={() => setExpDropdownOpen(!expDropdownOpen)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors"
          >
            {data?.selectedExpiration || 'Select'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {expDropdownOpen && data?.expirations && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
              {data.expirations.slice(0, 8).map(exp => (
                <button
                  key={exp}
                  onClick={() => { setExpiration(exp); setExpDropdownOpen(false) }}
                  className={`block w-full px-3 py-1.5 text-xs font-mono text-left hover:bg-white/10 transition-colors ${
                    exp === data.selectedExpiration ? 'bg-theme-green/20 text-theme-green' : ''
                  }`}
                >
                  {exp}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Call/Put toggle */}
        <div className="flex rounded overflow-hidden border border-white/10">
          <button
            onClick={() => setShowCalls(true)}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              showCalls ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            Calls
          </button>
          <button
            onClick={() => setShowCalls(false)}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              !showCalls ? 'bg-red-500/20 text-red-400' : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            Puts
          </button>
        </div>

        {/* Underlying price */}
        <div className="text-xs">
          <span className="text-muted-foreground">Spot:</span>
          <span className="font-mono font-medium ml-1">${data?.underlyingPrice?.toFixed(2) || '—'}</span>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-7 gap-1 px-3 py-2 text-[10px] font-medium text-muted-foreground border-b border-border bg-muted/20">
        <div>Strike</div>
        <div className="text-right">Bid</div>
        <div className="text-right">Ask</div>
        <div className="text-right">Vol</div>
        <div className="text-right">OI</div>
        <div className="text-right">IV%</div>
        <div className="text-right">Delta</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {contracts?.map((c, i) => {
              const isATM = Math.abs(c.strike - atmStrike) < 2.5
              const isITM = showCalls ? c.strike < (data?.underlyingPrice || 0) : c.strike > (data?.underlyingPrice || 0)
              
              return (
                <div
                  key={`${c.strike}-${i}`}
                  className={`grid grid-cols-7 gap-1 px-3 py-1.5 text-xs font-mono hover:bg-white/5 transition-colors ${
                    isATM ? 'bg-amber-500/10 border-l-2 border-amber-400' : isITM ? 'bg-green-500/5' : ''
                  }`}
                >
                  <div className={`font-medium ${isATM ? 'text-amber-400' : ''}`}>{c.strike}</div>
                  <div className="text-right text-green-400">{c.bid.toFixed(2)}</div>
                  <div className="text-right text-red-400">{c.ask.toFixed(2)}</div>
                  <div className="text-right">{c.volume > 1000 ? `${(c.volume / 1000).toFixed(1)}K` : c.volume}</div>
                  <div className="text-right text-muted-foreground">{c.oi > 1000 ? `${(c.oi / 1000).toFixed(1)}K` : c.oi}</div>
                  <div className={`text-right ${c.iv > 50 ? 'text-amber-400' : c.iv > 30 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {c.iv.toFixed(1)}
                  </div>
                  <div className={`text-right ${Math.abs(c.delta) > 0.5 ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {c.delta.toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
