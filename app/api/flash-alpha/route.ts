import { NextRequest, NextResponse } from 'next/server'

/**
 * Greek exposure proxy — REPLACED Flash Alpha with Unusual Whales.
 *
 * Flash Alpha endpoints were unreachable. UW provides equivalent data:
 *   gex    -> /stock/{symbol}/greek-exposure (gamma exposure)
 *   dex    -> /stock/{symbol}/greek-exposure (delta exposure)
 *   levels -> /stock/{symbol}/spot-exposures (support/resistance levels)
 *
 * This route maintains backward compatibility with the old flash-alpha
 * query params so existing widgets don't break.
 */

const UW_BASE = 'https://api.unusualwhales.com/api'
const UW_KEY = process.env.UW_API_KEY

const VALID_ENDPOINTS = ['gex', 'dex', 'levels'] as const
type Endpoint = (typeof VALID_ENDPOINTS)[number]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get('symbol') || searchParams.get('ticker'))?.toUpperCase()
  const endpoint = searchParams.get('endpoint') as Endpoint | null

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }
  if (!endpoint || !VALID_ENDPOINTS.includes(endpoint)) {
    return NextResponse.json({ error: 'Invalid endpoint. Use: gex, dex, or levels' }, { status: 400 })
  }

  if (!UW_KEY) {
    return NextResponse.json({
      symbol,
      endpoint,
      data: null,
      source: 'uw',
      ok: false,
      reason: 'UW_API_KEY not configured',
    })
  }

  try {
    // Map old flash-alpha endpoints to UW equivalents
    let uwPath: string
    if (endpoint === 'gex' || endpoint === 'dex') {
      uwPath = `stock/${symbol}/greek-exposure`
    } else {
      // levels -> spot-exposures
      uwPath = `stock/${symbol}/spot-exposures`
    }

    const res = await fetch(`${UW_BASE}/${uwPath}`, {
      headers: {
        Authorization: `Bearer ${UW_KEY}`,
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json({
        symbol,
        endpoint,
        data: null,
        source: 'uw',
        ok: false,
        reason: `UW upstream ${res.status}`,
      })
    }

    const json = await res.json()
    const rawData = json.data || json

    // Transform UW response to match old flash-alpha shape for gex/dex
    let data: any
    if (endpoint === 'gex') {
      // Extract gamma exposure
      data = {
        gex: rawData,
        netGamma: rawData.net_gamma ?? rawData.netGamma ?? null,
        callGamma: rawData.call_gamma ?? rawData.callGamma ?? null,
        putGamma: rawData.put_gamma ?? rawData.putGamma ?? null,
      }
    } else if (endpoint === 'dex') {
      // Extract delta exposure
      data = {
        dex: rawData,
        netDelta: rawData.net_delta ?? rawData.netDelta ?? null,
        callDelta: rawData.call_delta ?? rawData.callDelta ?? null,
        putDelta: rawData.put_delta ?? rawData.putDelta ?? null,
      }
    } else {
      // levels -> spot-exposures already in good shape
      data = {
        levels: rawData,
        support: rawData.support_levels ?? rawData.support ?? [],
        resistance: rawData.resistance_levels ?? rawData.resistance ?? [],
      }
    }

    return NextResponse.json({
      symbol,
      endpoint,
      data,
      source: 'uw',
      ok: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({
      symbol,
      endpoint,
      data: null,
      source: 'uw',
      ok: false,
      reason: error?.message || 'fetch failed',
    })
  }
}
