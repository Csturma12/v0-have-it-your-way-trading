import { NextResponse } from 'next/server'

// Aggregate risk data from Finnhub (sentiment, insider trading) and Polygon (short interest)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Accept both `symbol` and `ticker` as aliases.
  const symbol = (searchParams.get('symbol') || searchParams.get('ticker'))?.toUpperCase()

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol/ticker required' }, { status: 400 })
  }

  const finnhubKey = process.env.FINNHUB_API_KEY
  const polygonKey = process.env.POLYGON_API_KEY

  let sentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral'
  let sentimentScore = 0
  let riskLevel: 'low' | 'medium' | 'high' = 'medium'
  let shortInterest = 0
  let insiderBuying = 0
  let insiderSelling = 0
  let institutionalOwnership = 0
  const warnings: string[] = []

  try {
    // 1. Finnhub Social Sentiment
    if (finnhubKey) {
      const sentimentRes = await fetch(
        `https://finnhub.io/api/v1/stock/social-sentiment?symbol=${symbol}&token=${finnhubKey}`,
        { next: { revalidate: 1800 } }
      )
      if (sentimentRes.ok) {
        const data = await sentimentRes.json()
        if (data.reddit?.length || data.twitter?.length) {
          const redditScore = data.reddit?.[0]?.score || 0
          const twitterScore = data.twitter?.[0]?.score || 0
          sentimentScore = (redditScore + twitterScore) / 2
          if (sentimentScore > 0.3) sentiment = 'bullish'
          else if (sentimentScore < -0.3) sentiment = 'bearish'
        }
      }
    }

    // 2. Finnhub Insider Transactions
    if (finnhubKey) {
      const insiderRes = await fetch(
        `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${symbol}&token=${finnhubKey}`,
        { next: { revalidate: 3600 } }
      )
      if (insiderRes.ok) {
        const data = await insiderRes.json()
        if (data.data) {
          const recent = data.data.slice(0, 20)
          for (const t of recent) {
            if (t.transactionType === 'P' || t.transactionType === 'A') {
              insiderBuying++
            } else if (t.transactionType === 'S' || t.transactionType === 'D') {
              insiderSelling++
            }
          }
          if (insiderSelling > insiderBuying * 2) {
            warnings.push('High insider selling activity')
          }
        }
      }
    }

    // 3. Finnhub Ownership Data
    if (finnhubKey) {
      const ownershipRes = await fetch(
        `https://finnhub.io/api/v1/stock/ownership?symbol=${symbol}&token=${finnhubKey}`,
        { next: { revalidate: 86400 } }
      )
      if (ownershipRes.ok) {
        const data = await ownershipRes.json()
        if (data.ownership?.length) {
          const total = data.ownership.reduce((sum: number, o: any) => sum + (o.share || 0), 0)
          institutionalOwnership = Math.min(total * 100, 100)
        }
      }
    }

    // 4. Polygon Short Interest (if available)
    // Note: Short interest data requires specific Polygon subscription
    // For now, we'll estimate based on other signals

    // Calculate risk level based on collected data
    let riskScore = 0
    if (insiderSelling > insiderBuying) riskScore += 1
    if (sentiment === 'bearish') riskScore += 1
    if (shortInterest > 15) riskScore += 1
    if (institutionalOwnership < 20) riskScore += 0.5

    if (riskScore >= 2) riskLevel = 'high'
    else if (riskScore >= 1) riskLevel = 'medium'
    else riskLevel = 'low'

    // Add warnings based on data
    if (sentiment === 'bearish') {
      warnings.push('Negative social sentiment')
    }
    if (shortInterest > 20) {
      warnings.push('High short interest (squeeze risk)')
    }

    return NextResponse.json({
      sentiment,
      sentimentScore,
      riskLevel,
      shortInterest,
      insiderBuying,
      insiderSelling,
      institutionalOwnership,
      warnings,
    })
  } catch (err) {
    console.error('[Risk API] Error:', err)
    return NextResponse.json({
      sentiment: 'neutral',
      sentimentScore: 0,
      riskLevel: 'medium',
      shortInterest: 0,
      insiderBuying: 0,
      insiderSelling: 0,
      institutionalOwnership: 0,
      warnings: [],
      error: 'Failed to fetch risk data',
    })
  }
}
