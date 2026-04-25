import { generateText, Output } from 'ai'
import { z } from 'zod'

// ── Output schema aligned with example output format ─────────────────────────
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

// ── Backend validation — mirrors the frontend filter exactly ─────────────────
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

const systemPrompt = `You are an AI trading signal generator for a paper trading platform.

Your job is to analyze a watchlist of stocks with full technical indicator data and return the BEST 3-10 ranked trading signals.

You MUST follow these strict rules:

SIGNAL QUALITY FILTERS (enforce these before returning):
- action must be BUY or SELL (not NO TRADE)
- confidence must be >= 0.65
- risk_reward must be >= 2.0
- entry, stop, and target must all be set
- For BUY: stop must be below entry, target must be above entry
- For SELL: stop must be above entry, target must be below entry

BEHAVIOR:
- Analyze ALL tickers in the watchlist using the provided technical indicators (RSI, EMA, VWAP, ATR, volume ratio, trend, support/resistance, etc.)
- Rank signals 1 to N (1 = best) based on: confidence, risk/reward, setup clarity, and technical alignment
- Return between 3 and 10 signals. If fewer than 3 pass the filters, include the next best available even if borderline.
- Include a NO TRADE signal ONLY when it helps explain why a popular or notable ticker was rejected. Set entry/stop/target/risk_reward to null for NO TRADE.
- Set risk_notes to an array of caution strings (e.g. "Extended move; avoid chasing above planned entry.") or an empty array.
- Do NOT hallucinate missing data. Use only what is provided.
- Be conservative — avoid low-quality, low-conviction trades.

OUTPUT:
- Return a scanner_summary with market_bias, best_opportunity, risk_level (low/medium/high), and brief notes.
- Return signals array ranked 1 to N.`

// ── Input types matching example input schema ─────────────────────────────────
interface TickerData {
  ticker: string
  current_price: number
  rsi_14?: number
  ema_9?: number
  ema_21?: number
  ema_50?: number
  vwap?: number
  atr_14?: number
  volume?: number
  avg_volume_20?: number
  trend?: string
  above_vwap?: boolean
  support?: number[]
  resistance?: number[]
}

interface AccountContext {
  paper_trading?: boolean
  buying_power?: number
  max_risk_per_trade_pct?: number
  max_position_value?: number
}

interface WatchlistPayload {
  timeframe?: string
  market_session?: string
  account_context?: AccountContext
  tickers: TickerData[]
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as WatchlistPayload

    // Accept both direct payload and legacy { watchlist } wrapper
    const tickers = body.tickers ?? (body as { watchlist?: TickerData[] }).watchlist
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return Response.json({ error: 'Tickers array is required' }, { status: 400 })
    }

    const payload: WatchlistPayload = {
      timeframe: body.timeframe ?? '15m',
      market_session: body.market_session ?? 'regular',
      account_context: body.account_context ?? { paper_trading: true },
      tickers,
    }

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
${JSON.stringify(payload, null, 2)}`,
        },
      ],
    })

    if (!output) {
      return Response.json({ error: 'No output from model' }, { status: 500 })
    }

    // Server-side validation pass — filter out any signals that fail validation
    const validated = output.signals.filter(validateSignal)

    // Keep NO TRADE signals (they pass validateSignal) and qualifying signals
    // Ensure we have at least 3 results; if not, fall back to full list
    const finalSignals = validated.length >= 3
      ? validated
      : output.signals.slice(0, Math.max(validated.length, 3))

    return Response.json({
      scanner_summary: output.scanner_summary,
      signals: finalSignals,
    })
  } catch (error) {
    console.error('[analyze-watchlist] error:', error)
    return Response.json({ error: 'Failed to analyze watchlist' }, { status: 500 })
  }
}
