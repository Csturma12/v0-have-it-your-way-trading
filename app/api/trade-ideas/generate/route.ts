import { NextRequest, NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const TradeIdeaSchema = z.object({
  ticker: z.string(),
  company: z.string(),
  action: z.enum(['buy', 'sell', 'hold']),
  currentPrice: z.number(),
  priceTarget: z.number(),
  stopLoss: z.number(),
  confidence: z.number().min(0).max(100),
  timeframe: z.enum(['day', 'swing', 'position', 'longterm']),
  category: z.enum(['momentum', 'value', 'growth', 'technical', 'event']),
  risk: z.enum(['low', 'medium', 'high']),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  thesis: z.string(),
  keyPoints: z.array(z.string()),
  technicalSignals: z.array(z.object({
    indicator: z.string(),
    signal: z.string(),
    strength: z.enum(['weak', 'moderate', 'strong'])
  })),
  catalysts: z.array(z.string()),
  risks: z.array(z.string())
})

export async function POST(request: NextRequest) {
  try {
    const { ticker, provider = 'claude' } = await request.json()

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
    }

    // Fetch current price from your existing API
    let currentPrice = 100
    try {
      const priceResponse = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${process.env.POLYGON_API_KEY}`
      )
      if (priceResponse.ok) {
        const priceData = await priceResponse.json()
        currentPrice = priceData.results?.[0]?.c || 100
      }
    } catch {
      // Use fallback price
    }

    const model = provider === 'openai' 
      ? 'openai/gpt-5-mini' 
      : 'anthropic/claude-opus-4.6'

    const result = await generateText({
      model,
      output: Output.object({ schema: TradeIdeaSchema }),
      prompt: `You are an expert stock analyst. Generate a detailed trade idea for ${ticker}.

Current market price is approximately $${currentPrice.toFixed(2)}.

Analyze:
1. Technical indicators (RSI, MACD, Bollinger Bands, moving averages)
2. Recent price action and volume patterns
3. Fundamental catalysts (earnings, news, sector trends)
4. Risk/reward profile

Provide a comprehensive trade idea with specific price targets, stop loss levels, and confidence score.

Return your analysis as a structured trade idea with:
- Action (buy/sell/hold)
- Price target and stop loss
- Confidence score (0-100)
- Timeframe (day/swing/position/longterm)
- Category (momentum/value/growth/technical/event)
- Risk level (low/medium/high)
- Detailed thesis
- Key points
- Technical signals with strength
- Catalysts
- Risks

Be specific with numbers and realistic with your analysis.`
    })

    const idea = result.output

    return NextResponse.json({
      success: true,
      idea: {
        id: `${provider}-${ticker}-${Date.now()}`,
        ...idea,
        provider,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[v0] Trade idea generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate trade idea', details: String(error) },
      { status: 500 }
    )
  }
}
