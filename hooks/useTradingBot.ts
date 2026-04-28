'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'

// ===========================================
// TYPES
// ===========================================

export interface BotConfig {
  id: string
  is_enabled: boolean
  mode: 'paper' | 'live'
  default_position_size: number
  auto_execute_high_confidence: boolean
  follow_ai_recommendations: boolean
  watchlist: string[]
  scan_interval: number
  notify_on_trade: boolean
  notify_on_signal: boolean
  use_claude_signals: boolean
  use_openai_signals: boolean
  require_consensus: boolean
}

export interface RiskLimits {
  id: string
  max_position_size: number
  max_total_exposure: number
  max_concurrent_positions: number
  daily_loss_limit: number
  max_loss_per_trade: number
  take_profit_percent: number
  stop_loss_percent: number
  min_confidence_score: number
  current_daily_pnl: number
}

export interface Pattern {
  id: string
  name: string
  type: 'technical' | 'price_action' | 'ai_signal' | 'custom'
  description: string
  criteria: Record<string, unknown>
  win_rate: number
  avg_return: number
  total_trades: number
  successful_trades: number
  base_confidence: number
  is_active: boolean
}

export interface SignalLog {
  id: string
  ticker: string
  signal_type: string
  signal_name: string
  direction: 'bullish' | 'bearish' | 'neutral'
  strength: number
  price_at_signal: number
  indicator_values: Record<string, unknown>
  was_traded: boolean
  created_at: string
}

export interface TradeHistory {
  id: string
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  entry_price: number
  exit_price?: number
  order_id?: string
  pattern_name?: string
  confidence_score?: number
  signals?: Record<string, unknown>[]
  realized_pnl?: number
  unrealized_pnl?: number
  status: 'pending' | 'open' | 'closed' | 'cancelled' | 'failed'
  entry_time?: string
  exit_time?: string
  created_at: string
}

export interface DailyPerformance {
  date: string
  realized_pnl: number
  unrealized_pnl: number
  total_trades: number
  winning_trades: number
  losing_trades: number
}

export interface BotState {
  config: BotConfig | null
  riskLimits: RiskLimits | null
  patterns: Pattern[]
  recentSignals: SignalLog[]
  openPositions: TradeHistory[]
  recentTrades: TradeHistory[]
  todayPerformance: DailyPerformance | null
}

// ===========================================
// FETCHER
// ===========================================

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// ===========================================
// HOOK
// ===========================================

export function useTradingBot() {
  const { data, error, isLoading, mutate } = useSWR<BotState>('/api/bot', fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds
    revalidateOnFocus: true
  })

  const [isUpdating, setIsUpdating] = useState(false)

  // Toggle bot on/off
  const toggleBot = useCallback(async () => {
    setIsUpdating(true)
    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' })
      })
      if (res.ok) {
        mutate()
      }
    } finally {
      setIsUpdating(false)
    }
  }, [mutate])

  // Update bot config
  const updateConfig = useCallback(async (updates: Partial<BotConfig>) => {
    setIsUpdating(true)
    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_config', data: updates })
      })
      if (res.ok) {
        mutate()
      }
    } finally {
      setIsUpdating(false)
    }
  }, [mutate])

  // Update risk limits
  const updateRiskLimits = useCallback(async (updates: Partial<RiskLimits>) => {
    setIsUpdating(true)
    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_risk_limits', data: updates })
      })
      if (res.ok) {
        mutate()
      }
    } finally {
      setIsUpdating(false)
    }
  }, [mutate])

  // Toggle pattern
  const togglePattern = useCallback(async (patternId: string, isActive: boolean) => {
    setIsUpdating(true)
    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pattern', data: { patternId, isActive } })
      })
      if (res.ok) {
        mutate()
      }
    } finally {
      setIsUpdating(false)
    }
  }, [mutate])

  // Close a trade
  const closeTrade = useCallback(async (tradeId: string, exitPrice: number) => {
    const trade = data?.openPositions.find(t => t.id === tradeId)
    if (!trade) return

    const realizedPnl = trade.side === 'buy'
      ? (exitPrice - trade.entry_price) * trade.quantity
      : (trade.entry_price - exitPrice) * trade.quantity

    setIsUpdating(true)
    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_trade',
          data: { tradeId, exitPrice, realizedPnl }
        })
      })
      if (res.ok) {
        mutate()
      }
    } finally {
      setIsUpdating(false)
    }
  }, [data, mutate])

  // Calculate risk metrics
  const riskMetrics = data?.riskLimits ? {
    dailyPnL: data.riskLimits.current_daily_pnl,
    dailyPnLPercent: (data.riskLimits.current_daily_pnl / data.riskLimits.daily_loss_limit) * -100,
    totalExposure: data.openPositions.reduce((sum, p) => sum + (p.quantity * p.entry_price), 0),
    openPositionCount: data.openPositions.length,
    canTrade: data.config?.is_enabled && 
              data.riskLimits.current_daily_pnl > -data.riskLimits.daily_loss_limit &&
              data.openPositions.length < data.riskLimits.max_concurrent_positions
  } : null

  return {
    // State
    config: data?.config || null,
    riskLimits: data?.riskLimits || null,
    patterns: data?.patterns || [],
    recentSignals: data?.recentSignals || [],
    openPositions: data?.openPositions || [],
    recentTrades: data?.recentTrades || [],
    todayPerformance: data?.todayPerformance || null,
    riskMetrics,
    
    // Status
    isLoading,
    isUpdating,
    error,
    
    // Actions
    toggleBot,
    updateConfig,
    updateRiskLimits,
    togglePattern,
    closeTrade,
    refresh: mutate
  }
}
