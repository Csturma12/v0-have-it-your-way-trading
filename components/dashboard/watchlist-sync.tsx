'use client'

import { useState } from 'react'
import { Upload, Download, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseTradingViewWatchlist, syncWatchlistToBot, exportBotWatchlist, getTradingViewInstructions } from '@/lib/trading-bot/tradingview-sync'

export function WatchlistSync() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  const handleSync = async () => {
    if (!input.trim()) {
      setStatus({ type: 'error', message: 'Paste your TradingView watchlist first' })
      return
    }

    setIsLoading(true)
    try {
      const symbols = parseTradingViewWatchlist(input)
      const result = await syncWatchlistToBot(symbols)
      
      setStatus({
        type: result.success ? 'success' : 'error',
        message: result.message,
      })

      if (result.success) {
        setInput('')
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to sync watchlist' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const watchlist = await exportBotWatchlist()
      setInput(watchlist)
      setStatus({ type: 'success', message: 'Bot watchlist exported' })
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to export watchlist' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
          <Upload className="w-4 h-4" />
          Sync TradingView Watchlist
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Import your TradingView watchlist to automatically update the bot&apos;s trading symbols.
        </p>

        {/* Instructions */}
        <div className="bg-muted/50 rounded p-3 mb-4 border border-border/50">
          <div className="flex gap-2 text-xs">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <div className="space-y-1 text-muted-foreground">
              {getTradingViewInstructions().split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your TradingView watchlist here (comma or newline separated symbols)"
          className="w-full h-24 px-3 py-2 rounded-lg bg-background border border-input text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Status */}
        {status.type && (
          <div className={`mt-3 flex items-center gap-2 text-xs p-2 rounded ${
            status.type === 'success' 
              ? 'bg-green-500/10 text-green-600 border border-green-500/20'
              : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {status.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleSync}
            disabled={isLoading}
            size="sm"
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Sync with Bot
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}
