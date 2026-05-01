'use client'

import { useState, useEffect } from 'react'
import { 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  RefreshCw, 
  Link2, 
  Link2Off,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseTradingViewWatchlist, exportBotWatchlist, getTradingViewInstructions } from '@/lib/trading-bot/tradingview-sync'
import { useWatchlist } from '@/contexts/watchlist-context'

type BrokerType = 'tradingview' | 'webull' | 'alpaca'

interface BrokerConnection {
  broker: BrokerType
  connected: boolean
  lastSync: string | null
  symbolCount: number
}

interface BrokerSyncProps {
  onSyncComplete?: (symbols: string[]) => void
}

export function BrokerSync({ onSyncComplete }: BrokerSyncProps) {
  const { setTickers, tickers } = useWatchlist()
  const [activeTab, setActiveTab] = useState<BrokerType>('tradingview')
  const [connections, setConnections] = useState<BrokerConnection[]>([
    { broker: 'tradingview', connected: false, lastSync: null, symbolCount: 0 },
    { broker: 'webull', connected: false, lastSync: null, symbolCount: 0 },
    { broker: 'alpaca', connected: false, lastSync: null, symbolCount: 0 },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  
  // TradingView specific state
  const [tvInput, setTvInput] = useState('')
  const [showTvInstructions, setShowTvInstructions] = useState(false)
  
  // Webull specific state
  const [webullConfigured, setWebullConfigured] = useState(false)

  // Check broker connection status on mount
  useEffect(() => {
    checkWebullStatus()
  }, [])

  const checkWebullStatus = async () => {
    try {
      const res = await fetch('/api/brokers/webull/auth', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setWebullConfigured(data.configured)
        if (data.connected) {
          setConnections(prev => prev.map(c => 
            c.broker === 'webull' 
              ? { ...c, connected: true, lastSync: data.lastSync }
              : c
          ))
        }
      }
    } catch {
      // Silent fail
    }
  }

  // TradingView sync handler
  const handleTradingViewSync = async () => {
    if (!tvInput.trim()) {
      setStatus({ type: 'error', message: 'Paste your TradingView watchlist first' })
      return
    }

    setIsLoading(true)
    try {
      const symbols = parseTradingViewWatchlist(tvInput)
      
      if (symbols.length === 0) {
        setStatus({ type: 'error', message: 'No valid symbols found in input' })
        setIsLoading(false)
        return
      }

      // Add to the active watchlist using context
      setTickers(symbols, 'tradingview')
      
      setStatus({
        type: 'success',
        message: `Imported ${symbols.length} symbols: ${symbols.slice(0, 5).join(', ')}${symbols.length > 5 ? '...' : ''}`,
      })

      setTvInput('')
      setConnections(prev => prev.map(c => 
        c.broker === 'tradingview'
          ? { ...c, connected: true, lastSync: new Date().toISOString(), symbolCount: symbols.length }
          : c
      ))
      onSyncComplete?.(symbols)
    } catch (error) {
      console.error('[v0] Import error:', error)
      setStatus({ type: 'error', message: 'Failed to import watchlist' })
    } finally {
      setIsLoading(false)
    }
  }

  // TradingView export handler
  const handleTradingViewExport = () => {
    if (tickers.length === 0) {
      setStatus({ type: 'error', message: 'No symbols in watchlist to export' })
      return
    }
    // Export current watchlist as comma-separated
    setTvInput(tickers.join(', '))
    setStatus({ type: 'success', message: `Exported ${tickers.length} symbols from watchlist` })
  }

  // Webull connect handler
  const handleWebullConnect = () => {
    window.location.href = '/api/brokers/webull/auth'
  }

  // Webull sync handler
  const handleWebullSync = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/brokers/webull/sync', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok && data.success) {
        setStatus({
          type: 'success',
          message: `Synced ${data.symbolCount} symbols from Webull (${data.watchlistCount} watchlists, ${data.positionCount} positions)`,
        })
        setConnections(prev => prev.map(c => 
          c.broker === 'webull'
            ? { ...c, connected: true, lastSync: new Date().toISOString(), symbolCount: data.symbolCount }
            : c
        ))
        onSyncComplete?.(data.symbols || [])
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to sync' })
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to connect to Webull' })
    } finally {
      setIsLoading(false)
    }
  }

  // Disconnect handler
  const handleDisconnect = async (broker: BrokerType) => {
    if (!confirm(`Disconnect from ${broker}?`)) return
    
    setConnections(prev => prev.map(c => 
      c.broker === broker
        ? { ...c, connected: false, lastSync: null, symbolCount: 0 }
        : c
    ))
    setStatus({ type: 'success', message: `Disconnected from ${broker}` })
  }

  const brokerTabs: { id: BrokerType; label: string; icon: string; color: string }[] = [
    { id: 'tradingview', label: 'TradingView', icon: '📊', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { id: 'webull', label: 'Webull', icon: '🐂', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
    { id: 'alpaca', label: 'Alpaca', icon: '🦙', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  ]

  const activeConnection = connections.find(c => c.broker === activeTab)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header with broker tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide mr-2">
          Sync From:
        </span>
        {brokerTabs.map(tab => {
          const conn = connections.find(c => c.broker === tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-all ${
                activeTab === tab.id
                  ? tab.color
                  : 'text-muted-foreground border-transparent hover:bg-muted/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {conn?.connected && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Content area */}
      <div className="p-3">
        {/* Connection status */}
        {activeConnection?.connected && (
          <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] font-mono text-green-400">
                Connected · {activeConnection.symbolCount} symbols
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeConnection.lastSync && (
                <span className="text-[9px] font-mono text-muted-foreground">
                  Last sync: {new Date(activeConnection.lastSync).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => handleDisconnect(activeTab)}
                className="text-[9px] font-mono text-red-400 hover:text-red-300"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* TradingView Tab */}
        {activeTab === 'tradingview' && (
          <div className="space-y-3">
            {/* Instructions toggle */}
            <button
              onClick={() => setShowTvInstructions(!showTvInstructions)}
              className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400 hover:text-blue-300"
            >
              <Info className="w-3 h-3" />
              How to export from TradingView
              {showTvInstructions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            {showTvInstructions && (
              <div className="px-3 py-2 rounded bg-muted/30 border border-border/50 text-[9px] font-mono text-muted-foreground space-y-1">
                {getTradingViewInstructions().split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            {/* Paste area */}
            <textarea
              value={tvInput}
              onChange={(e) => setTvInput(e.target.value)}
              placeholder="Paste symbols: AAPL, NVDA, TSLA... (comma or newline separated)"
              className="w-full h-20 px-3 py-2 rounded bg-muted/20 border border-border/50 text-[11px] font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
            />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleTradingViewSync}
                disabled={isLoading || !tvInput.trim()}
                size="sm"
                className="flex-1 h-7 text-[10px] font-mono bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
              >
                <Upload className="w-3 h-3 mr-1.5" />
                Import to Watchlist
              </Button>
              <Button
                onClick={handleTradingViewExport}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="h-7 text-[10px] font-mono"
              >
                <Download className="w-3 h-3 mr-1.5" />
                Export
              </Button>
            </div>
          </div>
        )}

        {/* Webull Tab */}
        {activeTab === 'webull' && (
          <div className="space-y-3">
            {!webullConfigured ? (
              <div className="px-3 py-4 rounded bg-orange-500/10 border border-orange-500/20 text-center">
                <p className="text-[11px] font-mono text-orange-400 mb-2">
                  Webull API not configured
                </p>
                <p className="text-[9px] font-mono text-muted-foreground mb-3">
                  Add WEBULL_APP_KEY, WEBULL_CLIENT_ID, etc. to your environment variables
                </p>
                <a
                  href="https://developer.webull.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-orange-400 hover:text-orange-300"
                >
                  Get API keys from Webull Developer Portal
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : activeConnection?.connected ? (
              <div className="space-y-3">
                <p className="text-[10px] font-mono text-muted-foreground">
                  Your Webull watchlists and positions are synced to your dashboard.
                </p>
                <Button
                  onClick={handleWebullSync}
                  disabled={isLoading}
                  size="sm"
                  className="w-full h-7 text-[10px] font-mono bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30"
                >
                  <RefreshCw className={`w-3 h-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh from Webull
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-mono text-muted-foreground">
                  Connect your Webull account to automatically sync your watchlists and positions.
                </p>
                <Button
                  onClick={handleWebullConnect}
                  disabled={isLoading}
                  size="sm"
                  className="w-full h-7 text-[10px] font-mono bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30"
                >
                  <Link2 className="w-3 h-3 mr-1.5" />
                  Connect Webull Account
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Alpaca Tab */}
        {activeTab === 'alpaca' && (
          <div className="px-3 py-4 rounded bg-yellow-500/10 border border-yellow-500/20 text-center">
            <p className="text-[11px] font-mono text-yellow-400 mb-2">
              Alpaca Integration Coming Soon
            </p>
            <p className="text-[9px] font-mono text-muted-foreground">
              Connect your Alpaca paper or live trading account
            </p>
          </div>
        )}

        {/* Status message */}
        {status.type && (
          <div className={`mt-3 flex items-center gap-2 text-[10px] font-mono px-2 py-1.5 rounded ${
            status.type === 'success' 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="truncate">{status.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
