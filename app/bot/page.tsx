'use client'

import { useState } from 'react'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { WatchlistSync } from '@/components/dashboard/watchlist-sync'
import { useTradingBot } from '@/hooks/useTradingBot'
import { 
  Bot, 
  Power, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Shield,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  Target,
  DollarSign,
  BarChart2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Brain,
  Cpu
} from 'lucide-react'
import { AlpacaTradeUpdates } from '@/components/alpaca/trade-updates'

export default function BotDashboardPage() {
  const {
    config,
    riskLimits,
    patterns,
    recentSignals,
    openPositions,
    recentTrades,
    todayPerformance,
    riskMetrics,
    isLoading,
    isUpdating,
    toggleBot,
    togglePattern,
    updateConfig,
    updateRiskLimits,
    refresh
  } = useTradingBot()

  const [showPatterns, setShowPatterns] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <TopNavBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const isEnabled = config?.is_enabled || false
  const dailyPnL = todayPerformance?.realized_pnl || 0
  const winRate = todayPerformance 
    ? (todayPerformance.winning_trades / Math.max(1, todayPerformance.total_trades)) * 100 
    : 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavBar />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isEnabled ? 'bg-green-500/20 border border-green-500/30' : 'bg-muted/50 border border-border'}`}>
              <Bot className={`w-8 h-8 ${isEnabled ? 'text-green-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Trading Bot</h1>
              <p className="text-sm text-muted-foreground">
                Autonomous pattern trading with AI signals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={toggleBot}
              disabled={isUpdating}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-sm transition-all ${
                isEnabled 
                  ? 'bg-green-500 text-black hover:bg-green-400' 
                  : 'bg-muted border border-border text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Power className="w-4 h-4" />
              {isEnabled ? 'RUNNING' : 'STOPPED'}
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Daily P&L */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="font-mono uppercase">Daily P&L</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toFixed(2)}
            </div>
            {riskLimits && (
              <div className="text-xs text-muted-foreground mt-1">
                Limit: ${riskLimits.daily_loss_limit}
              </div>
            )}
          </div>

          {/* Win Rate */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Target className="w-3.5 h-3.5" />
              <span className="font-mono uppercase">Win Rate</span>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {winRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {todayPerformance?.winning_trades || 0}W / {todayPerformance?.losing_trades || 0}L
            </div>
          </div>

          {/* Open Positions */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span className="font-mono uppercase">Positions</span>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {openPositions.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Max: {riskLimits?.max_concurrent_positions || 5}
            </div>
          </div>

          {/* Exposure */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-mono uppercase">Exposure</span>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              ${(riskMetrics?.totalExposure || 0).toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Max: ${riskLimits?.max_total_exposure || 5000}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Live Signals */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Live Signals
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                Last 50
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentSignals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No signals yet. Start the bot to scan for patterns.
                </div>
              ) : (
                recentSignals.slice(0, 10).map((signal) => (
                  <div 
                    key={signal.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      {signal.direction === 'bullish' ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : signal.direction === 'bearish' ? (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      ) : (
                        <Activity className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-mono text-sm font-semibold">{signal.ticker}</div>
                        <div className="text-xs text-muted-foreground">{signal.signal_name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono ${
                        signal.strength >= 80 ? 'text-green-400' :
                        signal.strength >= 60 ? 'text-amber-400' :
                        'text-muted-foreground'
                      }`}>
                        {signal.strength}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(signal.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Open Positions */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                Open Positions
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                {openPositions.length} active
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {openPositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No open positions
                </div>
              ) : (
                openPositions.map((position) => {
                  const pnl = position.unrealized_pnl || 0
                  return (
                    <div 
                      key={position.id}
                      className="flex items-center justify-between p-3 rounded bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                          position.side === 'buy' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {position.side.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-mono font-semibold">{position.ticker}</div>
                          <div className="text-xs text-muted-foreground">
                            {position.quantity} @ ${position.entry_price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {position.pattern_name || 'Manual'}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Patterns Section */}
        <div className="mt-6 p-4 rounded-lg border border-border bg-card">
          <button 
            onClick={() => setShowPatterns(!showPatterns)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-bold flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              Active Patterns ({patterns.filter(p => p.is_active).length}/{patterns.length})
            </h2>
            {showPatterns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPatterns && (
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {patterns.map((pattern) => (
                <div 
                  key={pattern.id}
                  className={`p-3 rounded border ${
                    pattern.is_active 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {pattern.type === 'technical' && <BarChart2 className="w-4 h-4 text-blue-400" />}
                      {pattern.type === 'ai_signal' && <Cpu className="w-4 h-4 text-purple-400" />}
                      {pattern.type === 'price_action' && <TrendingUp className="w-4 h-4 text-amber-400" />}
                      {pattern.type === 'custom' && <Zap className="w-4 h-4 text-green-400" />}
                      <span className="font-semibold text-sm">{pattern.name}</span>
                    </div>
                    <button
                      onClick={() => togglePattern(pattern.id, !pattern.is_active)}
                      disabled={isUpdating}
                      className={`p-1.5 rounded transition-colors ${
                        pattern.is_active 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {pattern.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pattern.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-muted-foreground">
                      Confidence: <span className="text-foreground">{pattern.base_confidence}%</span>
                    </span>
                    {pattern.total_trades > 0 && (
                      <span className="text-muted-foreground">
                        Win Rate: <span className={pattern.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}>
                          {pattern.win_rate.toFixed(0)}%
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="mt-6 p-4 rounded-lg border border-border bg-card">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between font-bold hover:opacity-80 transition-opacity"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              Settings & Configuration
            </span>
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSettings && (
            <div className="mt-4 space-y-4 pt-4 border-t border-border">
              {/* Watchlist Sync */}
              <WatchlistSync />

              {/* Signal Preferences */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4" />
                  AI Signal Preferences
                </h3>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config?.use_claude_signals ?? true}
                      onChange={(e) => updateConfig({ use_claude_signals: e.target.checked })}
                      className="rounded"
                    />
                    <span>Use Claude Ideas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config?.use_openai_signals ?? true}
                      onChange={(e) => updateConfig({ use_openai_signals: e.target.checked })}
                      className="rounded"
                    />
                    <span>Use OpenAI Ideas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config?.require_consensus ?? false}
                      onChange={(e) => updateConfig({ require_consensus: e.target.checked })}
                      className="rounded"
                    />
                    <span>Require Consensus (both AI agree)</span>
                  </label>
                </div>
              </div>

              {/* Execution Settings */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Cpu className="w-4 h-4" />
                  Execution Settings
                </h3>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config?.auto_execute_high_confidence ?? true}
                      onChange={(e) => updateConfig({ auto_execute_high_confidence: e.target.checked })}
                      className="rounded"
                    />
                    <span>Auto-execute high confidence patterns</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config?.follow_ai_recommendations ?? true}
                      onChange={(e) => updateConfig({ follow_ai_recommendations: e.target.checked })}
                      className="rounded"
                    />
                    <span>Follow AI recommendations</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div className="mt-6 p-4 rounded-lg border border-border bg-card">
          <h2 className="font-bold flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Recent Trades
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground font-mono uppercase border-b border-border">
                  <th className="text-left p-2">Ticker</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Entry</th>
                  <th className="text-right p-2">Exit</th>
                  <th className="text-right p-2">P&L</th>
                  <th className="text-left p-2">Pattern</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No trades yet
                    </td>
                  </tr>
                ) : (
                  recentTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-border/50">
                      <td className="p-2 font-mono font-semibold">{trade.ticker}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          trade.side === 'buy' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono">{trade.quantity}</td>
                      <td className="p-2 text-right font-mono">${trade.entry_price.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono">
                        {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
                      </td>
                      <td className={`p-2 text-right font-mono ${
                        (trade.realized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.realized_pnl 
                          ? `${trade.realized_pnl >= 0 ? '+' : ''}$${trade.realized_pnl.toFixed(2)}`
                          : '-'
                        }
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {trade.pattern_name || '-'}
                      </td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          trade.status === 'closed' ? 'bg-blue-500/20 text-blue-400' :
                          trade.status === 'open' ? 'bg-green-500/20 text-green-400' :
                          trade.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Live Trade Updates */}
        <div className="fixed bottom-4 right-4 w-80 z-40">
          <AlpacaTradeUpdates maxUpdates={5} />
        </div>
      </main>
    </div>
  )
}
