import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'

/**
 * AI-powered trade analysis using Claude (via Vercel AI Gateway).
 * Returns a concise bull/bear/neutral take + key levels for a ticker.
 *
 * POST /api/ai/trade-analysis
 *   body: { ticker: string, currentPrice?: number, change?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { ticker, currentPrice, change } = await req.json()

    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
    }

    const priceContext =
      currentPrice && change !== undefined
        ? `Current price: $${currentPrice.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}% today).`
        : ''

    const prompt = `You are a professional trading analyst. Provide a concise trade analysis for ${ticker.toUpperCase()}.
${priceContext}

Format your response in EXACTLY this structure (under 80 words total):

BIAS: [BULLISH/BEARISH/NEUTRAL] (1-3 words why)
SETUP: [the technical or fundamental setup in 1 short sentence]
LEVELS: Support $X / Resistance $Y
RISK: [the main risk in 5-10 words]

Be specific and actionable. No fluff. No disclaimers.`

    const { text } = await generateText({
      model: 'anthropic/claude-haiku-4.5',
      prompt,
      maxRetries: 1,
    })

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      analysis: text.trim(),
      timestamp: Date.now(),
    })
  } catch (err: any) {
    console.error('[AI trade-analysis] error:', err)
    return NextResponse.json(
      { error: err?.message || 'AI analysis failed' },
      { status: 500 },
    )
  }
}
