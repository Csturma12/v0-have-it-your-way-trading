import { NextRequest, NextResponse } from 'next/server'

/**
 * Universal Flash Alpha (HFT Edge API) catch-all proxy.
 *
 * Frontend calls /api/fa/<any FA path>?<query> and we forward to
 * https://api.flashalpha.com/<path> with the server-side API key.
 *
 * Flash Alpha's surface is heavy on simulation + scanners (not
 * per-stock market data like UW), so this proxy is mainly used for:
 *   /api/fa/Underlying/list
 *   /api/fa/Underlying/ExpiryForUnderlying?underlying=NVDA
 *   /api/fa/api/EvSimulation?...
 *   /api/fa/api/Svi/calibrate    (POST)
 *   /api/fa/api/Scanner/getScanners
 *
 * Supports GET and POST since FA's simulation/scanner endpoints
 * require POST bodies.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FA_BASE = 'https://api.flashalpha.com'

async function forward(
  req: NextRequest,
  pathParts: string[],
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
) {
  const apiKey = process.env.FLASH_ALPHA_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'FLASH_ALPHA_API_KEY not set' },
      { status: 500 },
    )
  }

  const subPath = pathParts.join('/')
  const search = req.nextUrl.searchParams.toString()
  const upstream = `${FA_BASE}/${subPath}${search ? `?${search}` : ''}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  }

  const init: RequestInit = { method, headers, cache: 'no-store' }

  if (method !== 'GET' && method !== 'DELETE') {
    const ct = req.headers.get('content-type') || 'application/json'
    headers['Content-Type'] = ct
    // Pass body through verbatim
    init.body = await req.text()
  }

  try {
    const res = await fetch(upstream, init)
    const text = await res.text()
    let body: any
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = { raw: text }
    }
    return NextResponse.json(body, {
      status: res.status,
      headers: { 'x-fa-path': subPath, 'x-fa-status': String(res.status) },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Upstream fetch failed',
        path: subPath,
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    )
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return forward(req, path, 'GET')
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return forward(req, path, 'POST')
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return forward(req, path, 'PUT')
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return forward(req, path, 'DELETE')
}
