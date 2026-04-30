/**
 * TradingView Sync Service
 * Handles syncing TradingView watchlists with the trading bot
 */

import { createClient } from '@/lib/supabase/client'

export interface TradingViewWatchlist {
  name: string
  symbols: string[]
  lastSynced: Date
}

/**
 * Parse watchlist from TradingView export format
 * Supports CSV format: SYMBOL,NAME,EXCHANGE
 * Or comma/newline separated symbols
 */
export function parseTradingViewWatchlist(input: string): string[] {
  const lines = input.split('\n').map(line => line.trim()).filter(Boolean)
  const symbols: string[] = []

  for (const line of lines) {
    // Handle CSV format: SYMBOL,NAME,EXCHANGE or just SYMBOL
    const parts = line.split(',')
    const symbol = parts[0].trim().toUpperCase()
    
    // Validate it's a valid ticker (alphanumeric and some special chars)
    if (/^[A-Z0-9\-\.]{1,5}$/.test(symbol)) {
      symbols.push(symbol)
    }
  }

  return [...new Set(symbols)] // Remove duplicates
}

/**
 * Sync watchlist to bot config in Supabase
 */
export async function syncWatchlistToBot(symbols: string[]): Promise<{ success: boolean; message: string }> {
  try {
    if (symbols.length === 0) {
      return { success: false, message: 'No valid symbols found in watchlist' }
    }

    const supabase = createClient()
    if (!supabase) return { success: false, message: 'Supabase not configured' }

    // Get current bot config
    const { data: config, error: fetchError } = await supabase
      .from('bot_config')
      .select('*')
      .single()

    if (fetchError) {
      return { success: false, message: 'Failed to fetch bot config' }
    }

    // Update watchlist
    const { error: updateError } = await supabase
      .from('bot_config')
      .update({
        watchlist: symbols,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id)

    if (updateError) {
      return { success: false, message: 'Failed to update watchlist' }
    }

    return {
      success: true,
      message: `Watchlist synced with ${symbols.length} symbols: ${symbols.slice(0, 5).join(', ')}${symbols.length > 5 ? '...' : ''}`,
    }
  } catch (error) {
    console.error('[v0] Watchlist sync error:', error)
    return { success: false, message: 'Error syncing watchlist' }
  }
}

/**
 * Export current bot watchlist as CSV
 */
export async function exportBotWatchlist(): Promise<string> {
  try {
    const supabase = createClient()
    if (!supabase) return ''

    const { data: config, error } = await supabase
      .from('bot_config')
      .select('watchlist')
      .single()

    if (error || !config?.watchlist) {
      throw new Error('Failed to fetch watchlist')
    }

    // Return as comma-separated for easy copy/paste
    return config.watchlist.join('\n')
  } catch (error) {
    console.error('[v0] Export watchlist error:', error)
    return ''
  }
}

/**
 * Get TradingView export instructions
 */
export function getTradingViewInstructions(): string {
  return `
1. Go to TradingView.com and log in
2. Open any watchlist
3. Right-click on the watchlist name → "Export as CSV"
4. Copy the content (or paste symbols separated by commas/newlines)
5. Paste into the watchlist import box below
6. Click "Sync with Bot"
  `.trim()
}
