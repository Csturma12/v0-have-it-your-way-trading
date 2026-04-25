import { generateText, Output } from 'ai'
import { z } from 'zod'

// ── Schema aligned with example output ───────────────────────────────────────
const tradingSignalSchema = z.object({
  rank: z.number(),
  ticker: z.string(),
  action: z.enum(['BUY', 'SELL', 'NO TRADE']),
  setup: z.enum(['BREAKOUT', 'PULLBACK', 'REVERSAL', 'MOMENTUM', 'NO SETUP']),
  confidence: z.number().min(0).max(1),
  entry: z.number().nullable(),
  stop: z.number().nullable(),
  target: z.number().nullable(),
  risk_reward: z.number().nullable(),
  reason: z.string(),
  invalid_if: z.string(),
  risk_notes: z.array(z.string()).nullable(),
})

const watchlistResponseSchema = z.object({
  scanner_summary: z.object({
    market_bias: z.string(),
    best_opportunity: z.string(),
    risk_level: z.enum(['low', 'medium', 'high']),
    notes: z.string(),
  }),
  signals: z.array(tradingSignalSchema),
})

// ── Backend validation — single source of truth ───────────────────────────────
function validateSignal(signal: z.infer<typeof tradingSignalSchema>): boolean {
  if (!['BUY', 'SELL', 'NO TRADE'].includes(signal.action)) return false
  if (signal.action === 'NO TRADE') return true
  if (signal.confidence < 0.65) return false
  if (!signal.risk_reward || signal.risk_reward < 2) return false
  if (!signal.entry || !signal.stop || !signal.target) return false
  if (signal.action === 'BUY') {
    if (signal.stop >= signal.entry) return false
    if (signal.target <= signal.entry) return false
  }
  if (signal.action === 'SELL') {
    if (signal.stop <= signal.entry) return false
    if (signal.target >= signal.entry) return false
  }
  return true
}

const systemPrompt = `You are an elite AI trading signal generator for a paper trading platform.

Your job is to analyze a watchlist of stocks and return the BEST 3-10 trading signals ranked by quality.

SIGNAL QUALITY FILTERS (enforce strictly before returning):
- action must be BUY or SELL
- confidence >= 0.65
- risk_reward >= 2.0
- entry, stop, and target must all be set
- For BUY: stop below entry, target above entry
- For SELL: stop above entry, target below entry

BEHAVIOR:
- Analyze ALL tickers using the provided technical indicators
- Rank signals 1 to N (1 = best) by confidence, risk/reward, and setup clarity
- Include NO TRADE ONLY when it explains rejection of a popular/notable ticker; set entry/stop/target/risk_reward to null
- Set risk_notes to an array of caution strings, or empty array
- Do NOT hallucinate data
- Be conservative — skip low-conviction trades

OUTPUT:
- Return scanner_summary with market_bias, best_opportunity, risk_level (low/medium/high), and notes
- Return signals array ranked 1 to N`

function formatTicker(ticker: Record<string, unknown>): string {
  return `
Ticker: ${ticker.ticker}
Current Price: $${ticker.current_price}
RSI (14): ${ticker.rsi_14 ?? 'N/A'}
EMA (9): ${ticker.ema_9 ?? 'N/A'}
EMA (21): ${ticker.ema_21 ?? 'N/A'}
EMA (50): ${ticker.ema_50 ?? 'N/A'}
VWAP: ${ticker.vwap ?? 'N/A'}
ATR (14): ${ticker.atr_14 ?? 'N/A'}
Volume: ${ticker.volume ?? 'N/A'}
Avg Volume (20): ${ticker.avg_volume_20 ?? 'N/A'}
Trend: ${ticker.trend ?? 'N/A'}
Above VWAP: ${ticker.above_vwap ?? 'N/A'}
Support: ${Array.isArray(ticker.support) ? (ticker.support as number[]).join(', ') : 'N/A'}
Resistance: ${Array.isArray(ticker.resistance) ? (ticker.resistance as number[]).join(', ') : 'N/A'}
`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Accept both { tickers: [...] } and full payload { timeframe, tickers, ... }
    const tickers: Record<string, unknown>[] = body.tickers ?? body.watchlist
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return Response.json(
        { error: 'Tickers array is required and must not be empty' },
        { status: 400 }
      )
    }

    const marketDataString = tickers.map(formatTicker).join('\n---\n')

    const { output } = await generateText({
      model: 'openai/gpt-4o',
      output: Output.object({ schema: watchlistResponseSchema }),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this watchlist and generate ranked paper-trading signals.
Only return the best 3 to 10 signals.
Include NO TRADE only when it helps explain why a popular ticker was rejected.
Watchlist data:
${marketDataString}`,
        },
      ],
    })

    if (!output) {
      return Response.json({ error: 'No output from model' }, { status: 500 })
    }

    // Server-side validation pass
    const validated = output.signals.filter(validateSignal)
    const finalSignals = validated.length >= 3
      ? validated
      : output.signals.slice(0, Math.max(validated.length, 3))

    const tradableCount = finalSignals.filter((s) => s.action !== 'NO TRADE').length

    return Response.json({
      scanner_summary: output.scanner_summary,
      signals: finalSignals,
      total_analyzed: tickers.length,
      total_returned: finalSignals.length,
      tradable_signals: tradableCount,
      no_trade_signals: finalSignals.length - tradableCount,
    })
  } catch (error) {
    console.error('[watchlist] error:', error)
    return Response.json({ error: 'Failed to analyze watchlist' }, { status: 500 })
  }
}
