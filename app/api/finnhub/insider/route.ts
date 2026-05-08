import { NextRequest, NextResponse } from 'next/server'

/**
 * Finnhub Insider Transactions endpoint.
 * Used as fallback when UW is rate-limited or down.
 *
 * GET /api/finnhub/insider?symbol=AAPL
 */

const FINNHUB_KEY = process.env.FINNHUB_API_KEY

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  if (!FINNHUB_KEY) {
    return NextResponse.json(
      { error: 'FINNHUB_API_KEY not configured' },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${symbol}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: `Finnhub returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    
    // Aggregate by month to match UW's shape
    const byMonth = new Map<string, { buys: number; sells: number; buyValue: number; sellValue: number }>()
    
    for (const tx of data.data || []) {
      const date = tx.transactionDate || ''
      const month = date.slice(0, 7) // YYYY-MM
      if (!month) continue
      
      if (!byMonth.has(month)) {
        byMonth.set(month, { buys: 0, sells: 0, buyValue: 0, sellValue: 0 })
      }
      
      const entry = byMonth.get(month)!
      const shares = Math.abs(tx.share || 0)
      const value = shares * (tx.transactionPrice || 0)
      
      // Positive change = buy, negative = sell (simplified)
      if (tx.change > 0 || tx.transactionCode === 'P') {
        entry.buys += 1
        entry.buyValue += value
      } else if (tx.change < 0 || tx.transactionCode === 'S') {
        entry.sells += 1
        entry.sellValue += value
      }
    }
    
    // Convert to array sorted by month desc
    const aggregated = [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, stats]) => ({
        date: month,
        month,
        purchases: stats.buys,
        sales: stats.sells,
        purchases_value: stats.buyValue,
        sales_value: stats.sellValue,
      }))

    return NextResponse.json({
      data: aggregated,
      source: 'finnhub',
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error('[Finnhub Insider] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch insider transactions' },
      { status: 500 }
    )
  }
}
