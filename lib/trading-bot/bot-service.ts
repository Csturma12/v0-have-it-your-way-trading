/**
 * Trading Bot Service
 * Coordinates pattern detection, risk management, and trade execution
 */

import { createClient } from '@/lib/supabase/client'
import { RiskManager, type RiskLimits, type Position } from './risk-manager'
import { runPatternDetection, type Pattern, type Signal, type AITradeIdea, type TradeRecommendation } from './pattern-detector'
import type { Indicators } from '@/hooks/useTechnicalIndicators'

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

export interface BotState {
  isRunning: boolean
  lastScan: Date | null
  activeSignals: Signal[]
  pendingRecommendations: TradeRecommendation[]
  recentTrades: TradeRecord[]
  riskStatus: ReturnType<RiskManager['getRiskStatus']> | null
}

export interface TradeRecord {
  id: string
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  entry_price: number
  exit_price?: number
  status: 'pending' | 'open' | 'closed' | 'cancelled' | 'failed'
  pattern_name?: string
  confidence_score?: number
  realized_pnl?: number
  entry_time?: string
  exit_time?: string
}

// ===========================================
// BOT SERVICE CLASS
// ===========================================

export class TradingBotService {
  private _supabase: ReturnType<typeof createClient> = null
  private config: BotConfig | null = null
  private riskManager: RiskManager | null = null
  private patterns: Pattern[] = []
  private isInitialized = false

  /**
   * Get supabase client, ensuring it's initialized
   */
  private get supabase() {
    if (!this._supabase) {
      throw new Error('Bot service not initialized. Call initialize() first.')
    }
    return this._supabase
  }

  /**
   * Initialize the bot with config from database
   */
  async initialize(): Promise<void> {
    this._supabase = createClient()
    if (!this._supabase) {
      throw new Error('Supabase client not available')
    }
    
    // Load bot config
    const { data: configData } = await this.supabase
      .from('bot_config')
      .select('*')
      .limit(1)
      .single()

    if (configData) {
      this.config = configData as BotConfig
    }

    // Load risk limits
    const { data: limitsData } = await this.supabase
      .from('risk_limits')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (limitsData) {
      // Load open positions
      const { data: positionsData } = await this.supabase
        .from('trade_history')
        .select('*')
        .eq('status', 'open')

      const positions: Position[] = (positionsData || []).map(p => ({
        ticker: p.ticker,
        quantity: p.quantity,
        entry_price: p.entry_price,
        current_price: p.entry_price, // Will be updated with live prices
        unrealized_pnl: 0,
        status: 'open' as const
      }))

      this.riskManager = new RiskManager(limitsData as RiskLimits, positions)
    }

    // Load active patterns
    const { data: patternsData } = await this.supabase
      .from('patterns')
      .select('*')
      .eq('is_active', true)

    if (patternsData) {
      this.patterns = patternsData as Pattern[]
    }

    this.isInitialized = true
  }

  /**
   * Run a scan cycle
   */
  async runScan(
    indicatorsMap: Record<string, Indicators>,
    pricesMap: Record<string, number>,
    claudeIdeas: AITradeIdea[] = [],
    openaiIdeas: AITradeIdea[] = []
  ): Promise<{
    signals: Signal[]
    recommendations: TradeRecommendation[]
    executedTrades: TradeRecord[]
  }> {
    if (!this.isInitialized || !this.config || !this.riskManager) {
      await this.initialize()
    }

    const config = this.config!
    const riskManager = this.riskManager!

    // Filter AI ideas based on config
    const filteredClaudeIdeas = config.use_claude_signals ? claudeIdeas : []
    const filteredOpenaiIdeas = config.use_openai_signals ? openaiIdeas : []

    // Run pattern detection
    const detection = await runPatternDetection(
      config.watchlist,
      indicatorsMap,
      pricesMap,
      filteredClaudeIdeas,
      filteredOpenaiIdeas,
      this.patterns,
      70 // min confidence for recommendations
    )

    // Log signals to database
    for (const signal of detection.signals) {
      await this.logSignal(signal)
    }

    // Execute trades if auto-execute is enabled
    const executedTrades: TradeRecord[] = []
    
    if (config.is_enabled && config.auto_execute_high_confidence) {
      for (const rec of detection.recommendations) {
        // Check if meets consensus requirement
        if (config.require_consensus) {
          const hasClaudeSignal = rec.signals.some(s => s.signal_type === 'ai_claude')
          const hasOpenaiSignal = rec.signals.some(s => s.signal_type === 'ai_openai')
          if (!hasClaudeSignal || !hasOpenaiSignal) continue
        }

        // Check risk before executing
        const price = pricesMap[rec.ticker] || 0
        const quantity = Math.floor(config.default_position_size / price)
        
        const riskCheck = riskManager.checkTrade(
          rec.ticker,
          rec.action,
          quantity,
          price,
          rec.confidence
        )

        if (riskCheck.allowed) {
          const finalQuantity = riskCheck.adjustedQuantity || quantity
          const trade = await this.executeTrade(rec, finalQuantity, price)
          if (trade) {
            executedTrades.push(trade)
          }
        }
      }
    }

    return {
      signals: detection.signals,
      recommendations: detection.recommendations,
      executedTrades
    }
  }

  /**
   * Execute a trade via Alpaca
   */
  async executeTrade(
    recommendation: TradeRecommendation,
    quantity: number,
    price: number
  ): Promise<TradeRecord | null> {
    try {
      const response = await fetch('/api/alpaca/paper-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: recommendation.ticker,
          side: recommendation.action,
          quantity,
          orderType: 'market'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[v0] Trade execution failed:', result.error)
        return null
      }

      // Record trade in database
      const tradeRecord: Partial<TradeRecord> = {
        ticker: recommendation.ticker,
        side: recommendation.action,
        quantity,
        entry_price: price,
        status: 'open',
        pattern_name: recommendation.signals[0]?.signal_name,
        confidence_score: recommendation.confidence,
        entry_time: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('trade_history')
        .insert({
          ...tradeRecord,
          order_id: result.order?.id,
          signals: recommendation.signals
        })
        .select()
        .single()

      if (error) {
        console.error('[v0] Failed to record trade:', error)
        return null
      }

      return data as TradeRecord
    } catch (error) {
      console.error('[v0] Trade execution error:', error)
      return null
    }
  }

  /**
   * Log a signal to the database
   */
  async logSignal(signal: Signal): Promise<void> {
    await this.supabase.from('signal_log').insert({
      ticker: signal.ticker,
      signal_type: signal.signal_type,
      signal_name: signal.signal_name,
      direction: signal.direction,
      strength: signal.strength,
      price_at_signal: signal.price_at_signal,
      indicator_values: signal.indicator_values
    })
  }

  /**
   * Get bot state
   */
  async getState(): Promise<BotState> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Get recent signals
    const { data: signalsData } = await this.supabase
      .from('signal_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    // Get recent trades
    const { data: tradesData } = await this.supabase
      .from('trade_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    return {
      isRunning: this.config?.is_enabled || false,
      lastScan: null,
      activeSignals: (signalsData || []) as Signal[],
      pendingRecommendations: [],
      recentTrades: (tradesData || []) as TradeRecord[],
      riskStatus: this.riskManager?.getRiskStatus() || null
    }
  }

  /**
   * Toggle bot on/off
   */
  async toggleBot(enabled: boolean): Promise<void> {
    if (!this.config) return

    await this.supabase
      .from('bot_config')
      .update({ is_enabled: enabled })
      .eq('id', this.config.id)

    this.config.is_enabled = enabled
  }

  /**
   * Update bot config
   */
  async updateConfig(updates: Partial<BotConfig>): Promise<void> {
    if (!this.config) return

    await this.supabase
      .from('bot_config')
      .update(updates)
      .eq('id', this.config.id)

    this.config = { ...this.config, ...updates }
  }

  /**
   * Update risk limits
   */
  async updateRiskLimits(updates: Partial<RiskLimits>): Promise<void> {
    const { data } = await this.supabase
      .from('risk_limits')
      .update(updates)
      .eq('is_active', true)
      .select()
      .single()

    if (data && this.riskManager) {
      this.riskManager.updateLimits(data as RiskLimits)
    }
  }

  /**
   * Get patterns
   */
  async getPatterns(): Promise<Pattern[]> {
    const { data } = await this.supabase
      .from('patterns')
      .select('*')
      .order('type')

    return (data || []) as Pattern[]
  }

  /**
   * Toggle pattern active status
   */
  async togglePattern(patternId: string, isActive: boolean): Promise<void> {
    await this.supabase
      .from('patterns')
      .update({ is_active: isActive })
      .eq('id', patternId)

    // Refresh patterns
    const { data } = await this.supabase
      .from('patterns')
      .select('*')
      .eq('is_active', true)

    this.patterns = (data || []) as Pattern[]
  }

  /**
   * Get daily performance
   */
  async getDailyPerformance(): Promise<{
    date: string
    realized_pnl: number
    total_trades: number
    winning_trades: number
    losing_trades: number
  }[]> {
    const { data } = await this.supabase
      .from('daily_performance')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)

    return data || []
  }

  /**
   * Get config
   */
  getConfig(): BotConfig | null {
    return this.config
  }

  /**
   * Get risk manager
   */
  getRiskManager(): RiskManager | null {
    return this.riskManager
  }
}

// Singleton instance
let botServiceInstance: TradingBotService | null = null

export function getTradingBotService(): TradingBotService {
  if (!botServiceInstance) {
    botServiceInstance = new TradingBotService()
  }
  return botServiceInstance
}
