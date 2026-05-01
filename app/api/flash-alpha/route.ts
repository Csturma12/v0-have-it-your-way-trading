import { NextRequest, NextResponse } from 'next/server'

/**
 * Flash Alpha proxy.
 *
 * NOTE: We probed multiple candidate hosts/paths for Flash Alpha
 * (api.flashalpha.com, api.flashalpha.io, common /v1/exposure paths).
 * Only `/` and `/health` respond on api.flashalpha.com — every
 * exposure path returns 404 from the upstream. Until the correct
 * endpoint paths are documented to us, this route fails *gracefully*
 * with a 200 + null payload so dependent widgets don't crash.
 *
 * To re-enable, set FLASH_ALPHA_BASE_URL env var to the correct
 * host (e.g. https://api.flashalpha.com) and update the path
 * template below to whatever the real endpoint shape is.
 */

const FLASH_ALPHA_BASE = process.env.FLASH_ALPHA_BASE_URL || 'https://api.flashalpha.com'
const API_KEY = process.env.FLASH_ALPHA_API_KEY || process.env.FLASh_ALHPA_API_KEY

const VALID_ENDPOINTS = ['gex', 'dex', 'levels'] as const
type Endpoint = typeof VALID_ENDPOINTS[number]

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

  // No key -> graceful empty response so widgets don't break.
  if (!API_KEY) {
    return NextResponse.json({
      symbol,
      endpoint,
      data: null,
      source: 'flash_alpha',
      ok: false,
      reason: 'API key not configured',
    })
  }

  // Try the upstream; on any failure return graceful 200 with empty data.
  try {
    const url = `${FLASH_ALPHA_BASE}/v1/exposure/${endpoint}/${symbol}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return NextResponse.json({
        symbol,
        endpoint,
        data: null,
        source: 'flash_alpha',
        ok: false,
        reason: `Upstream ${response.status}`,
      })
    }

    const data = await response.json()
    return NextResponse.json({
      symbol,
      endpoint,
      data,
      source: 'flash_alpha',
      ok: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({
      symbol,
      endpoint,
      data: null,
      source: 'flash_alpha',
      ok: false,
      reason: error?.message || 'fetch failed',
    })
  }
}
