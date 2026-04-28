import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  runPatternDetection,
  type Pattern, 
  type AITradeIdea 
} from '@/lib/trading-bot/pattern-detector'
import { RiskManager, type RiskLimits, type Position } from '@/lib/trading-bot/risk-manager'
import type { Indicators } from '@/hooks/useTechnicalIndicators'

interface BotConfig {
  is_enabled: boolean
  mode: 'paper' | 'live'
  default_position_size: number
  auto_execute_high_confidence: boolean
  follow_ai_recommendations: boolean
  watchlist: string[]
  use_claude_signals: boolean
  use_openai_signals: boolean
  require_consensus: boolean
}

// POST - Run a scan cycle
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { 
      indicatorsMap, 
      pricesMap, 
      claudeIdeas = [], 
      openaiIdeas = [] 
    } = body as {
      indicatorsMap: Record<string, Indicators>
      pricesMap: Record<string, number>
      claudeIdeas?: AITradeIdea[]
      openaiIdeas?: AITradeIdea[]
    }

    // Get bot config
    const { data: configData, error: configError } = await supabase
      .from('bot_config')
      .select('*')
      .limit(1)
      .single()

    if (configError || !configData) {
      return NextResponse.json({ error: 'Bot not configured' }, { status: 500 })
    }

    const config = configData as BotConfig

    // Check if bot is enabled
    if (!config.is_enabled) {
      return NextResponse.json({ 
        signals: [], 
        recommendations: [], 
        executedTrades: [],
        message: 'Bot is disabled' 
      })
    }

    // Get risk limits
    const { data: limitsData } = await supabase
      .from('risk_limits')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!limitsData) {
      return NextResponse.json({ error: 'Risk limits not configured' }, { status: 500 })
    }

    // Get open positions
    const { data: positionsData } = await supabase
      .from('trade_history')
      .select('*')
      .eq('status', 'open')

    const positions: Position[] = (positionsData || []).map((p: { ticker: string; quantity: number; entry_price: number }) => ({
      ticker: p.ticker,
      quantity: p.quantity,
      entry_price: p.entry_price,
      current_price: pricesMap[p.ticker] || p.entry_price,
      unrealized_pnl: 0,
      status: 'open' as const
    }))

    // Initialize risk manager
    const riskManager = new RiskManager(limitsData as RiskLimits, positions)

    // Get active patterns
    const { data: patternsData } = await supabase
      .from('patterns')
      .select('*')
      .eq('is_active', true)

    const patterns = (patternsData || []) as Pattern[]

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
      patterns,
      (limitsData as RiskLimits).min_confidence_score
    )

    // Log signals to database
    for (const signal of detection.signals) {
      await supabase.from('signal_log').insert({
        ticker: signal.ticker,
        signal_type: signal.signal_type,
        signal_name: signal.signal_name,
        direction: signal.direction,
        strength: signal.strength,
        price_at_signal: signal.price_at_signal,
        indicator_values: signal.indicator_values
      })
    }

    // Execute trades if auto-execute is enabled
    const executedTrades: Array<{
      ticker: string
      side: string
      quantity: number
      price: number
      orderId?: string
      patternName?: string
    }> = []

    if (config.auto_execute_high_confidence) {
      for (const rec of detection.recommendations) {
        // Check if meets consensus requirement
        if (config.require_consensus) {
          const hasClaudeSignal = rec.signals.some(s => s.signal_type === 'ai_claude')
          const hasOpenaiSignal = rec.signals.some(s => s.signal_type === 'ai_openai')
          if (!hasClaudeSignal || !hasOpenaiSignal) continue
        }

        // Check risk before executing
        const price = pricesMap[rec.ticker] || 0
        if (price <= 0) continue

        const quantity = Math.floor(config.default_position_size / price)
        if (quantity < 1) continue

        const riskCheck = riskManager.checkTrade(
          rec.ticker,
          rec.action,
          quantity,
          price,
          rec.confidence
        )

        if (riskCheck.allowed) {
          const finalQuantity = riskCheck.adjustedQuantity || quantity

          // Execute trade via Alpaca
          try {
            const tradeResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/alpaca/paper-trade`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ticker: rec.ticker,
                  side: rec.action,
                  quantity: finalQuantity,
                  orderType: 'market'
                })
              }
            )

            const tradeResult = await tradeResponse.json()

            if (tradeResponse.ok && tradeResult.success) {
              // Record trade in database
              await supabase.from('trade_history').insert({
                ticker: rec.ticker,
                side: rec.action,
                quantity: finalQuantity,
                entry_price: price,
                order_id: tradeResult.orderId,
                pattern_name: rec.signals[0]?.signal_name,
                confidence_score: rec.confidence,
                signals: rec.signals,
                status: 'open',
                entry_time: new Date().toISOString()
              })

              // Mark signals as traded
              for (const signal of rec.signals) {
                await supabase
                  .from('signal_log')
                  .update({ was_traded: true })
                  .eq('ticker', signal.ticker)
                  .eq('signal_name', signal.signal_name)
                  .is('trade_id', null)
              }

              executedTrades.push({
                ticker: rec.ticker,
                side: rec.action,
                quantity: finalQuantity,
                price,
                orderId: tradeResult.orderId,
                patternName: rec.signals[0]?.signal_name
              })
            }
          } catch (err) {
            console.error(`[v0] Failed to execute trade for ${rec.ticker}:`, err)
          }
        }
      }
    }

    return NextResponse.json({
      signals: detection.signals,
      recommendations: detection.recommendations,
      executedTrades,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[v0] Bot scan error:', error)
    return NextResponse.json(
      { error: 'Failed to run scan' },
      { status: 500 }
    )
  }
}
