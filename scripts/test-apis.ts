/**
 * API Provider Test Script
 * 
 * Tests all 4 providers: Tradier, UW, Finnhub, Polygon
 * Run with: node --env-file-if-exists=/vercel/share/.env.project scripts/test-apis.ts
 */

const TRADIER_KEY = process.env.TRADIER_API_KEY
const UW_KEY = process.env.UNUSUAL_WHALES_API_KEY
const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const POLYGON_KEY = process.env.POLYGON_API_KEY

interface TestResult {
  provider: string
  endpoint: string
  status: 'pass' | 'fail' | 'skip'
  latency?: number
  error?: string
  sample?: any
}

const results: TestResult[] = []

async function testEndpoint(
  provider: string,
  endpoint: string,
  url: string,
  headers: Record<string, string> = {}
): Promise<TestResult> {
  const start = Date.now()
  try {
    const res = await fetch(url, { headers })
    const latency = Date.now() - start

    if (!res.ok) {
      return {
        provider,
        endpoint,
        status: 'fail',
        latency,
        error: `HTTP ${res.status} ${res.statusText}`,
      }
    }

    const data = await res.json()
    return {
      provider,
      endpoint,
      status: 'pass',
      latency,
      sample: JSON.stringify(data).slice(0, 200) + '...',
    }
  } catch (err: any) {
    return {
      provider,
      endpoint,
      status: 'fail',
      latency: Date.now() - start,
      error: err.message,
    }
  }
}

async function main() {
  console.log('\n=== API Provider Tests ===\n')
  console.log('Environment check:')
  console.log(`  TRADIER_API_KEY: ${TRADIER_KEY ? '✓ set' : '✗ missing'}`)
  console.log(`  UW_API_KEY: ${UW_KEY ? '✓ set' : '✗ missing'}`)
  console.log(`  FINNHUB_API_KEY: ${FINNHUB_KEY ? '✓ set' : '✗ missing'}`)
  console.log(`  POLYGON_API_KEY: ${POLYGON_KEY ? '✓ set' : '✗ missing'}`)
  console.log('')

  // Test Tradier
  if (TRADIER_KEY) {
    const baseUrl = process.env.TRADIER_ENV === 'sandbox'
      ? 'https://sandbox.tradier.com'
      : 'https://api.tradier.com'

    results.push(
      await testEndpoint(
        'Tradier',
        'quotes',
        `${baseUrl}/v1/markets/quotes?symbols=AAPL`,
        { Authorization: `Bearer ${TRADIER_KEY}`, Accept: 'application/json' }
      )
    )

    results.push(
      await testEndpoint(
        'Tradier',
        'options/expirations',
        `${baseUrl}/v1/markets/options/expirations?symbol=AAPL`,
        { Authorization: `Bearer ${TRADIER_KEY}`, Accept: 'application/json' }
      )
    )
  } else {
    results.push({ provider: 'Tradier', endpoint: 'quotes', status: 'skip', error: 'No API key' })
  }

  // Test UW
  if (UW_KEY) {
    results.push(
      await testEndpoint(
        'UW',
        'flow-alerts',
        'https://api.unusualwhales.com/api/option-trades/flow-alerts',
        { Authorization: `Bearer ${UW_KEY}`, Accept: 'application/json' }
      )
    )

    results.push(
      await testEndpoint(
        'UW',
        'stock/AAPL/greek-exposure',
        'https://api.unusualwhales.com/api/stock/AAPL/greek-exposure',
        { Authorization: `Bearer ${UW_KEY}`, Accept: 'application/json' }
      )
    )

    results.push(
      await testEndpoint(
        'UW',
        'darkpool/recent',
        'https://api.unusualwhales.com/api/darkpool/recent',
        { Authorization: `Bearer ${UW_KEY}`, Accept: 'application/json' }
      )
    )

    results.push(
      await testEndpoint(
        'UW',
        'market/market-tide',
        'https://api.unusualwhales.com/api/market/market-tide',
        { Authorization: `Bearer ${UW_KEY}`, Accept: 'application/json' }
      )
    )
  } else {
    results.push({ provider: 'UW', endpoint: 'flow-alerts', status: 'skip', error: 'No API key' })
  }

  // Test Finnhub
  if (FINNHUB_KEY) {
    results.push(
      await testEndpoint(
        'Finnhub',
        'quote',
        `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${FINNHUB_KEY}`
      )
    )

    results.push(
      await testEndpoint(
        'Finnhub',
        'company-profile',
        `https://finnhub.io/api/v1/stock/profile2?symbol=AAPL&token=${FINNHUB_KEY}`
      )
    )

    results.push(
      await testEndpoint(
        'Finnhub',
        'company-news',
        `https://finnhub.io/api/v1/company-news?symbol=AAPL&from=2024-01-01&to=2024-12-31&token=${FINNHUB_KEY}`
      )
    )
  } else {
    results.push({ provider: 'Finnhub', endpoint: 'quote', status: 'skip', error: 'No API key' })
  }

  // Test Polygon
  if (POLYGON_KEY) {
    results.push(
      await testEndpoint(
        'Polygon',
        'prev-close',
        `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${POLYGON_KEY}`
      )
    )

    results.push(
      await testEndpoint(
        'Polygon',
        'ticker-details',
        `https://api.polygon.io/v3/reference/tickers/AAPL?apiKey=${POLYGON_KEY}`
      )
    )

    results.push(
      await testEndpoint(
        'Polygon',
        'daily-bars',
        `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2024-01-01/2024-01-31?apiKey=${POLYGON_KEY}`
      )
    )
  } else {
    results.push({ provider: 'Polygon', endpoint: 'prev-close', status: 'skip', error: 'No API key' })
  }

  // Print results
  console.log('\n=== Test Results ===\n')

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.provider]) acc[r.provider] = []
    acc[r.provider].push(r)
    return acc
  }, {} as Record<string, TestResult[]>)

  for (const [provider, tests] of Object.entries(grouped)) {
    const passed = tests.filter(t => t.status === 'pass').length
    const failed = tests.filter(t => t.status === 'fail').length
    const skipped = tests.filter(t => t.status === 'skip').length

    console.log(`${provider}: ${passed} passed, ${failed} failed, ${skipped} skipped`)

    for (const t of tests) {
      const icon = t.status === 'pass' ? '✓' : t.status === 'fail' ? '✗' : '○'
      const latencyStr = t.latency ? ` (${t.latency}ms)` : ''
      const errorStr = t.error ? ` - ${t.error}` : ''
      console.log(`  ${icon} ${t.endpoint}${latencyStr}${errorStr}`)
    }
    console.log('')
  }

  // Summary
  const totalPassed = results.filter(r => r.status === 'pass').length
  const totalFailed = results.filter(r => r.status === 'fail').length
  const totalSkipped = results.filter(r => r.status === 'skip').length

  console.log('=== Summary ===')
  console.log(`Total: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`)

  if (totalFailed > 0) {
    console.log('\nFailed tests:')
    for (const r of results.filter(r => r.status === 'fail')) {
      console.log(`  - ${r.provider}/${r.endpoint}: ${r.error}`)
    }
  }

  process.exit(totalFailed > 0 ? 1 : 0)
}

main()
