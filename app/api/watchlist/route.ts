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

const watchlistResponseSchema = z.object({
  scanner_summary: z.object({
    market_bias: z.string(),
    best_opportunity: z.string(),
    risk_level: z.string(),
    notes: z.string(),
  }),
  signals: z.array(tradingSignalSchema),
})

const systemPrompt = `You are an elite AI trading signal generator for a paper trading platform.

Your job is to analyze a watchlist of stocks and return the BEST 3-10 trading signals ranked by quality.

CRITICAL RULES:
1. This is for paper trading only — educational purposes.
2. Return ONLY high-quality signals that meet these criteria:
   - action !== "NO TRADE"
   - risk_reward >= 2.0
   - confidence >= 0.6
3. Include NO TRADE signals ONLY when they explain why a popular ticker was rejected (max 1).
4. Rank by risk_reward * confidence (quality score) in descending order.
5. Do NOT hallucinate data. Use only provided market data.
6. Be conservative. Skip low-conviction trades.
7. Provide a market_bias assessment (bullish, bearish, mixed).
8. Identify the single best opportunity.
9. Rate overall risk_level (low, medium, high).
10. Return 3-10 signals maximum.`

function formatTickerData(ticker: any): string {
  return `
Ticker: ${ticker.ticker}
Current Price: $${ticker.current_price}
RSI (14): ${ticker.rsi_14}
EMA (9): ${ticker.ema_9}
EMA (21): ${ticker.ema_21}
EMA (50): ${ticker.ema_50}
VWAP: ${ticker.vwap}
ATR (14): ${ticker.atr_14}
Volume: ${ticker.volume}
Avg Volume (20): ${ticker.avg_volume_20}
Trend: ${ticker.trend}
Above VWAP: ${ticker.above_vwap}
Support Levels: ${ticker.support.join(', ')}
Resistance Levels: ${ticker.resistance.join(', ')}
`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tickers } = body

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return Response.json(
        { error: 'Tickers array is required and must not be empty' },
        { status: 400 }
      )
    }

    const marketDataString = tickers
      .map((ticker: any) => formatTickerData(ticker))
      .join('\n---\n')

    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: watchlistResponseSchema,
      }),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this watchlist and generate ranked trading signals:\n\n${marketDataString}\n\nReturn the best 3-10 signals. Only include signals with risk_reward >= 2.0 and confidence >= 0.6. Include NO TRADE only if it helps explain a rejection.`,
        },
      ],
    })

    // Filter for high-quality signals meeting risk engine criteria
    const qualitySignals = output.signals.filter((signal: any) => {
      if (signal.action !== 'NO TRADE' && signal.risk_reward && signal.confidence) {
        return signal.risk_reward >= 2 && signal.confidence >= 0.6
      }
      // Allow one NO TRADE if it explains a rejection
      return signal.action === 'NO TRADE' && output.signals.length > 1
    })

    // Limit to 3-10 signals
    const result = qualitySignals.slice(0, 10)
    const tradableCount = result.filter((s: any) => s.action !== 'NO TRADE').length

    return Response.json({
      scanner_summary: output.scanner_summary,
      signals: result,
      total_analyzed: tickers.length,
      total_returned: result.length,
      tradable_signals: tradableCount,
      no_trade_signals: result.length - tradableCount,
    })
  } catch (error) {
    console.error('Watchlist analysis error:', error)
    return Response.json({ error: 'Failed to analyze watchlist' }, { status: 500 })
  }
}

    const marketDataString = watchlist
      .map(
        (stock: any) => `
Ticker: ${stock.ticker}
Current Price: $${stock.price || 'N/A'}
Open: $${stock.open || 'N/A'}
High: $${stock.high || 'N/A'}
Low: $${stock.low || 'N/A'}
Change: ${stock.change || 'N/A'}%
Volume: ${stock.volume || 'N/A'}
Market Cap: ${stock.marketCap || 'N/A'}
PE Ratio: ${stock.peRatio || 'N/A'}
`
      )
      .join('\n---\n')

    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: watchlistResponseSchema,
      }),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this watchlist and generate ranked trading signals:\n\n${marketDataString}\n\nReturn the best 3-10 signals that meet the quality criteria.`,
        },
      ],
    })

    // Filter signals: only include high-quality trades (BUY/SELL with good risk/reward and confidence)
    const filteredSignals = output.signals.filter((signal) => {
      if (
        signal.action !== 'NO TRADE' &&
        signal.risk_reward &&
        signal.risk_reward >= 2 &&
        signal.confidence >= 0.6
      ) {
        return true
      }
      // Include one NO TRADE to explain rejections if present
      if (signal.action === 'NO TRADE' && output.signals.length > 0) {
        return output.signals.filter((s) => s.action !== 'NO TRADE').length < 10
      }
      return false
    })

    // Ensure we return at least 3 and at most 10 signals
    const limitedSignals = filteredSignals.slice(0, 10)

    return Response.json({
      scanner_summary: output.scanner_summary,
      signals: limitedSignals,
      total_analyzed: watchlist.length,
      signals_returned: limitedSignals.length,
    })
  } catch (error) {
    console.error('Watchlist analysis error:', error)
    return Response.json(
      { error: 'Failed to analyze watchlist' },
      { status: 500 }
    )
  }
}
