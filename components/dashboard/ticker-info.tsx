'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useWatchlist } from '@/contexts/watchlist-context'

interface TickerData {
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  prevClose: number
  volume: number
  avgVolume: number
  marketCap: number
  pe: number | null
  eps: number | null
  high52w: number
  low52w: number
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B'
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M'
  if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K'
  return vol.toString()
}

function formatCap(cap: number): string {
  if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T'
  if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(2) + 'B'
  if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(1) + 'M'
  return '$' + cap.toFixed(0)
}

export function TickerInfo({ ticker }: { ticker: string }) {
  const [data, setData] = useState<TickerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string>('demo')
  const { tickers, addTicker, removeTicker } = useWatchlist()

  const isInWatchlist = tickers.includes(ticker)

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      removeTicker(ticker)
    } else {
      addTicker(ticker)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [quoteRes, fundRes] = await Promise.all([
        fetch(`/api/polygon/quote?ticker=${ticker}`),
        fetch(`/api/polygon/fundamentals?ticker=${ticker}`),
      ])

      const quoteData = quoteRes.ok ? await quoteRes.json() : null
      const fundData = fundRes.ok ? await fundRes.json() : null

      if (quoteData?.quote) {
        setData({
          price: quoteData.quote.price || 0,
          change: quoteData.quote.change || 0,
          changePercent: quoteData.quote.changePercent || 0,
          open: quoteData.quote.open || 0,
          high: quoteData.quote.high || 0,
          low: quoteData.quote.low || 0,
          prevClose: quoteData.quote.prevClose || 0,
          volume: quoteData.quote.volume || 0,
          avgVolume: quoteData.quote.avgVolume || 0,
          marketCap: fundData?.fundamentals?.marketCap || 0,
          pe: fundData?.fundamentals?.pe || null,
          eps: fundData?.fundamentals?.eps || null,
          high52w: quoteData.quote.high52w || 0,
          low52w: quoteData.quote.low52w || 0,
        })
        setSource(quoteData.source || 'demo')
      }
    } catch (err) {
      console.error('[TickerInfo] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const up = data ? data.change >= 0 : true

  return (
    <div className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Ticker Info</span>
          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${source === 'polygon' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'}`}>
            {source === 'polygon' ? 'LIVE' : 'DEMO'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleWatchlist}
            className={`p-0.5 rounded transition-colors ${isInWatchlist ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`}
            title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Star className={`w-3 h-3 ${isInWatchlist ? 'fill-yellow-400' : ''}`} />
          </button>
          <button onClick={fetchData} className="p-0.5 hover:bg-muted/50 rounded">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 overflow-y-auto">
        {loading && !data ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-2">
            {/* Price + Change */}
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold font-mono">${data.price.toFixed(2)}</span>
              <div className={`flex items-center gap-0.5 text-[10px] font-mono font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{up ? '+' : ''}{data.change.toFixed(2)} ({up ? '+' : ''}{data.changePercent.toFixed(2)}%)</span>
              </div>
            </div>

            {/* OHLC Grid */}
            <div className="grid grid-cols-4 gap-1 text-[8px]">
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Open</div>
                <div className="font-mono font-semibold">${data.open.toFixed(2)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">High</div>
                <div className="font-mono font-semibold text-green-400">${data.high.toFixed(2)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Low</div>
                <div className="font-mono font-semibold text-red-400">${data.low.toFixed(2)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Prev Close</div>
                <div className="font-mono font-semibold">${data.prevClose.toFixed(2)}</div>
              </div>
            </div>

            {/* Volume + Market Data */}
            <div className="grid grid-cols-2 gap-1 text-[8px]">
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Volume</div>
                <div className="font-mono font-semibold">{formatVolume(data.volume)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Avg Vol</div>
                <div className="font-mono font-semibold">{formatVolume(data.avgVolume)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">Mkt Cap</div>
                <div className="font-mono font-semibold">{formatCap(data.marketCap)}</div>
              </div>
              <div className="bg-muted/30 rounded p-1">
                <div className="text-muted-foreground">P/E</div>
                <div className="font-mono font-semibold">{data.pe?.toFixed(2) ?? '—'}</div>
              </div>
            </div>

            {/* 52-Week Range */}
            <div className="text-[8px]">
              <div className="text-muted-foreground mb-0.5">52-Week Range</div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-red-400">${data.low52w.toFixed(2)}</span>
                <div className="flex-1 h-1 bg-muted/50 rounded relative">
                  <div
                    className="absolute h-full bg-primary/60 rounded"
                    style={{
                      left: `${((data.price - data.low52w) / (data.high52w - data.low52w)) * 100}%`,
                      width: '2px',
                    }}
                  />
                </div>
                <span className="font-mono text-green-400">${data.high52w.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[9px] text-muted-foreground text-center py-4">No data</div>
        )}
      </div>
    </div>
  )
}
