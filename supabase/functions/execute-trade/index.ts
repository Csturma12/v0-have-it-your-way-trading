import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, tickerSymbol, action, quantity, limitPrice } = await req.json()

    if (!userId || !tickerSymbol || !action) {
      throw new Error('Missing required fields: userId, tickerSymbol, action')
    }

    // Create Supabase client with service role key (has admin access)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Get user's bot config
    const { data: botConfig, error: configError } = await supabase
      .from('bot_config')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (configError) throw new Error(`Bot config not found: ${configError.message}`)
    if (!botConfig) throw new Error('Bot config not found')
    if (!botConfig.is_active) throw new Error('Bot is not active')

    // Log the trade signal
    const { error: signalError } = await supabase
      .from('signal_log')
      .insert({
        user_id: userId,
        ticker: tickerSymbol,
        action: action, // 'BUY' or 'SELL'
        price: limitPrice,
        quantity: quantity,
        status: 'pending',
        source: 'edge_function',
      })

    if (signalError) throw new Error(`Failed to log signal: ${signalError.message}`)

    // In a real implementation, you'd call your broker API here (Alpaca, etc)
    // For now, we'll simulate trade execution
    const { error: tradeError } = await supabase
      .from('trade_history')
      .insert({
        user_id: userId,
        ticker: tickerSymbol,
        action: action,
        quantity: quantity,
        entry_price: limitPrice,
        exit_price: null,
        status: 'open',
        pnl: null,
      })

    if (tradeError) throw new Error(`Failed to record trade: ${tradeError.message}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${action} order for ${quantity} shares of ${tickerSymbol} created`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Trade execution error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
