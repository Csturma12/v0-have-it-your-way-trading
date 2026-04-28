import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch bot config and state
export async function GET() {
  try {
    const supabase = await createClient()

    // Get bot config
    const { data: config, error: configError } = await supabase
      .from('bot_config')
      .select('*')
      .limit(1)
      .single()

    if (configError) {
      return NextResponse.json({ error: configError.message }, { status: 500 })
    }

    // Get risk limits
    const { data: riskLimits } = await supabase
      .from('risk_limits')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single()

    // Get active patterns
    const { data: patterns } = await supabase
      .from('patterns')
      .select('*')
      .order('type')

    // Get recent signals (last 50)
    const { data: recentSignals } = await supabase
      .from('signal_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    // Get open positions
    const { data: openPositions } = await supabase
      .from('trade_history')
      .select('*')
      .eq('status', 'open')

    // Get recent trades (last 20)
    const { data: recentTrades } = await supabase
      .from('trade_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    // Get today's performance
    const today = new Date().toISOString().split('T')[0]
    const { data: todayPerformance } = await supabase
      .from('daily_performance')
      .select('*')
      .eq('date', today)
      .single()

    return NextResponse.json({
      config,
      riskLimits,
      patterns,
      recentSignals: recentSignals || [],
      openPositions: openPositions || [],
      recentTrades: recentTrades || [],
      todayPerformance
    })
  } catch (error) {
    console.error('[v0] Bot API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bot state' },
      { status: 500 }
    )
  }
}

// POST - Update bot config or trigger actions
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { action, data } = body

    switch (action) {
      case 'toggle': {
        const { data: config } = await supabase
          .from('bot_config')
          .select('id, is_enabled')
          .limit(1)
          .single()

        if (config) {
          await supabase
            .from('bot_config')
            .update({ is_enabled: !config.is_enabled })
            .eq('id', config.id)
        }

        return NextResponse.json({ 
          success: true, 
          is_enabled: !config?.is_enabled 
        })
      }

      case 'update_config': {
        const { data: config } = await supabase
          .from('bot_config')
          .select('id')
          .limit(1)
          .single()

        if (config) {
          await supabase
            .from('bot_config')
            .update(data)
            .eq('id', config.id)
        }

        return NextResponse.json({ success: true })
      }

      case 'update_risk_limits': {
        await supabase
          .from('risk_limits')
          .update(data)
          .eq('is_active', true)

        return NextResponse.json({ success: true })
      }

      case 'toggle_pattern': {
        const { patternId, isActive } = data
        await supabase
          .from('patterns')
          .update({ is_active: isActive })
          .eq('id', patternId)

        return NextResponse.json({ success: true })
      }

      case 'log_signal': {
        await supabase.from('signal_log').insert(data)
        return NextResponse.json({ success: true })
      }

      case 'record_trade': {
        const { data: trade, error } = await supabase
          .from('trade_history')
          .insert(data)
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, trade })
      }

      case 'close_trade': {
        const { tradeId, exitPrice, realizedPnl } = data
        await supabase
          .from('trade_history')
          .update({
            status: 'closed',
            exit_price: exitPrice,
            realized_pnl: realizedPnl,
            exit_time: new Date().toISOString()
          })
          .eq('id', tradeId)

        // Update daily performance
        const today = new Date().toISOString().split('T')[0]
        const { data: existing } = await supabase
          .from('daily_performance')
          .select('*')
          .eq('date', today)
          .single()

        if (existing) {
          await supabase
            .from('daily_performance')
            .update({
              realized_pnl: existing.realized_pnl + realizedPnl,
              total_trades: existing.total_trades + 1,
              winning_trades: realizedPnl > 0 ? existing.winning_trades + 1 : existing.winning_trades,
              losing_trades: realizedPnl < 0 ? existing.losing_trades + 1 : existing.losing_trades
            })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('daily_performance')
            .insert({
              date: today,
              realized_pnl: realizedPnl,
              total_trades: 1,
              winning_trades: realizedPnl > 0 ? 1 : 0,
              losing_trades: realizedPnl < 0 ? 1 : 0
            })
        }

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[v0] Bot API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
