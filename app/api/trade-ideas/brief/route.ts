import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'

// Simple in-memory cache so we don't spam the AI on every render
const cache = new Map<string, { text: string; action: 'buy' | 'sell' | 'hold'; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')?.toUpperCase()

  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 })
  }

  // Return cached result if fresh
  const cached = cache.get(ticker)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ ticker, idea: cached.text, action: cached.action })
  }

  // Fetch live price from Polygon
  let price = 0
  let change = 0
  let volume = 0
  try {
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${process.env.POLYGON_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (res.ok) {
      const data = await res.json()
      const bar = data.results?.[0]
      if (bar) {
        price  = bar.c ?? 0
        change = bar.c && bar.o ? ((bar.c - bar.o) / bar.o) * 100 : 0
        volume = bar.v ?? 0
      }
    }
  } catch { /* use defaults */ }

  try {
    const { text } = await generateText({
      model: 'openai/gpt-5-mini',
      prompt: `You are a concise stock analyst. Generate a single brief trade idea for ${ticker}.
Price: $${price.toFixed(2)}, Daily change: ${change.toFixed(2)}%, Volume: ${volume.toLocaleString()}.
Rules:
- Respond with ONLY a JSON object, no markdown
- Format: {"action":"buy"|"sell"|"hold","idea":"<15 words max, specific reason>"}
- Be specific: use terms like breakout, support, oversold, momentum, resistance, earnings, accumulation
- Do NOT start with the ticker name
Example: {"action":"buy","idea":"Testing key support at 200-day MA, RSI oversold at 28"}`,
    })

    // Parse the JSON response
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned) as { action: 'buy' | 'sell' | 'hold'; idea: string }

    cache.set(ticker, { text: parsed.idea, action: parsed.action, ts: Date.now() })

    return NextResponse.json({ ticker, idea: parsed.idea, action: parsed.action })
  } catch (err) {
    console.error('[v0] Brief trade idea error:', err)
    // Fallback: derive a simple idea from price data
    const action = change > 0.5 ? 'buy' : change < -0.5 ? 'sell' : 'hold'
    const idea = action === 'buy'
      ? 'Positive momentum, watching for continuation'
      : action === 'sell'
      ? 'Downside pressure, monitor for reversal'
      : 'Consolidating, no clear directional bias'
    return NextResponse.json({ ticker, idea, action })
  }
}
