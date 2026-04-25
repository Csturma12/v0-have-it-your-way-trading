import { generateText, Output } from 'ai'
import { z } from 'zod'

const tradingSignalSchema = z.object({
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
  rank: z.number().nullable(),
})

const watchlistResponseSchema = z.object({
  signals: z.array(tradingSignalSchema),
  summary: z.string(),
})

const systemPrompt = `You are an AI trading signal generator for a paper trading platform.

Your job is to analyze a watchlist of stocks and return the BEST 3-10 ranked trading signals.

You MUST follow these rules:

- This is for paper trading only.
- Analyze ALL tickers in the watchlist.
- Only return signals that pass the quality filter:
  - action must be BUY or SELL (not NO TRADE)
  - risk_reward must be >= 2.0
  - confidence must be >= 0.6
- Rank signals by quality (best first) based on: confidence, risk/reward ratio, and setup clarity.
- Return between 3-10 signals. If fewer than 3 pass, include the best available.
- Include a NO TRADE signal ONLY when it helps explain why a popular/requested ticker was rejected.
- Do NOT hallucinate missing data.
- Be conservative — avoid low-quality trades.
- Assign a rank number (1 = best) to each signal.
- Provide a brief summary of the watchlist analysis.`

interface WatchlistItem {
  ticker: string
  price?: string
  open?: string
  high?: string
  low?: string
  change?: string
  volume?: string
}

export async function POST(req: Request) {
  try {
    const { watchlist } = await req.json() as { watchlist: WatchlistItem[] }

    if (!watchlist || !Array.isArray(watchlist) || watchlist.length === 0) {
      return Response.json({ error: 'Watchlist is required' }, { status: 400 })
    }

    const watchlistJson = JSON.stringify(
      watchlist.map((item) => ({
        ticker: item.ticker,
        price: item.price || 'N/A',
        open: item.open || 'N/A',
        high: item.high || 'N/A',
        low: item.low || 'N/A',
        change: item.change || 'N/A',
        volume: item.volume || 'N/A',
      })),
      null,
      2
    )

    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: watchlistResponseSchema,
      }),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this watchlist and generate ranked paper-trading signals.
Only return the best 3 to 10 signals.
Include NO TRADE only when it helps explain why a popular ticker was rejected.

Watchlist data:
${watchlistJson}`,
        },
      ],
    })

    return Response.json({ 
      signals: output?.signals || [], 
      summary: output?.summary || '' 
    })
  } catch (error) {
    console.error('Watchlist analysis error:', error)
    return Response.json({ error: 'Failed to analyze watchlist' }, { status: 500 })
  }
}
