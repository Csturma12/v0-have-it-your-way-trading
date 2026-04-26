'use client'

import { useState, useEffect } from 'react'
import { 
  Eye, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  BarChart3,
  Clock,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'

interface DarkPoolTrade {
  id: string
  ticker: string
  price: number
  size: number
  value: number
  exchange: string
  timestamp: number
  side: 'buy' | 'sell' | 'unknown'
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

function formatValue(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

function formatSize(size: number): string {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(2)}M`
  if (size >= 1_000) return `${(size / 1_000).toFixed(0)}K`
  return size.toString()
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

export default function DarkPoolPage() {
  const [trades, setTrades] = useState<DarkPoolTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish'>('all')
  const [minValue, setMinValue] = useState<number>(0)
  const [source, setSource] = useState<string>('unknown')

  const fetchTrades = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dark-pool?type=darkpool')
      if (res.ok) {
        const data = await res.json()
        setTrades(data.trades || [])
        setSource(data.source || 'unknown')
      }
    } catch (err) {
      console.error('[DarkPool] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades()
    const interval = setInterval(fetchTrades, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const filtered = trades
    .filter(t => filter === 'all' || t.sentiment === filter)
    .filter(t => t.value >= minValue)

  const totalValue = filtered.reduce((sum, t) => sum + t.value, 0)
  const bullishValue = filtered.filter(t => t.sentiment === 'bullish').reduce((sum, t) => sum + t.value, 0)
  const bearishValue = filtered.filter(t => t.sentiment === 'bearish').reduce((sum, t) => sum + t.value, 0)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />
      
      {/* Page Header */}
      <header className="border-b border-border bg-card/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold font-mono">DARK POOL FLOW</h1>
            <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px]">
              {source === 'unusual_whales' ? 'Live' : 'Demo Data'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Min Value Filter */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-muted-foreground">Min:</span>
              <select
                value={minValue}
                onChange={(e) => setMinValue(Number(e.target.value))}
                className="bg-muted/30 border border-border rounded px-2 py-1 text-xs font-mono"
              >
                <option value={0}>All</option>
                <option value={1000000}>$1M+</option>
                <option value={5000000}>$5M+</option>
                <option value={10000000}>$10M+</option>
                <option value={25000000}>$25M+</option>
                <option value={50000000}>$50M+</option>
              </select>
            </div>
            
            {/* Sentiment Filter */}
            <div className="flex items-center bg-muted/30 rounded-lg border border-border/50 p-0.5">
              {(['all', 'bullish', 'bearish'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded transition-colors capitalize ${
                    filter === f
                      ? f === 'bullish' ? 'bg-green-500/20 text-green-400'
                      : f === 'bearish' ? 'bg-red-500/20 text-red-400'
                      : 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <button
              onClick={fetchTrades}
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
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-muted-foreground">Total Volume</span>
          </div>
          <span className="text-xl font-bold font-mono text-foreground">{formatValue(totalValue)}</span>
        </div>
        
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs font-mono text-muted-foreground">Bullish Flow</span>
          </div>
          <span className="text-xl font-bold font-mono text-green-400">{formatValue(bullishValue)}</span>
        </div>
        
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs font-mono text-muted-foreground">Bearish Flow</span>
          </div>
          <span className="text-xl font-bold font-mono text-red-400">{formatValue(bearishValue)}</span>
        </div>
        
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-theme-gold" />
            <span className="text-xs font-mono text-muted-foreground">Net Sentiment</span>
          </div>
          <span className={`text-xl font-bold font-mono ${bullishValue > bearishValue ? 'text-green-400' : 'text-red-400'}`}>
            {bullishValue > bearishValue ? 'BULLISH' : 'BEARISH'}
          </span>
        </div>
      </div>

      {/* Trades Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full">
          <thead className="sticky top-0 bg-background">
            <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="text-left py-2 px-3">Time</th>
              <th className="text-left py-2 px-3">Ticker</th>
              <th className="text-right py-2 px-3">Price</th>
              <th className="text-right py-2 px-3">Size</th>
              <th className="text-right py-2 px-3">Value</th>
              <th className="text-center py-2 px-3">Exchange</th>
              <th className="text-center py-2 px-3">Side</th>
              <th className="text-center py-2 px-3">Sentiment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.map((trade) => (
              <tr key={trade.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-2 px-3 text-[11px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(trade.timestamp)}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span className="text-sm font-mono font-bold text-foreground">{trade.ticker}</span>
                </td>
                <td className="py-2 px-3 text-right text-sm font-mono text-foreground">
                  ${trade.price.toFixed(2)}
                </td>
                <td className="py-2 px-3 text-right text-sm font-mono text-muted-foreground">
                  {formatSize(trade.size)}
                </td>
                <td className="py-2 px-3 text-right">
                  <span className={`text-sm font-mono font-bold ${
                    trade.value >= 50000000 ? 'text-cyan-400' :
                    trade.value >= 10000000 ? 'text-theme-gold' : 'text-foreground'
                  }`}>
                    {formatValue(trade.value)}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {trade.exchange}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-center">
                  {trade.side === 'buy' ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[9px]">
                      <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                      BUY
                    </Badge>
                  ) : trade.side === 'sell' ? (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[9px]">
                      <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
                      SELL
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">
                      <Minus className="w-2.5 h-2.5 mr-0.5" />
                      N/A
                    </Badge>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  <Badge className={`text-[9px] ${
                    trade.sentiment === 'bullish' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                    trade.sentiment === 'bearish' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {trade.sentiment === 'bullish' && <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
                    {trade.sentiment === 'bearish' && <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                    {trade.sentiment === 'neutral' && <Minus className="w-2.5 h-2.5 mr-0.5" />}
                    {trade.sentiment.toUpperCase()}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filtered.length === 0 && !loading && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            <Filter className="w-4 h-4 mr-2" />
            No trades match your filters
          </div>
        )}
      </div>
    </div>
  )
}
