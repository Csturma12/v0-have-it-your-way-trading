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
})

const systemPrompt = `You are an AI trading signal generator for a paper trading platform.

Your job is to analyze structured market data and return a single high-quality trading signal.

You MUST follow these rules:

- This is for paper trading only.
- Do NOT give general advice or explanations outside JSON.
- Only generate a trade if there is a clear, high-quality setup.
- Minimum risk/reward must be 2.0.
- Confidence must be between 0 and 1.
- If no strong setup exists, return a NO_TRADE signal.
- Do NOT hallucinate missing data.
- Be conservative — avoid low-quality trades.`

export async function POST(req: Request) {
  try {
    const { ticker, price, volume, change, high, low, open } = await req.json()

    if (!ticker) {
      return Response.json({ error: 'Ticker symbol is required' }, { status: 400 })
    }

    const marketData = `
Ticker: ${ticker}
Current Price: $${price || 'N/A'}
Open: $${open || 'N/A'}
High: $${high || 'N/A'}
Low: $${low || 'N/A'}
Change: ${change || 'N/A'}%
Volume: ${volume || 'N/A'}
`

    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: tradingSignalSchema,
      }),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze the following market data and generate a trading signal:\n${marketData}`,
        },
      ],
    })

    return Response.json({ signal: output })
  } catch (error) {
    console.error('Analysis error:', error)
    return Response.json({ error: 'Failed to analyze market data' }, { status: 500 })
  }
}
