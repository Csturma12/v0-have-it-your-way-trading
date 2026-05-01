import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface CompareTickerData {
  ticker: string
  ok: boolean
  error?: string
  quote: any | null
  fundamentals: any | null
  profile: any | null
  bars: Array<{ time: string | number; close: number }> | null
}

/**
 * Compare API — fans out 4 parallel calls per ticker (quote, fundamentals,
 * profile, 1Y daily bars) using Promise.allSettled so one bad ticker
 * doesn't kill the whole comparison. Returns per-ticker { ok, error, ...data }.
 *
 * Strict API pulls: no demo/mock data. Failed lookups return { ok: false, error }.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tickersParam = searchParams.get('tickers') || ''
    const range = searchParams.get('range') || '1Y' // 1M | 3M | 6M | 1Y | 5Y

    const tickers = tickersParam
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 4) // cap at 4

    if (tickers.length === 0) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
    }

    const origin = new URL(request.url).origin

    const fetchOne = async (ticker: string): Promise<CompareTickerData> => {
      const [quoteRes, fundRes, profRes, barsRes] = await Promise.allSettled([
        fetch(`${origin}/api/polygon/quote?ticker=${ticker}`,        { cache: 'no-store' }),
        fetch(`${origin}/api/polygon/fundamentals?ticker=${ticker}`, { cache: 'no-store' }),
        fetch(`${origin}/api/polygon/profile?ticker=${ticker}`,      { cache: 'no-store' }),
        fetch(`${origin}/api/polygon/bars?ticker=${ticker}&range=${range}`, { cache: 'no-store' }),
      ])

      const safeJson = async (r: PromiseSettledResult<Response>) => {
        if (r.status !== 'fulfilled') return null
        if (!r.value.ok) return null
        try { return await r.value.json() } catch { return null }
      }

      const quoteJson = await safeJson(quoteRes)
      const fundJson  = await safeJson(fundRes)
      const profJson  = await safeJson(profRes)
      const barsJson  = await safeJson(barsRes)

      const quote = quoteJson?.quote ?? null
      const ok = !!quote

      // Slim bars to {time, close} for the multi-line chart
      const bars = barsJson?.bars
        ? barsJson.bars.map((b: any) => ({ time: b.time, close: b.close }))
        : null

      return {
        ticker,
        ok,
        error: ok ? undefined : (quoteJson?.error || quoteJson?.message || 'No data'),
        quote,
        fundamentals: fundJson?.fundamentals ?? null,
        profile: profJson?.profile ?? null,
        bars,
      }
    }

    const results = await Promise.all(tickers.map(fetchOne))

    return NextResponse.json({
      tickers,
      range,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Compare API failed' },
      { status: 500 }
    )
  }
}
