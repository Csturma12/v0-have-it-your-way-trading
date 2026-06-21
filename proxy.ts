import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GLOBAL API PAUSE / KILL SWITCH — HARD LOCKED
 * ------------------------------------------------------------------
 * This is intentionally a hard-coded constant with NO env override.
 * While `true`, every request to `/api/*` is short-circuited and
 * returns 503 before any route handler runs — so NO external API
 * calls (Alpaca, Finnhub, Polygon, OpenAI, Supabase, etc.) can fire.
 *
 * There is deliberately no env-var escape hatch so it can't be
 * flipped accidentally. Nothing is deleted. To resume, set this to
 * `false` (a deliberate code change).
 */
const API_PAUSED = true

export async function proxy(request: NextRequest) {
  // Kill switch: block all API traffic while paused
  if (request.nextUrl.pathname.startsWith('/api/') && API_PAUSED) {
    return NextResponse.json(
      {
        error: 'paused',
        message: 'API calls are paused for this project. Set API_PAUSED to false (or flip the flag in proxy.ts) to resume.',
      },
      { status: 503, headers: { 'x-api-paused': '1' } },
    )
  }

  // Skip auth middleware if Supabase env vars are not set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL2
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY2
  if (!supabaseUrl || !supabaseKey) {
    return
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
