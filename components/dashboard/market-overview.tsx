'use client'

import { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  PieChart,
  Zap,
  RefreshCw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSectorPerformance, useGainersLosers } from '@/hooks/useSectorPerformance'

interface MarketOverviewProps {
  onSelectTicker?: (ticker: string) => void
}

export function MarketOverview({ onSelectTicker }: MarketOverviewProps) {
  const [activeTab, setActiveTab] = useState<'sectors' | 'gainers' | 'losers' | 'active'>('sectors')
  const [timeframe, setTimeframe] = useState<'realtime' | 'daily' | 'weekly' | 'monthly'>('realtime')
  
  const { sectors, loading: sectorsLoading, source: sectorsSource, refresh: refreshSectors } = useSectorPerformance()
  const { data: gainersLosers, loading: glLoading, source: glSource, refresh: refreshGL } = useGainersLosers()

  const loading = activeTab === 'sectors' ? sectorsLoading : glLoading
  const source = activeTab === 'sectors' ? sectorsSource : glSource

  const getSectorData = () => {
    if (!sectors) return []
    switch (timeframe) {
      case 'realtime': return sectors.realTimePerformance || []
      case 'daily': return sectors.daily || []
      case 'weekly': return sectors.weekly || []
      case 'monthly': return sectors.monthly || []
      default: return sectors.realTimePerformance || []
    }
  }

  const handleRefresh = () => {
    if (activeTab === 'sectors') refreshSectors()
    else refreshGL()
  }

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-theme-green" />
          <span className="font-semibold text-sm">Market Overview</span>
          {source === 'alpha_vantage' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-400">
              LIVE
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-400"
              title="Showing sample data. The Alpha Vantage SECTOR endpoint did not return live data this request. Check server logs for the exact reason."
            >
              SAMPLE
            </Badge>
          )}
        </div>
        <button onClick={handleRefresh} className="p-1 hover:bg-white/10 rounded transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'sectors', label: 'Sectors', icon: PieChart },
          { id: 'gainers', label: 'Gainers', icon: TrendingUp },
          { id: 'losers', label: 'Losers', icon: TrendingDown },
          { id: 'active', label: 'Active', icon: Activity },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-theme-green/10 text-theme-green border-b-2 border-theme-green' 
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeframe selector for sectors */}
      {activeTab === 'sectors' && (
        <div className="flex gap-1 px-3 py-2 border-b border-border">
          {['realtime', 'daily', 'weekly', 'monthly'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                timeframe === tf 
                  ? 'bg-theme-green/20 text-theme-green' 
                  : 'text-muted-foreground hover:bg-white/5'
              }`}
            >
              {tf === 'realtime' ? 'RT' : tf.charAt(0).toUpperCase() + tf.slice(1, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : activeTab === 'sectors' ? (
          <div className="space-y-1">
            {getSectorData().map((sector, i) => (
              <div
                key={sector.sector}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
              >
                <span className="text-xs text-foreground truncate flex-1 mr-2">
                  {sector.sector.replace('Information ', 'Info ').replace('Communication ', 'Comm ').replace('Consumer ', '')}
                </span>
                <div className="flex items-center gap-1">
                  {sector.performance >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs font-mono font-medium ${sector.performance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {(activeTab === 'gainers' ? gainersLosers?.topGainers :
              activeTab === 'losers' ? gainersLosers?.topLosers :
              gainersLosers?.mostActive)?.map((stock, i) => (
              <button
                key={stock.ticker}
                onClick={() => onSelectTicker?.(stock.ticker)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">{stock.ticker}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ${stock.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === 'active' && (
                    <span className="text-[10px] text-muted-foreground">
                      {(stock.volume / 1000000).toFixed(1)}M
                    </span>
                  )}
                  <span className={`text-xs font-mono font-medium ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
