'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Clock,
  Filter,
  Zap,
  AlertTriangle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'

interface OptionsFlow {
  id: string
  ticker: string
  strike: number
  expiry: string
  type: 'call' | 'put'
  premium: number
  size: number
  openInterest: number
  volume: number
  side: 'buy' | 'sell'
  sentiment: 'bullish' | 'bearish'
  timestamp: number
  unusual: boolean
}

function formatPremium(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function OptionsFlowPage() {
  const [flow, setFlow] = useState<OptionsFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'calls' | 'puts'>('all')
  const [unusualOnly, setUnusualOnly] = useState(false)
  const [source, setSource] = useState<string>('unknown')

  const fetchFlow = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dark-pool?type=options')
      if (res.ok) {
        const data = await res.json()
        setFlow(data.flow || [])
        setSource(data.source || 'unknown')
      }
    } catch (err) {
      console.error('[OptionsFlow] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlow()
    const interval = setInterval(fetchFlow, 30000)
    return () => clearInterval(interval)
  }, [])

  const filtered = flow
    .filter(f => filter === 'all' || (filter === 'calls' ? f.type === 'call' : f.type === 'put'))
    .filter(f => !unusualOnly || f.unusual)

  const totalPremium = filtered.reduce((sum, f) => sum + f.premium, 0)
  const callPremium = filtered.filter(f => f.type === 'call').reduce((sum, f) => sum + f.premium, 0)
  const putPremium = filtered.filter(f => f.type === 'put').reduce((sum, f) => sum + f.premium, 0)
  const unusualCount = filtered.filter(f => f.unusual).length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />
      
      <header className="border-b border-border bg-card/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-theme-gold" />
            <h1 className="text-xl font-bold font-mono">OPTIONS FLOW</h1>
            <Badge variant="outline" className="bg-theme-gold/10 text-theme-gold border-theme-gold/30 text-[10px]">
              {source === 'unusual_whales' ? 'Live' : 'Demo Data'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Unusual Only Toggle */}
            <button
              onClick={() => setUnusualOnly(!unusualOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded border transition-colors ${
                unusualOnly 
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                  : 'text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Unusual Only
            </button>
            
            {/* Type Filter */}
            <div className="flex items-center bg-muted/30 rounded-lg border border-border/50 p-0.5">
              {(['all', 'calls', 'puts'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-colors capitalize ${
                    filter === f
                      ? f === 'calls' ? 'bg-green-500/20 text-green-400'
                      : f === 'puts' ? 'bg-red-500/20 text-red-400'
                      : 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <button
              onClick={fetchFlow}
              disabled={loading}
              className="p-2 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-border bg-card/20">
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-theme-gold" />
            <span className="text-xs font-mono text-muted-foreground">Total Premium</span>
          </div>
          <span className="text-xl font-bold font-mono text-foreground">{formatPremium(totalPremium)}</span>
        </div>
        
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs font-mono text-muted-foreground">Call Premium</span>
          </div>
          <span className="text-xl font-bold font-mono text-green-400">{formatPremium(callPremium)}</span>
        </div>
        
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs font-mono text-muted-foreground">Put Premium</span>
          </div>
          <span className="text-xl font-bold font-mono text-red-400">{formatPremium(putPremium)}</span>
        </div>
        
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-mono text-muted-foreground">Unusual Activity</span>
          </div>
          <span className="text-xl font-bold font-mono text-orange-400">{unusualCount} trades</span>
        </div>
      </div>

      {/* Flow Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full">
          <thead className="sticky top-0 bg-background">
            <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="text-left py-2 px-3">Time</th>
              <th className="text-left py-2 px-3">Ticker</th>
              <th className="text-center py-2 px-3">Type</th>
              <th className="text-right py-2 px-3">Strike</th>
              <th className="text-center py-2 px-3">Expiry</th>
              <th className="text-right py-2 px-3">Premium</th>
              <th className="text-right py-2 px-3">Size</th>
              <th className="text-right py-2 px-3">Vol/OI</th>
              <th className="text-center py-2 px-3">Side</th>
              <th className="text-center py-2 px-3">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.map((item) => (
              <tr key={item.id} className={`hover:bg-muted/20 transition-colors ${item.unusual ? 'bg-orange-500/5' : ''}`}>
                <td className="py-2 px-3 text-[11px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(item.timestamp)}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-bold text-foreground">{item.ticker}</span>
                    {item.unusual && (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[8px] px-1">
                        <Zap className="w-2 h-2" />
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-center">
                  <Badge className={`text-[9px] ${
                    item.type === 'call' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {item.type.toUpperCase()}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-right text-sm font-mono text-foreground">
                  ${item.strike}
                </td>
                <td className="py-2 px-3 text-center text-[11px] font-mono text-muted-foreground">
                  {item.expiry}
                </td>
                <td className="py-2 px-3 text-right">
                  <span className={`text-sm font-mono font-bold ${
                    item.premium >= 1000000 ? 'text-theme-gold' : 'text-foreground'
                  }`}>
                    {formatPremium(item.premium)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right text-sm font-mono text-muted-foreground">
                  {item.size.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-[11px] font-mono text-muted-foreground">
                  {item.volume.toLocaleString()}/{item.openInterest.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-center">
                  <Badge variant="outline" className={`text-[9px] ${
                    item.side === 'buy' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {item.side.toUpperCase()}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-center">
                  <Badge className={`text-[9px] ${
                    item.sentiment === 'bullish' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {item.sentiment === 'bullish' && <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
                    {item.sentiment === 'bearish' && <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                    {item.sentiment.toUpperCase()}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filtered.length === 0 && !loading && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            <Filter className="w-4 h-4 mr-2" />
            No options flow matches your filters
          </div>
        )}
      </div>
    </div>
  )
}
